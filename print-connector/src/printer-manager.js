/**
 * Printer Manager para Windows
 * Usa PowerShell para listar impressoras e RAW printing para ESC/POS
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
            id: p.Name.replace(/\\s+/g, '-').toLowerCase(),
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
        const lines = wmicResult.split('\\n').filter(l => l.trim() && !l.includes('Node'));
        
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const name = parts[1]?.trim();
            if (name) {
              printers.push({
                id: name.replace(/\\s+/g, '-').toLowerCase(),
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
    if (!this.isWindows) return true;
    
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
   * Usa múltiplos métodos para garantir compatibilidade
   */
  async printRaw(printerName, data) {
    if (!this.isWindows) {
      this.logger.info('Modo Linux - simulando impressão');
      this.logger.info(`Dados: ${data.length} bytes`);
      return { success: true, simulated: true };
    }
    
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `nucleo_print_${Date.now()}.bin`);
    
    try {
      // Escrever dados binários ESC/POS em arquivo temporário
      fs.writeFileSync(tempFile, Buffer.from(data));
      this.logger.info(`Arquivo temporário criado: ${tempFile}`);
      
      // Método 1: PowerShell Out-Printer com RAW
      try {
        this.logger.info('Tentando impressão via PowerShell RAW...');
        
        // Criar script PowerShell temporário para evitar problemas de escape
        const psScript = `
$printerName = "${printerName.replace(/"/g, '`"')}"
$filePath = "${tempFile.replace(/\\/g, '\\\\')}"

# Obter a porta da impressora
$printer = Get-Printer -Name $printerName -ErrorAction Stop
$port = (Get-PrinterPort -Name $printer.PortName -ErrorAction SilentlyContinue).Name

if ($port -like "USB*" -or $port -like "COM*") {
    # Impressora USB/Serial - usar porta direta
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    
    # Tentar via .NET
    Add-Type -AssemblyName System.Drawing
    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $printerName
    
    # Método alternativo: copiar para porta
    $portPath = "\\\\.\\$port"
    try {
        $handle = [System.IO.File]::OpenWrite($portPath)
        $handle.Write($bytes, 0, $bytes.Length)
        $handle.Close()
        Write-Output "SUCCESS"
    } catch {
        # Fallback: usar spooler
        & rundll32 printui.dll,PrintUIEntry /y /n "$printerName"
        Copy-Item $filePath "\\\\localhost\\$printerName" -Force
        Write-Output "SUCCESS_SPOOLER"
    }
} else {
    # Impressora de rede ou compartilhada
    $networkPath = "\\\\$env:COMPUTERNAME\\$printerName"
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    
    try {
        # Tentar via compartilhamento de rede
        [System.IO.File]::WriteAllBytes($networkPath, $bytes)
        Write-Output "SUCCESS_NETWORK"
    } catch {
        # Usar o comando print do Windows
        & print /d:"$printerName" "$filePath"
        Write-Output "SUCCESS_PRINT"
    }
}
`;
        
        const psScriptFile = path.join(tempDir, `nucleo_ps_${Date.now()}.ps1`);
        fs.writeFileSync(psScriptFile, psScript, 'utf8');
        
        const result = execSync(
          `powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`,
          { encoding: 'utf8', timeout: 30000, windowsHide: true }
        );
        
        // Limpar script
        try { fs.unlinkSync(psScriptFile); } catch(e) {}
        
        if (result.includes('SUCCESS')) {
          this.logger.info(`Impressão via PowerShell OK: ${result.trim()}`);
          return { success: true, method: 'powershell' };
        }
      } catch (psError) {
        this.logger.warn('PowerShell falhou:', psError.message);
      }
      
      // Método 2: Usar RawPrint via .NET diretamente
      try {
        this.logger.info('Tentando RawPrint via .NET...');
        
        const rawPrintScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Nucleo RAW Document";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) return false;
        if (!StartDocPrinter(hPrinter, 1, di)) { ClosePrinter(hPrinter); return false; }
        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
        Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);

        int dwWritten;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);

        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);

        return success;
    }
}
"@ -ErrorAction Stop

$bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
$result = [RawPrint]::SendBytesToPrinter("${printerName.replace(/"/g, '`"')}", $bytes)
if ($result) { Write-Output "SUCCESS_RAW" } else { Write-Output "FAILED" }
`;
        
        const psScriptFile2 = path.join(tempDir, `nucleo_raw_${Date.now()}.ps1`);
        fs.writeFileSync(psScriptFile2, rawPrintScript, 'utf8');
        
        const result = execSync(
          `powershell -ExecutionPolicy Bypass -File "${psScriptFile2}"`,
          { encoding: 'utf8', timeout: 30000, windowsHide: true }
        );
        
        try { fs.unlinkSync(psScriptFile2); } catch(e) {}
        
        if (result.includes('SUCCESS')) {
          this.logger.info('Impressão via RawPrint OK');
          return { success: true, method: 'rawprint' };
        }
      } catch (rawError) {
        this.logger.warn('RawPrint falhou:', rawError.message);
      }
      
      // Método 3: Fallback usando notepad /p (último recurso)
      try {
        this.logger.info('Tentando fallback via print command...');
        execSync(`print /d:"${printerName}" "${tempFile}"`, {
          encoding: 'utf8',
          timeout: 30000,
          windowsHide: true,
          shell: 'cmd.exe'
        });
        this.logger.info('Impressão via print command OK');
        return { success: true, method: 'print_command' };
      } catch (printError) {
        this.logger.warn('Print command falhou:', printError.message);
      }
      
      throw new Error('Todos os métodos de impressão falharam');
      
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
        // Ignorar
      }
    }
  }
}

module.exports = PrinterManager;
