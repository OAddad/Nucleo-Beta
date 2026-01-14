/**
 * Config Manager
 * Persiste configurações no userData do Windows
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class Config {
  constructor() {
    this.configDir = path.join(
      os.platform() === 'win32' 
        ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
        : path.join(os.homedir(), '.config'),
      'NucleoPrintConnector'
    );
    
    this.configFile = path.join(this.configDir, 'config.json');
    this.data = {};
    
    this._ensureDir();
    this._load();
  }
  
  _ensureDir() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
    } catch (error) {
      console.error('Erro ao criar diretório:', error);
    }
  }
  
  _load() {
    try {
      if (fs.existsSync(this.configFile)) {
        this.data = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      }
    } catch (error) {
      this.data = {};
    }
  }
  
  _save() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Erro ao salvar config:', error);
    }
  }
  
  get(key, defaultValue = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }
  
  set(key, value) {
    this.data[key] = value;
    this._save();
  }
  
  delete(key) {
    delete this.data[key];
    this._save();
  }
}

module.exports = Config;
