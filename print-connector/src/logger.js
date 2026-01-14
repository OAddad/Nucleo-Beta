/**
 * Logger
 * Sistema de logs com persistência em memória
 */

class Logger {
  constructor(config) {
    this.config = config;
    this.logs = [];
    this.maxLogs = 500; // Manter últimos 500 logs em memória
  }
  
  _addLog(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logs.push(entry);
    
    // Limitar tamanho
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }
  
  info(message, data = null) {
    this._addLog('info', message, data);
  }
  
  warn(message, data = null) {
    this._addLog('warn', message, data);
  }
  
  error(message, data = null) {
    this._addLog('error', message, data);
  }
  
  debug(message, data = null) {
    this._addLog('debug', message, data);
  }
  
  getLogs(limit = 200) {
    return this.logs.slice(-limit).reverse();
  }
  
  clear() {
    this.logs = [];
  }
}

module.exports = Logger;
