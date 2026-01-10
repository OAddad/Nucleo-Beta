/**
 * Núcleo - Electron Main Process
 * App desktop de gestão de CMV para restaurantes
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');

// Configurações
const APP_NAME = 'Núcleo';
const DEFAULT_PORT = 17845;
const BACKEND_STARTUP_TIMEOUT = 30000; // 30 segundos

// Caminhos
let userDataPath;
let dbPath;
let logsPath;
let logFile;
let backendProcess = null;
let mainWindow = null;
let currentPort = DEFAULT_PORT;

// Logger
function initLogger() {
  userDataPath = app.getPath('userData');
  logsPath = path.join(userDataPath, 'logs');
  dbPath = path.join(userDataPath, 'nucleo.db');
  
  // Criar diretório de logs se não existir
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  
  logFile = path.join(logsPath, 'nucleo.log');
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

// Verificar se porta está disponível
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

// Encontrar porta disponível
async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('Nenhuma porta disponível encontrada');
}

// Matar processo na porta
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
              exec(`taskkill /F /PID ${pid}`, () => {});
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

// Healthcheck do backend
async function checkBackendHealth(port, retries = 30, delay = 1000) {
  const http = require('http');
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 2000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
      
      if (result) {
        log('info', `Backend respondendo na porta ${port}`);
        return true;
      }
    } catch (e) {
      // Continuar tentando
    }
    
    await new Promise(r => setTimeout(r, delay));
  }
  
  return false;
}

// Iniciar backend
async function startBackend() {
  log('info', 'Iniciando backend...');
  log('info', `UserData: ${userDataPath}`);
  log('info', `Database: ${dbPath}`);
  
  // Verificar porta
  const portAvailable = await isPortAvailable(DEFAULT_PORT);
  if (!portAvailable) {
    log('warn', `Porta ${DEFAULT_PORT} em uso, tentando liberar...`);
    await killProcessOnPort(DEFAULT_PORT);
    
    // Verificar novamente
    const stillUsed = !(await isPortAvailable(DEFAULT_PORT));
    if (stillUsed) {
      log('warn', `Porta ${DEFAULT_PORT} ainda em uso, procurando alternativa...`);
      currentPort = await findAvailablePort(DEFAULT_PORT + 1);
      log('info', `Usando porta alternativa: ${currentPort}`);
    } else {
      currentPort = DEFAULT_PORT;
    }
  } else {
    currentPort = DEFAULT_PORT;
  }
  
  // Determinar caminho do executável do backend
  let backendPath;
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // Em desenvolvimento, usar Python diretamente
    log('info', 'Modo desenvolvimento detectado');
    backendPath = null; // Será iniciado via Python
  } else {
    // Em produção, usar executável empacotado
    const resourcesPath = process.resourcesPath;
    backendPath = path.join(resourcesPath, 'backend', 'nucleo-backend.exe');
    
    if (!fs.existsSync(backendPath)) {
      // Tentar caminho alternativo
      backendPath = path.join(resourcesPath, 'backend', 'nucleo-backend');
    }
    
    log('info', `Backend path: ${backendPath}`);
  }
  
  // Configurar variáveis de ambiente
  const env = {
    ...process.env,
    NUCLEO_DATA_PATH: userDataPath,
    NUCLEO_DB_PATH: dbPath,
    NUCLEO_LOGS_PATH: logsPath,
    NUCLEO_PORT: currentPort.toString(),
    PYTHONUNBUFFERED: '1'
  };
  
  return new Promise((resolve, reject) => {
    try {
      if (isDev) {
        // Desenvolvimento: usar Python
        const serverPath = path.join(__dirname, '..', 'backend', 'server.py');
        log('info', `Iniciando Python: ${serverPath}`);
        
        backendProcess = spawn('python', [serverPath], {
          cwd: path.join(__dirname, '..', 'backend'),
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } else {
        // Produção: usar executável
        log('info', `Iniciando executável: ${backendPath}`);
        
        backendProcess = spawn(backendPath, [], {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      }
      
      backendProcess.stdout.on('data', (data) => {
        log('backend', data.toString().trim());
      });
      
      backendProcess.stderr.on('data', (data) => {
        log('backend-err', data.toString().trim());
      });
      
      backendProcess.on('error', (err) => {
        log('error', `Erro ao iniciar backend: ${err.message}`);
        reject(err);
      });
      
      backendProcess.on('exit', (code) => {
        log('info', `Backend encerrado com código: ${code}`);
        backendProcess = null;
      });
      
      // Aguardar backend ficar pronto
      checkBackendHealth(currentPort).then((healthy) => {
        if (healthy) {
          log('info', 'Backend iniciado com sucesso!');
          resolve(currentPort);
        } else {
          log('error', 'Backend não respondeu ao healthcheck');
          reject(new Error('Backend timeout'));
        }
      });
      
    } catch (err) {
      log('error', `Exceção ao iniciar backend: ${err.message}`);
      reject(err);
    }
  });
}

// Parar backend
function stopBackend() {
  if (backendProcess) {
    log('info', 'Encerrando backend...');
    
    if (process.platform === 'win32') {
      exec(`taskkill /F /T /PID ${backendProcess.pid}`);
    } else {
      backendProcess.kill('SIGTERM');
    }
    
    backendProcess = null;
  }
}

// Criar janela principal
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
  
  // Carregar URL do frontend
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // Desenvolvimento: o backend serve o frontend também
    const frontendUrl = `http://127.0.0.1:${port}`;
    log('info', `Modo dev - carregando frontend de: ${frontendUrl}`);
    mainWindow.loadURL(frontendUrl);
  } else {
    // Produção: carregar build do React via backend
    // O backend em produção serve os arquivos estáticos do React
    const backendUrl = `http://127.0.0.1:${port}`;
    log('info', `Modo produção - carregando de: ${backendUrl}`);
    mainWindow.loadURL(backendUrl);
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log('info', 'Janela exibida');
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Abrir DevTools em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Mostrar erro
function showError(title, message) {
  const result = dialog.showMessageBoxSync({
    type: 'error',
    title: title,
    message: message,
    buttons: ['OK', 'Abrir Logs'],
    defaultId: 0
  });
  
  if (result === 1) {
    shell.openPath(logsPath);
  }
}

// IPC Handlers
function setupIPC() {
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    userDataPath,
    dbPath,
    logsPath,
    port: currentPort
  }));
  
  ipcMain.handle('open-logs-folder', () => {
    shell.openPath(logsPath);
  });
  
  ipcMain.handle('open-data-folder', () => {
    shell.openPath(userDataPath);
  });
  
  ipcMain.handle('get-backend-url', () => {
    return `http://127.0.0.1:${currentPort}`;
  });
}

// Inicialização do app
app.whenReady().then(async () => {
  log('info', '='.repeat(50));
  log('info', `${APP_NAME} iniciando...`);
  log('info', `Versão: ${app.getVersion()}`);
  log('info', `Plataforma: ${process.platform}`);
  log('info', `Empacotado: ${app.isPackaged}`);
  
  initLogger();
  setupIPC();
  
  try {
    const port = await startBackend();
    createWindow(port);
  } catch (err) {
    log('error', `Falha ao iniciar: ${err.message}`);
    
    const result = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Erro ao Iniciar',
      message: `Não foi possível iniciar o ${APP_NAME}.\n\nErro: ${err.message}`,
      buttons: ['Fechar', 'Abrir Logs'],
      defaultId: 0
    });
    
    if (result === 1) {
      shell.openPath(logsPath);
    }
    
    app.quit();
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
    startBackend().then((port) => createWindow(port));
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
