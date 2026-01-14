/**
 * ESC/POS Command Builder
 * Gera comandos ESC/POS para impressoras térmicas Epson 80mm
 * 
 * Configuração FIXA:
 * - Largura física: 80mm
 * - Largura imprimível: 72mm
 * - DPI: 203
 * - Largura em dots: 576
 * - Colunas: 48 (Font A)
 * - Codepage: CP850 (PT-BR)
 */

class ESCPOSBuilder {
  constructor() {
    this.buffer = [];
    this.maxColumns = 48;
    
    // Comandos ESC/POS
    this.ESC = 0x1B;
    this.GS = 0x1D;
    this.LF = 0x0A;
  }
  
  initialize() {
    this.buffer.push(this.ESC, 0x40);
    return this;
  }
  
  setCodepage(codepage = 'CP850') {
    const codes = { 'CP437': 0, 'CP850': 2, 'CP860': 3, 'CP858': 19 };
    this.buffer.push(this.ESC, 0x74, codes[codepage] || 2);
    return this;
  }
  
  align(alignment) {
    const aligns = { 'left': 0, 'center': 1, 'right': 2 };
    this.buffer.push(this.ESC, 0x61, aligns[alignment] || 0);
    return this;
  }
  
  setTextSize(width = 1, height = 1) {
    const w = Math.min(Math.max(width, 1), 8) - 1;
    const h = Math.min(Math.max(height, 1), 8) - 1;
    this.buffer.push(this.GS, 0x21, (w << 4) | h);
    return this;
  }
  
  setBold(enabled = true) {
    this.buffer.push(this.ESC, 0x45, enabled ? 1 : 0);
    return this;
  }
  
  setUnderline(enabled = true) {
    this.buffer.push(this.ESC, 0x2D, enabled ? 1 : 0);
    return this;
  }
  
  setInverse(enabled = true) {
    this.buffer.push(this.GS, 0x42, enabled ? 1 : 0);
    return this;
  }
  
  text(str) {
    const encoded = this._encodeCP850(str);
    this.buffer.push(...encoded, this.LF);
    return this;
  }
  
  newLine(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(this.LF);
    }
    return this;
  }
  
  separator(char = '-') {
    return this.text(char.repeat(this.maxColumns));
  }
  
  doubleSeparator() {
    return this.separator('=');
  }
  
  columns(left, right, fill = ' ') {
    const l = String(left);
    const r = String(right);
    const total = l.length + r.length;
    
    if (total >= this.maxColumns) {
      this.text(l);
      this.align('right').text(r).align('left');
    } else {
      this.text(l + fill.repeat(this.maxColumns - total) + r);
    }
    return this;
  }
  
  cut(partial = false) {
    this.newLine(3);
    this.buffer.push(this.GS, 0x56, partial ? 1 : 0);
    return this;
  }
  
  openCashDrawer() {
    this.buffer.push(this.ESC, 0x70, 0, 25, 250);
    return this;
  }
  
  wrapText(str, maxLen = null) {
    const max = maxLen || this.maxColumns;
    const words = str.split(' ');
    const lines = [];
    let current = '';
    
    for (const word of words) {
      if (current.length + word.length + 1 <= max) {
        current += (current ? ' ' : '') + word;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    
    for (const line of lines) {
      this.text(line);
    }
    return this;
  }
  
  _encodeCP850(str) {
    const map = {
      'Á': 0xB5, 'À': 0xB7, 'Â': 0xB6, 'Ã': 0xC7, 'Ä': 0x8E,
      'É': 0x90, 'È': 0xD4, 'Ê': 0xD2, 'Ë': 0xD3,
      'Í': 0xD6, 'Ì': 0xDE, 'Î': 0xD7, 'Ï': 0xD8,
      'Ó': 0xE0, 'Ò': 0xE3, 'Ô': 0xE2, 'Õ': 0xE4, 'Ö': 0x99,
      'Ú': 0xE9, 'Ù': 0xEB, 'Û': 0xEA, 'Ü': 0x9A,
      'Ç': 0x80,
      'á': 0xA0, 'à': 0x85, 'â': 0x83, 'ã': 0xC6, 'ä': 0x84,
      'é': 0x82, 'è': 0x8A, 'ê': 0x88, 'ë': 0x89,
      'í': 0xA1, 'ì': 0x8D, 'î': 0x8C, 'ï': 0x8B,
      'ó': 0xA2, 'ò': 0x95, 'ô': 0x93, 'õ': 0xE4, 'ö': 0x94,
      'ú': 0xA3, 'ù': 0x97, 'û': 0x96, 'ü': 0x81,
      'ç': 0x87, 'ñ': 0xA4, 'Ñ': 0xA5, '°': 0xF8
    };
    
    const result = [];
    for (const char of str) {
      const code = char.charCodeAt(0);
      if (code < 128) {
        result.push(code);
      } else if (map[char]) {
        result.push(map[char]);
      } else {
        result.push(0x3F);
      }
    }
    return result;
  }
  
  build() {
    return new Uint8Array(this.buffer);
  }
  
  toBuffer() {
    return Buffer.from(this.buffer);
  }
  
  clear() {
    this.buffer = [];
    return this;
  }
}

module.exports = ESCPOSBuilder;
