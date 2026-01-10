/**
 * Núcleo - Preload Script
 * Expõe APIs seguras para o renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nucleoDesktop', {
  // Informações do app
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Abrir pastas
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  
  // URL do backend
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // Verificar se está rodando no Electron
  isElectron: true,
  
  // Versão do Electron
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
