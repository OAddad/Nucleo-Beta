/**
 * Configuração centralizada de API
 * 
 * Detecta automaticamente o ambiente (web vs desktop Electron)
 * e configura a URL base da API apropriadamente.
 */

// Configurações padrão
let API_BASE = '/api';
let isElectron = false;
let appInfo = null;

// Settings locais
let localSettings = {
  skipLogin: false,
  theme: 'light'
};

/**
 * Detecta se está rodando no Electron
 */
function detectElectron() {
  return typeof window !== 'undefined' && 
         typeof window.nucleoDesktop !== 'undefined' && 
         window.nucleoDesktop.isElectron === true;
}

/**
 * Inicializa a configuração da API
 * Deve ser chamado no início do app
 */
export async function initApiConfig() {
  isElectron = detectElectron();
  
  if (isElectron) {
    try {
      // Obter URL do backend do Electron
      const backendUrl = await window.nucleoDesktop.getBackendUrl();
      API_BASE = `${backendUrl}/api`;
      
      // Obter informações do app
      appInfo = await window.nucleoDesktop.getAppInfo();
      
      console.log('[API Config] Modo Desktop Electron');
      console.log('[API Config] Backend URL:', backendUrl);
      console.log('[API Config] App Info:', appInfo);
    } catch (err) {
      console.error('[API Config] Erro ao obter URL do backend:', err);
      // Fallback para porta padrão
      API_BASE = 'http://127.0.0.1:17845/api';
    }
  } else {
    // Ambiente web - usar URL relativa (proxy do CRA ou mesmo domínio)
    API_BASE = '/api';
    console.log('[API Config] Modo Web');
    console.log('[API Config] API Base:', API_BASE);
  }
  
  // Carregar settings locais
  loadLocalSettings();
  
  return API_BASE;
}

/**
 * Carrega settings do localStorage
 */
function loadLocalSettings() {
  try {
    const saved = localStorage.getItem('nucleo_settings');
    if (saved) {
      localSettings = { ...localSettings, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('[Settings] Erro ao carregar:', err);
  }
}

/**
 * Salva settings no localStorage
 */
export function saveSettings(newSettings) {
  try {
    localSettings = { ...localSettings, ...newSettings };
    localStorage.setItem('nucleo_settings', JSON.stringify(localSettings));
  } catch (err) {
    console.error('[Settings] Erro ao salvar:', err);
  }
}

/**
 * Retorna settings atuais
 */
export function getSettings() {
  return { ...localSettings };
}

/**
 * Retorna a URL base da API
 */
export function getApiBase() {
  return API_BASE;
}

/**
 * Verifica se está no Electron
 */
export function getIsElectron() {
  return isElectron;
}

/**
 * Retorna informações do app (apenas no Electron)
 */
export function getAppInfo() {
  return appInfo;
}

/**
 * Abre a pasta de logs (apenas no Electron)
 */
export async function openLogsFolder() {
  if (isElectron && window.nucleoDesktop) {
    return window.nucleoDesktop.openLogsFolder();
  }
}

/**
 * Abre a pasta de dados (apenas no Electron)
 */
export async function openDataFolder() {
  if (isElectron && window.nucleoDesktop) {
    return window.nucleoDesktop.openDataFolder();
  }
}

// Helper para construir URLs da API
export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

// Configuração do axios com base URL dinâmica
export const getAxiosConfig = () => ({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export padrão
export default API_BASE;
