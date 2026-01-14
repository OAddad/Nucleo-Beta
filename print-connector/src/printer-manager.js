/**
 * Printer Manager para Windows
 * Usa winspool.drv para impressão RAW ESC/POS
 * NÃO depende de módulos nativos - funciona como executável standalone
 */

const { execSync } = require('child_process');
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
      this.logger.info('Modo Linux - simulando lista de impressoras');
      return [{
        id: 'simulated-1',
        name: 'Impressora Simulada (Linux)',
        status: 'online',
        type: 'simulated'
      }];
    }
    
    try {
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
    }
    
    return printers;
  }
  
  /**
   * Verifica se impressora está disponível
   */
  async isPrinterAvailable(printerName) {
    if (!this.isWindows) return true;
    
    try {
      const printers = await this.listPrinters();
      return printers.some(p => p.name === printerName);
    } catch (error) {
      this.logger.error('Erro ao verificar impressora:', error.message);
      return false;
    }
  }
  
  /**
   * Imprime dados RAW (ESC/POS) usando winspool.drv
   * Este é o método correto para impressoras térmicas
   */
  async printRaw(printerName, data) {
    if (!this.isWindows) {
      this.logger.info('Modo Linux - simulando impressão');
      return { success: true, simulated: true };
    }
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `nucleo_print_${Date.now()}.bin`);
    const psScriptFile = path.join(tempDir, `nucleo_rawprint_${Date.now()}.ps1`);
    
    try {
      // Escrever dados ESC/POS no arquivo temporário
      fs.writeFileSync(tempFile, Buffer.from(data));
      this.logger.info(`Arquivo criado: ${tempFile} (${data.length} bytes)`);
      
      // Script PowerShell que usa winspool.drv para RAW printing
      const psScript = `
# RawPrint usando winspool.drv - método correto para ESC/POS
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFOW
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDataType;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, ref DOCINFOW pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static string SendBytesToPrinter(string printerName, byte[] bytes)
    {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOW di = new DOCINFOW();
        di.pDocName = "Nucleo ESC/POS RAW";
        di.pDataType = "RAW";

        try
        {
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            {
                return "ERRO: Nao foi possivel abrir a impressora. Codigo: " + Marshal.GetLastWin32Error();
            }

            if (!StartDocPrinter(hPrinter, 1, ref di))
            {
                ClosePrinter(hPrinter);
                return "ERRO: StartDocPrinter falhou. Codigo: " + Marshal.GetLastWin32Error();
            }

            if (!StartPagePrinter(hPrinter))
            {
                EndDocPrinter(hPrinter);
                ClosePrinter(hPrinter);
                return "ERRO: StartPagePrinter falhou. Codigo: " + Marshal.GetLastWin32Error();
            }

            IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

            int dwWritten = 0;
            bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);

            Marshal.FreeCoTaskMem(pUnmanagedBytes);

            if (!success)
            {
                EndPagePrinter(hPrinter);
                EndDocPrinter(hPrinter);
                ClosePrinter(hPrinter);
                return "ERRO: WritePrinter falhou. Codigo: " + Marshal.GetLastWin32Error();
            }

            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);

            return "OK:" + dwWritten;
        }
        catch (Exception ex)
        {
            if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
            return "ERRO: " + ex.Message;
        }
    }
}
"@

# Ler arquivo e enviar para impressora
\$filePath = "${tempFile.replace(/\\/g, '\\\\')}"
\$printerName = "${printerName}"

try {
    \$bytes = [System.IO.File]::ReadAllBytes(\$filePath)
    \$result = [RawPrinterHelper]::SendBytesToPrinter(\$printerName, \$bytes)
    Write-Output \$result
} catch {
    Write-Output "ERRO: \$(\$_.Exception.Message)"
}
`;
      
      fs.writeFileSync(psScriptFile, psScript, 'utf8');
      this.logger.info('Executando RawPrint via winspool.drv...');
      
      const result = execSync(
        `powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`,
        { encoding: 'utf8', timeout: 30000, windowsHide: true }
      ).trim();
      
      this.logger.info(`Resultado: ${result}`);
      
      if (result.startsWith('OK:')) {
        const bytesWritten = result.split(':')[1];
        this.logger.info(`Impressão RAW OK - ${bytesWritten} bytes enviados`);
        return { success: true, bytesWritten: parseInt(bytesWritten) };
      } else {
        throw new Error(result);
      }
      
    } catch (error) {
      this.logger.error(`Erro na impressão: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      // Limpar arquivos temporários
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch(e) {}
      try { if (fs.existsSync(psScriptFile)) fs.unlinkSync(psScriptFile); } catch(e) {}
    }
  }
}

module.exports = PrinterManager;
