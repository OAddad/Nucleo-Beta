/**
 * ESC/POS Command Builder
 * Gera comandos ESC/POS para impressoras térmicas Epson
 * 
 * Configuração fixa para 80mm:
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
    this.maxColumns = 48; // Font A em 80mm
    
    // Comandos ESC/POS
    this.ESC = 0x1B;
    this.GS = 0x1D;
    this.FS = 0x1C;
    this.DLE = 0x10;
    this.LF = 0x0A;
    this.CR = 0x0D;
    this.HT = 0x09;
    this.FF = 0x0C;
    this.NUL = 0x00;
  }
  
  /**
   * Inicializa impressora
   */
  initialize() {
    // ESC @ - Initialize printer
    this.buffer.push(this.ESC, 0x40);
    return this;
  }
  
  /**
   * Define codepage para acentuação PT-BR
   */
  setCodepage(codepage = 'CP850') {
    const codepages = {
      'CP437': 0,
      'CP850': 2,
      'CP860': 3,   // Português
      'CP858': 19,  // CP850 + Euro
      'CP1252': 16, // Windows Latin 1
      'UTF8': 255
    };
    
    const code = codepages[codepage] || 2;
    // ESC t n - Select character code table
    this.buffer.push(this.ESC, 0x74, code);
    return this;
  }
  
  /**
   * Alinhamento
   */
  align(alignment) {
    const alignments = {
      'left': 0,
      'center': 1,
      'right': 2
    };
    // ESC a n
    this.buffer.push(this.ESC, 0x61, alignments[alignment] || 0);
    return this;
  }
  
  /**
   * Tamanho do texto (width: 1-8, height: 1-8)
   */
  setTextSize(width = 1, height = 1) {
    const w = Math.min(Math.max(width, 1), 8) - 1;
    const h = Math.min(Math.max(height, 1), 8) - 1;
    const n = (w << 4) | h;
    // GS ! n
    this.buffer.push(this.GS, 0x21, n);
    return this;
  }
  
  /**
   * Negrito on/off
   */
  setBold(enabled = true) {
    // ESC E n
    this.buffer.push(this.ESC, 0x45, enabled ? 1 : 0);
    return this;
  }
  
  /**
   * Sublinhado on/off
   */
  setUnderline(enabled = true) {
    // ESC - n
    this.buffer.push(this.ESC, 0x2D, enabled ? 1 : 0);
    return this;
  }
  
  /**
   * Inverso (branco no preto)
   */
  setInverse(enabled = true) {
    // GS B n
    this.buffer.push(this.GS, 0x42, enabled ? 1 : 0);
    return this;
  }
  
  /**
   * Adiciona texto
   */
  text(str) {
    // Converter para CP850
    const encoded = this._encodeCP850(str);
    this.buffer.push(...encoded, this.LF);
    return this;
  }
  
  /**
   * Texto sem quebra de linha
   */
  textInline(str) {
    const encoded = this._encodeCP850(str);
    this.buffer.push(...encoded);
    return this;
  }
  
  /**
   * Nova linha
   */
  newLine(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(this.LF);
    }
    return this;
  }
  
  /**
   * Linha separadora
   */
  separator(char = '-') {
    const line = char.repeat(this.maxColumns);
    return this.text(line);
  }
  
  /**
   * Linha dupla
   */
  doubleSeparator() {
    return this.separator('=');
  }
  
  /**
   * Texto em duas colunas (esquerda e direita)
   */
  columns(left, right, fillChar = ' ') {
    const leftStr = String(left);
    const rightStr = String(right);
    const totalLen = leftStr.length + rightStr.length;
    
    if (totalLen >= this.maxColumns) {
      // Se não cabe, quebra em duas linhas
      this.text(leftStr);
      this.align('right');
      this.text(rightStr);
      this.align('left');
    } else {
      const spaces = this.maxColumns - totalLen;
      const line = leftStr + fillChar.repeat(spaces) + rightStr;
      this.text(line);
    }
    return this;
  }
  
  /**
   * Corte de papel
   */
  cut(partial = false) {
    // Feed antes do corte
    this.newLine(3);
    // GS V m
    this.buffer.push(this.GS, 0x56, partial ? 1 : 0);
    return this;
  }
  
  /**
   * Abre gaveta de dinheiro
   */
  openCashDrawer() {
    // ESC p m t1 t2
    this.buffer.push(this.ESC, 0x70, 0, 25, 250);
    return this;
  }
  
  /**
   * Beep
   */
  beep(times = 1, duration = 100) {
    // ESC B n t
    this.buffer.push(this.ESC, 0x42, times, Math.floor(duration / 50));
    return this;
  }
  
  /**
   * Raw bytes
   */
  raw(bytes) {
    if (Array.isArray(bytes)) {
      this.buffer.push(...bytes);
    } else if (Buffer.isBuffer(bytes)) {
      this.buffer.push(...bytes);
    }
    return this;
  }
  
  /**
   * Converte string para CP850
   */
  _encodeCP850(str) {
    const cp850Map = {
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
      'ç': 0x87,
      'ñ': 0xA4, 'Ñ': 0xA5,
      '°': 0xF8,
      '²': 0xFD,
      '³': 0xFC,
      '€': 0xD5,
      '£': 0x9C,
      '¥': 0x9D,
      '¢': 0x9B,
      '®': 0xA9,
      '©': 0xB8,
      '±': 0xF1,
      '×': 0x9E,
      '÷': 0xF6,
      '¼': 0xAC,
      '½': 0xAB,
      '¾': 0xAD
    };
    
    const result = [];
    for (const char of str) {
      const code = char.charCodeAt(0);
      if (code < 128) {
        result.push(code);
      } else if (cp850Map[char]) {
        result.push(cp850Map[char]);
      } else {
        // Fallback para ?
        result.push(0x3F);
      }
    }
    return result;
  }
  
  /**
   * Quebra texto longo em múltiplas linhas
   */
  wrapText(str, maxLen = null) {
    const max = maxLen || this.maxColumns;
    const words = str.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= max) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    for (const line of lines) {
      this.text(line);
    }
    return this;
  }
  
  /**
   * Retorna buffer como Uint8Array
   */
  build() {
    return new Uint8Array(this.buffer);
  }
  
  /**
   * Retorna buffer como Buffer Node.js
   */
  toBuffer() {
    return Buffer.from(this.buffer);
  }
  
  /**
   * Limpa buffer
   */
  clear() {
    this.buffer = [];
    return this;
  }
}

module.exports = ESCPOSBuilder;
