/**
 * Printer Manager para Windows
 * Usa wmic/PowerShell para listar impressoras e RAW printing para ESC/POS
 * NÃO depende de módulos nativos - funciona como executável standalone
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PrinterManager {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.isWindows = os.platform() === 'win32';
  }
  
  /**
   * Lista impressoras instaladas no Windows
   */
  async listPrinters() {
    const printers = [];
    
    if (!this.isWindows) {
      // Modo simulação para desenvolvimento em Linux
      this.logger.info('Modo Linux - simulando lista de impressoras');
      return [{
        id: 'simulated-1',
        name: 'Impressora Simulada (Linux)',
        status: 'online',
        type: 'simulated'
      }];
    }
    
    try {
      // Usar PowerShell para listar impressoras
      const cmd = 'powershell -Command "Get-Printer | Select-Object Name, PrinterStatus, PortName, DriverName | ConvertTo-Json"';
      const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      
      let parsed = JSON.parse(result);
      if (!Array.isArray(parsed)) parsed = [parsed];
      
      for (const p of parsed) {
        if (p && p.Name) {
          printers.push({
            id: p.Name.replace(/\s+/g, '-').toLowerCase(),
            name: p.Name,
            port: p.PortName || null,
            driver: p.DriverName || null,
            status: p.PrinterStatus === 0 ? 'online' : 'offline',
            type: 'windows'
          });
        }
      }
    } catch (error) {
      this.logger.error('Erro ao listar impressoras:', error.message);
      
      // Fallback: usar wmic
      try {
        const wmicResult = execSync('wmic printer get name,status /format:csv', { encoding: 'utf8', timeout: 10000 });
        const lines = wmicResult.split('\n').filter(l => l.trim() && !l.includes('Node'));
        
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            if (name) {
              printers.push({
                id: name.replace(/\s+/g, '-').toLowerCase(),
                name: name,
                status: 'unknown',
                type: 'windows'
              });
            }
          }
        }
      } catch (wmicError) {
        this.logger.error('Erro wmic:', wmicError.message);
      }
    }
    
    return printers;
  }
  
  /**
   * Verifica se impressora está disponível
   */
  async isPrinterAvailable(printerName) {
    if (!this.isWindows) return true; // Simulação
    
    try {
      const printers = await this.listPrinters();
      const printer = printers.find(p => p.name === printerName);
      return printer !== undefined;
    } catch (error) {
      this.logger.error('Erro ao verificar impressora:', error.message);
      return false;
    }
  }
  
  /**
   * Imprime dados RAW (ESC/POS) na impressora
   * Usa arquivo temporário + comando de impressão RAW do Windows
   */
  async printRaw(printerName, data) {
    if (!this.isWindows) {
      // Modo simulação Linux
      this.logger.info('Modo Linux - simulando impressão');
      this.logger.info(`Dados: ${data.length} bytes`);
      return { success: true, simulated: true };
    }
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `nucleo_print_${Date.now()}.bin`);
    
    try {
      // Escrever dados binários ESC/POS em arquivo temporário
      fs.writeFileSync(tempFile, Buffer.from(data));
      
      // Imprimir usando copy /b para RAW printing
      // Este método envia bytes diretamente para a impressora sem processamento
      const printCmd = `copy /b "${tempFile}" "\\\\%COMPUTERNAME%\\${printerName.replace(/"/g, '')}" > nul 2>&1`;
      
      try {
        execSync(printCmd, { 
          encoding: 'utf8', 
          timeout: 30000,
          shell: 'cmd.exe',
          windowsHide: true
        });
        this.logger.info(`Impressão enviada: ${data.length} bytes para ${printerName}`);
        return { success: true };
      } catch (copyError) {
        // Tentar método alternativo via PowerShell
        this.logger.warn('Fallback para PowerShell RAW print...');
        
        const psCmd = `
          $bytes = [System.IO.File]::ReadAllBytes('${tempFile.replace(/\\/g, '\\\\')}')
          $printerPath = "\\\\$env:COMPUTERNAME\\${printerName.replace(/'/g, "''")}"
          $fs = [System.IO.File]::OpenWrite($printerPath)
          $fs.Write($bytes, 0, $bytes.Length)
          $fs.Close()
        `;
        
        try {
          execSync(`powershell -Command "${psCmd.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
            encoding: 'utf8',
            timeout: 30000,
            windowsHide: true
          });
          this.logger.info(`Impressão via PowerShell: ${data.length} bytes`);
          return { success: true };
        } catch (psError) {
          // Último fallback: lpr command se disponível
          try {
            execSync(`lpr -S 127.0.0.1 -P "${printerName}" "${tempFile}"`, {
              encoding: 'utf8',
              timeout: 30000,
              windowsHide: true
            });
            return { success: true };
          } catch (lprError) {
            throw new Error(`Falha ao imprimir: ${copyError.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Erro na impressão: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      // Limpar arquivo temporário
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignorar erro de limpeza
      }
    }
  }
}

module.exports = PrinterManager;
