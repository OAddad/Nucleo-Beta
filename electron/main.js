/**
 * Núcleo - Electron Main Process
 * App desktop de gestão de CMV para restaurantes
 * 
 * REGRAS FUNDAMENTAIS (produção):
 * - ZERO .bat, ZERO navegador, ZERO localhost:3000
 * - BrowserWindow SEMPRE abre para http://127.0.0.1:<porta>
 * - Backend é SEMPRE o binário PyInstaller de resources/backend
 * - DB e logs SEMPRE em app.getPath("userData")
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, exec } = require('child_process');
const net = require('net');

// ==================== CONFIGURAÇÕES ====================
const APP_NAME = 'Núcleo';
const DEFAULT_PORT = 17845;
const HEALTH_CHECK_RETRIES = 60;
const HEALTH_CHECK_DELAY = 500;

// ==================== ESTADO GLOBAL ====================
let userDataPath = null;
let dbPath = null;
let logsPath = null;
let logFile = null;
let frontendPath = null;
let backendExePath = null;
let backendProcess = null;
let mainWindow = null;
let currentPort = DEFAULT_PORT;

// ==================== LOGGER ====================
function initPaths() {
  userDataPath = app.getPath('userData');
  logsPath = path.join(userDataPath, 'logs');
  dbPath = path.join(userDataPath, 'nucleo.db');
  
  // Criar diretório de logs
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  
  logFile = path.join(logsPath, 'nucleo.log');
  
  // Em produção, paths vêm de resources
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    frontendPath = path.join(resourcesPath, 'frontend');
    backendExePath = path.join(resourcesPath, 'backend', 'nucleo-backend.exe');
    
    // Fallback para Linux/Mac
    if (!fs.existsSync(backendExePath)) {
      backendExePath = path.join(resourcesPath, 'backend', 'nucleo-backend');
    }
  } else {
    // Desenvolvimento
    frontendPath = path.join(__dirname, '..', 'frontend', 'build');
    backendExePath = null; // Usar Python diretamente
  }
}

function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  if (logFile) {
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (e) {
      console.error('Erro ao escrever log:', e);
    }
  }
}

// ==================== PORTA ====================
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('Nenhuma porta disponível encontrada');
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
              pids.add(parts[parts.length - 1]);
            }
          });
          pids.forEach(pid => {
            if (pid && pid !== '0') {
              try { exec(`taskkill /F /PID ${pid}`, () => {}); } catch (e) {}
            }
          });
        }
        setTimeout(resolve, 1000);
      });
    } else {
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => {
        setTimeout(resolve, 1000);
      });
    }
  });
}

// ==================== HEALTH CHECK ====================
function checkBackendHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200, data: json });
        } catch (e) {
          resolve({ ok: false, data: null });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, data: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, data: null });
    });
  });
}

async function waitForBackend(port) {
  log('info', `Aguardando backend na porta ${port}...`);
  
  for (let i = 0; i < HEALTH_CHECK_RETRIES; i++) {
    const result = await checkBackendHealth(port);
    if (result.ok) {
      log('info', `Backend OK! DB: ${result.data?.database?.path || 'N/A'}`);
      
      // VALIDAÇÃO CRÍTICA: verificar se DB está no userData
      const dbPathFromBackend = result.data?.database?.path || '';
      if (app.isPackaged && !dbPathFromBackend.includes('AppData')) {
        log('warn', `ATENÇÃO: DB não está em AppData! Path: ${dbPathFromBackend}`);
      }
      
      return result;
    }
    await new Promise(r => setTimeout(r, HEALTH_CHECK_DELAY));
  }
  
  return { ok: false, data: null };
}

// ==================== BACKEND ====================
async function startBackend() {
  log('info', '='.repeat(50));
  log('info', 'INICIANDO BACKEND');
  log('info', `App empacotado: ${app.isPackaged}`);
  log('info', `UserData: ${userDataPath}`);
  log('info', `DB Path: ${dbPath}`);
  log('info', `Logs Path: ${logsPath}`);
  log('info', `Frontend Path: ${frontendPath}`);
  log('info', `Backend Exe: ${backendExePath || 'Python (dev)'}`);
  
  // Gerenciar porta
  if (!(await isPortAvailable(DEFAULT_PORT))) {
    log('warn', `Porta ${DEFAULT_PORT} em uso, liberando...`);
    await killProcessOnPort(DEFAULT_PORT);
    
    if (!(await isPortAvailable(DEFAULT_PORT))) {
      currentPort = await findAvailablePort(DEFAULT_PORT + 1);
      log('info', `Usando porta alternativa: ${currentPort}`);
    } else {
      currentPort = DEFAULT_PORT;
    }
  } else {
    currentPort = DEFAULT_PORT;
  }
  
  log('info', `Porta selecionada: ${currentPort}`);
  
  // Variáveis de ambiente OBRIGATÓRIAS
  const env = {
    ...process.env,
    NUCLEO_DATA_PATH: userDataPath,
    NUCLEO_DB_PATH: dbPath,
    NUCLEO_LOG_PATH: logFile,
    NUCLEO_LOGS_PATH: logsPath,
    NUCLEO_PORT: currentPort.toString(),
    NUCLEO_FRONTEND_PATH: frontendPath,
    PYTHONUNBUFFERED: '1'
  };
  
  return new Promise((resolve, reject) => {
    try {
      if (app.isPackaged) {
        // ========== PRODUÇÃO: usar executável PyInstaller ==========
        if (!fs.existsSync(backendExePath)) {
          const err = new Error(`Backend não encontrado: ${backendExePath}`);
          log('error', err.message);
          reject(err);
          return;
        }
        
        log('info', `Iniciando backend: ${backendExePath}`);
        
        backendProcess = spawn(backendExePath, [], {
          env,
          cwd: path.dirname(backendExePath),
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true  // CRÍTICO: esconder console no Windows
        });
        
      } else {
        // ========== DESENVOLVIMENTO: usar Python ==========
        const serverPath = path.join(__dirname, '..', 'backend', 'server.py');
        log('info', `Iniciando Python: ${serverPath}`);
        
        backendProcess = spawn('python', [serverPath], {
          env,
          cwd: path.join(__dirname, '..', 'backend'),
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
      
      // Capturar output
      backendProcess.stdout.on('data', (data) => {
        log('backend', data.toString().trim());
      });
      
      backendProcess.stderr.on('data', (data) => {
        log('backend-err', data.toString().trim());
      });
      
      backendProcess.on('error', (err) => {
        log('error', `Erro no processo backend: ${err.message}`);
        reject(err);
      });
      
      backendProcess.on('exit', (code) => {
        log('info', `Backend encerrado com código: ${code}`);
        backendProcess = null;
      });
      
      // Aguardar health check
      waitForBackend(currentPort).then((result) => {
        if (result.ok) {
          log('info', 'Backend iniciado com sucesso!');
          resolve({ port: currentPort, health: result.data });
        } else {
          const err = new Error('Backend não respondeu ao health check');
          log('error', err.message);
          reject(err);
        }
      });
      
    } catch (err) {
      log('error', `Exceção ao iniciar backend: ${err.message}`);
      reject(err);
    }
  });
}

function stopBackend() {
  if (backendProcess) {
    log('info', 'Encerrando backend...');
    
    if (process.platform === 'win32') {
      try {
        exec(`taskkill /F /T /PID ${backendProcess.pid}`);
      } catch (e) {}
    } else {
      backendProcess.kill('SIGTERM');
    }
    
    backendProcess = null;
  }
}

// ==================== JANELA PRINCIPAL ====================
function createWindow(port) {
  log('info', 'Criando janela principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });
  
  // URL DO BACKEND - NUNCA localhost:3000
  const backendUrl = `http://127.0.0.1:${port}`;
  log('info', `Carregando UI de: ${backendUrl}`);
  
  // Carregar página
  mainWindow.loadURL(backendUrl).catch((err) => {
    log('error', `Erro ao carregar UI: ${err.message}`);
    showErrorAndQuit('Erro ao Carregar Interface', 
      `Não foi possível carregar a interface do usuário.\n\nURL: ${backendUrl}\nErro: ${err.message}`);
  });
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log('info', 'Janela exibida com sucesso');
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // DevTools apenas em desenvolvimento
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // PREVENIR abertura de links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Se for URL externa, abrir no navegador (opcional)
    if (url.startsWith('http') && !url.includes('127.0.0.1')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ==================== ERRO ====================
function showErrorAndQuit(title, message) {
  log('error', `${title}: ${message}`);
  
  const result = dialog.showMessageBoxSync({
    type: 'error',
    title: title,
    message: message,
    detail: `Logs disponíveis em:\n${logsPath}`,
    buttons: ['Fechar', 'Abrir Logs'],
    defaultId: 0
  });
  
  if (result === 1 && logsPath) {
    shell.openPath(logsPath);
  }
  
  app.quit();
}

// ==================== IPC ====================
function setupIPC() {
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    userDataPath,
    dbPath,
    logsPath,
    frontendPath,
    port: currentPort,
    isPackaged: app.isPackaged
  }));
  
  ipcMain.handle('open-logs-folder', () => {
    if (logsPath) shell.openPath(logsPath);
  });
  
  ipcMain.handle('open-data-folder', () => {
    if (userDataPath) shell.openPath(userDataPath);
  });
  
  ipcMain.handle('get-backend-url', () => {
    return `http://127.0.0.1:${currentPort}`;
  });
}

// ==================== INICIALIZAÇÃO ====================
app.whenReady().then(async () => {
  // Inicializar paths primeiro
  initPaths();
  
  log('info', '='.repeat(60));
  log('info', `${APP_NAME} v${app.getVersion()} iniciando...`);
  log('info', `Plataforma: ${process.platform}`);
  log('info', `Empacotado: ${app.isPackaged}`);
  log('info', `ResourcesPath: ${app.isPackaged ? process.resourcesPath : 'N/A'}`);
  log('info', '='.repeat(60));
  
  setupIPC();
  
  try {
    const result = await startBackend();
    createWindow(result.port);
  } catch (err) {
    showErrorAndQuit('Erro ao Iniciar', 
      `Não foi possível iniciar o ${APP_NAME}.\n\nErro: ${err.message}`);
  }
});

app.on('window-all-closed', () => {
  log('info', 'Todas as janelas fechadas');
  stopBackend();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startBackend()
      .then((result) => createWindow(result.port))
      .catch((err) => showErrorAndQuit('Erro', err.message));
  }
});

app.on('before-quit', () => {
  log('info', 'App encerrando...');
  stopBackend();
});

process.on('uncaughtException', (err) => {
  log('error', `Exceção não tratada: ${err.message}`);
  log('error', err.stack);
});
