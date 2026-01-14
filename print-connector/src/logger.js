/**
 * Logger simples com memória
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
  }
  
  _add(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }
  }
  
  info(msg, data) { this._add('info', msg, data); }
  warn(msg, data) { this._add('warn', msg, data); }
  error(msg, data) { this._add('error', msg, data); }
  
  getLogs(limit = 200) {
    return this.logs.slice(-limit).reverse();
  }
}

module.exports = Logger;
