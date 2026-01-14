/**
 * Printer Manager
 * Gerencia detecção e comunicação com impressoras USB
 * Foco em impressoras Epson térmicas 80mm
 */

let usb;
try {
  usb = require('usb');
} catch (error) {
  console.warn('Módulo USB não disponível - modo simulação ativado');
  usb = null;
}

// Fabricantes conhecidos de impressoras térmicas
const THERMAL_PRINTER_VENDORS = {
  0x04B8: 'Epson',
  0x0416: 'Winbond (Epson compatível)',
  0x0483: 'STMicroelectronics',
  0x0525: 'Netchip',
  0x0DD4: 'Custom Engineering',
  0x1504: 'HPRT',
  0x0FE6: 'ICS Advent',
  0x1FC9: 'NXP',
  0x20D1: 'SIMCOM',
  0x1A86: 'QinHeng (CH340)',
  0x067B: 'Prolific (PL2303)',
  0x0456: 'Analog Devices',
  0x0519: 'Star Micronics',
  0x04E8: 'Samsung',
  0x08A6: 'Toshiba TEC',
  0x0B00: 'Custom'
};

class PrinterManager {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.connectedDevice = null;
  }
  
  /**
   * Lista todas as impressoras USB detectadas
   */
  async listPrinters() {
    const printers = [];
    
    if (!usb) {
      this.logger.warn('USB não disponível - retornando lista vazia');
      return printers;
    }
    
    try {
      const devices = usb.getDeviceList();
      
      for (const device of devices) {
        const desc = device.deviceDescriptor;
        const vendorId = desc.idVendor;
        const productId = desc.idProduct;
        
        // Verificar se é um fabricante conhecido de impressoras térmicas
        // ou se é dispositivo de classe 7 (impressora)
        const isKnownVendor = THERMAL_PRINTER_VENDORS[vendorId];
        
        if (isKnownVendor) {
          let name = THERMAL_PRINTER_VENDORS[vendorId];
          let serialNumber = null;
          
          try {
            device.open();
            
            // Tentar obter nome do produto
            if (desc.iProduct) {
              const productName = await this._getStringDescriptor(device, desc.iProduct);
              if (productName) name = productName;
            }
            
            // Tentar obter serial
            if (desc.iSerialNumber) {
              serialNumber = await this._getStringDescriptor(device, desc.iSerialNumber);
            }
            
            device.close();
          } catch (e) {
            // Ignorar erros ao obter detalhes
          }
          
          printers.push({
            id: `${vendorId.toString(16)}-${productId.toString(16)}`,
            name: name || `Impressora USB ${vendorId.toString(16).toUpperCase()}`,
            vendorId,
            productId,
            vendorName: THERMAL_PRINTER_VENDORS[vendorId] || 'Desconhecido',
            serialNumber,
            status: 'detected'
          });
        }
      }
    } catch (error) {
      this.logger.error('Erro ao listar impressoras:', error.message);
    }
    
    return printers;
  }
  
  /**
   * Obtém string descriptor do dispositivo USB
   */
  _getStringDescriptor(device, index) {
    return new Promise((resolve) => {
      try {
        device.getStringDescriptor(index, (error, data) => {
          if (error) {
            resolve(null);
          } else {
            resolve(data);
          }
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  
  /**
   * Testa conexão com impressora
   */
  async testConnection(printer) {
    if (!usb) {
      this.logger.warn('USB não disponível - simulando conexão OK');
      return true;
    }
    
    try {
      const device = usb.findByIds(printer.vendorId, printer.productId);
      
      if (!device) {
        this.logger.error(`Impressora não encontrada: ${printer.name}`);
        return false;
      }
      
      device.open();
      
      // Selecionar configuração
      if (device.configDescriptor) {
        try {
          device.setConfiguration(device.configDescriptor.bConfigurationValue);
        } catch (e) {
          // Pode já estar configurado
        }
      }
      
      device.close();
      this.logger.info(`Conexão testada com sucesso: ${printer.name}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Erro ao testar conexão: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Verifica status da impressora
   */
  async checkPrinterStatus(printer) {
    if (!usb) {
      return { connected: false, status: 'USB não disponível' };
    }
    
    try {
      const device = usb.findByIds(printer.vendorId, printer.productId);
      
      if (!device) {
        return { connected: false, status: 'Não encontrada' };
      }
      
      return { connected: true, status: 'Conectada' };
      
    } catch (error) {
      return { connected: false, status: error.message };
    }
  }
  
  /**
   * Imprime dados raw (ESC/POS) na impressora
   */
  async printRaw(printer, data) {
    if (!usb) {
      this.logger.warn('USB não disponível - simulando impressão');
      this.logger.info('Dados que seriam impressos:', data.length, 'bytes');
      return { success: true, simulated: true };
    }
    
    let device = null;
    let iface = null;
    
    try {
      device = usb.findByIds(printer.vendorId, printer.productId);
      
      if (!device) {
        throw new Error(`Impressora não encontrada: ${printer.name}`);
      }
      
      device.open();
      
      // Buscar interface de impressora (classe 7)
      const config = device.configDescriptor;
      if (!config) {
        throw new Error('Configuração do dispositivo não encontrada');
      }
      
      // Encontrar interface
      for (const ifaceDesc of config.interfaces) {
        for (const alt of ifaceDesc) {
          // Classe 7 = Impressora, ou 255 = Vendor Specific
          if (alt.bInterfaceClass === 7 || alt.bInterfaceClass === 255) {
            iface = device.interface(alt.bInterfaceNumber);
            break;
          }
        }
        if (iface) break;
      }
      
      // Se não encontrou por classe, pegar primeira interface
      if (!iface && config.interfaces.length > 0) {
        iface = device.interface(0);
      }
      
      if (!iface) {
        throw new Error('Interface de impressão não encontrada');
      }
      
      // Tentar liberar do kernel (Linux)
      if (iface.isKernelDriverActive()) {
        try {
          iface.detachKernelDriver();
        } catch (e) {
          // Ignorar
        }
      }
      
      iface.claim();
      
      // Encontrar endpoint OUT
      let outEndpoint = null;
      for (const ep of iface.endpoints) {
        if (ep.direction === 'out') {
          outEndpoint = ep;
          break;
        }
      }
      
      if (!outEndpoint) {
        throw new Error('Endpoint de saída não encontrado');
      }
      
      // Enviar dados
      const buffer = Buffer.from(data);
      
      await new Promise((resolve, reject) => {
        outEndpoint.transfer(buffer, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      
      this.logger.info(`Impressão enviada: ${buffer.length} bytes`);
      
      // Liberar interface
      iface.release((err) => {
        if (err) this.logger.warn('Erro ao liberar interface:', err.message);
      });
      
      device.close();
      
      return { success: true };
      
    } catch (error) {
      this.logger.error(`Erro na impressão: ${error.message}`);
      
      // Tentar limpar
      try {
        if (iface) iface.release(() => {});
        if (device) device.close();
      } catch (e) {
        // Ignorar
      }
      
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrinterManager;
