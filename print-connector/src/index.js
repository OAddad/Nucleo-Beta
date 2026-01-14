#!/usr/bin/env node
/**
 * Núcleo Print Connector
 * Servidor local para impressão térmica ESC/POS
 * Porta: 9100
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Módulos internos
const PrinterManager = require('./printer-manager');
const PrintQueue = require('./print-queue');
const ESCPOSBuilder = require('./escpos-builder');
const Logger = require('./logger');
const Config = require('./config');

const app = express();
const PORT = 9100;
const VERSION = '1.0.0';

// Instâncias globais
const config = new Config();
const logger = new Logger(config);
const printerManager = new PrinterManager(logger, config);
const printQueue = new PrintQueue(printerManager, logger, config);

// CORS configurável
const allowedOrigins = config.get('allowedOrigins', [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://*.emergentapp.io',
  'https://*.emergent.sh'
]);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origin (apps desktop, curl, etc)
    if (!origin) return callback(null, true);
    
    // Verificar se origin está na whitelist
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado para origin: ${origin}`);
      callback(null, true); // Ainda permite mas loga
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ==================== ENDPOINTS ====================

/**
 * GET /health
 * Status do serviço e impressora
 */
app.get('/health', async (req, res) => {
  try {
    const defaultPrinter = config.get('defaultPrinter');
    let printerConnected = false;
    let printerName = null;
    
    if (defaultPrinter) {
      const status = await printerManager.checkPrinterStatus(defaultPrinter);
      printerConnected = status.connected;
      printerName = defaultPrinter.name;
    }
    
    res.json({
      status: 'online',
      version: VERSION,
      printer_connected: printerConnected,
      printer_name: printerName,
      queue_size: printQueue.getQueueSize(),
      uptime: process.uptime(),
      platform: os.platform(),
      hostname: os.hostname()
    });
  } catch (error) {
    logger.error('Erro em /health:', error);
    res.json({
      status: 'online',
      version: VERSION,
      printer_connected: false,
      printer_name: null,
      error: error.message
    });
  }
});

/**
 * GET /printers
 * Lista impressoras USB detectadas
 */
app.get('/printers', async (req, res) => {
  try {
    const printers = await printerManager.listPrinters();
    const defaultPrinter = config.get('defaultPrinter');
    
    // Marcar impressora padrão
    const printersWithDefault = printers.map(p => ({
      ...p,
      is_default: defaultPrinter && 
        p.vendorId === defaultPrinter.vendorId && 
        p.productId === defaultPrinter.productId
    }));
    
    res.json(printersWithDefault);
  } catch (error) {
    logger.error('Erro em /printers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /printers/connect
 * Seleciona e conecta impressora padrão
 */
app.post('/printers/connect', async (req, res) => {
  try {
    const { vendorId, productId, name } = req.body;
    
    if (!vendorId || !productId) {
      return res.status(400).json({ 
        success: false, 
        error: 'vendorId e productId são obrigatórios' 
      });
    }
    
    // Verificar se impressora existe
    const printers = await printerManager.listPrinters();
    const printer = printers.find(p => 
      p.vendorId === vendorId && p.productId === productId
    );
    
    if (!printer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Impressora não encontrada' 
      });
    }
    
    // Testar conexão
    const connected = await printerManager.testConnection(printer);
    
    if (connected) {
      // Salvar como padrão
      const printerConfig = {
        vendorId,
        productId,
        name: name || printer.name,
        connectedAt: new Date().toISOString()
      };
      config.set('defaultPrinter', printerConfig);
      logger.info(`Impressora padrão definida: ${printerConfig.name}`);
      
      res.json({ 
        success: true, 
        message: 'Impressora conectada e salva como padrão',
        printer: printerConfig
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Não foi possível conectar à impressora' 
      });
    }
  } catch (error) {
    logger.error('Erro em /printers/connect:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /print
 * Imprime pedido automaticamente (sem popup)
 */
app.post('/print', async (req, res) => {
  try {
    const { pedido, template = 'cozinha', copies = 1, cut = true } = req.body;
    
    if (!pedido) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pedido é obrigatório' 
      });
    }
    
    const defaultPrinter = config.get('defaultPrinter');
    if (!defaultPrinter) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhuma impressora padrão configurada' 
      });
    }
    
    // Criar job de impressão
    const jobId = uuidv4();
    const job = {
      id: jobId,
      pedido,
      template,
      copies,
      cut,
      printer: defaultPrinter,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    };
    
    // Adicionar à fila
    printQueue.addJob(job);
    logger.info(`Job ${jobId} adicionado à fila`);
    
    res.json({ 
      success: true, 
      jobId,
      message: 'Pedido enviado para impressão',
      queue_position: printQueue.getQueueSize()
    });
  } catch (error) {
    logger.error('Erro em /print:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /test
 * Imprime página de teste ESC/POS
 */
app.post('/test', async (req, res) => {
  try {
    const defaultPrinter = config.get('defaultPrinter');
    if (!defaultPrinter) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhuma impressora padrão configurada' 
      });
    }
    
    const escpos = new ESCPOSBuilder();
    const testData = escpos
      .initialize()
      .setCodepage('CP850')
      .align('center')
      .setTextSize(2, 2)
      .text('=== TESTE ===')
      .setTextSize(1, 1)
      .newLine()
      .text('Núcleo Print Connector')
      .text(`Versão: ${VERSION}`)
      .newLine()
      .separator()
      .align('left')
      .text(`Impressora: ${defaultPrinter.name}`)
      .text(`Data: ${new Date().toLocaleString('pt-BR')}`)
      .text(`Papel: 80mm (72mm imprimível)`)
      .text(`DPI: 203`)
      .text(`Colunas: 48`)
      .separator()
      .align('center')
      .text('Caracteres PT-BR:')
      .text('ÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇç')
      .separator()
      .align('left')
      .text('2x Item Teste 1      R$ 20,00')
      .text('1x Item Teste 2      R$ 15,00')
      .text('   -> Com observação')
      .separator()
      .setBold(true)
      .text('TOTAL:               R$ 35,00')
      .setBold(false)
      .separator()
      .align('center')
      .text('Impressão OK!')
      .newLine(2)
      .cut()
      .build();
    
    // Imprimir diretamente
    const result = await printerManager.printRaw(defaultPrinter, testData);
    
    if (result.success) {
      logger.info('Teste de impressão executado com sucesso');
      res.json({ success: true, message: 'Teste impresso com sucesso' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error('Erro em /test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /queue
 * Lista jobs na fila de impressão
 */
app.get('/queue', (req, res) => {
  try {
    const jobs = printQueue.getJobs();
    res.json(jobs);
  } catch (error) {
    logger.error('Erro em /queue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /queue/:jobId
 * Remove job da fila
 */
app.delete('/queue/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const removed = printQueue.removeJob(jobId);
    
    if (removed) {
      res.json({ success: true, message: 'Job removido' });
    } else {
      res.status(404).json({ success: false, error: 'Job não encontrado' });
    }
  } catch (error) {
    logger.error('Erro em DELETE /queue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /queue/retry/:jobId
 * Retentar job com erro
 */
app.post('/queue/retry/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const retried = printQueue.retryJob(jobId);
    
    if (retried) {
      res.json({ success: true, message: 'Job reenviado para fila' });
    } else {
      res.status(404).json({ success: false, error: 'Job não encontrado' });
    }
  } catch (error) {
    logger.error('Erro em POST /queue/retry:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /queue/clear
 * Limpa toda a fila
 */
app.post('/queue/clear', (req, res) => {
  try {
    printQueue.clearQueue();
    res.json({ success: true, message: 'Fila limpa' });
  } catch (error) {
    logger.error('Erro em POST /queue/clear:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /logs
 * Últimos 200 eventos de log
 */
app.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs = logger.getLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /config
 * Retorna configuração atual
 */
app.get('/config', (req, res) => {
  try {
    res.json({
      defaultPrinter: config.get('defaultPrinter'),
      allowedOrigins: config.get('allowedOrigins', allowedOrigins),
      paperWidth: config.get('paperWidth', 80),
      printableWidth: config.get('printableWidth', 72),
      dpi: config.get('dpi', 203),
      maxColumns: config.get('maxColumns', 48),
      codepage: config.get('codepage', 'CP850')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /config
 * Atualiza configuração
 */
app.post('/config', (req, res) => {
  try {
    const { allowedOrigins: origins, paperWidth, printableWidth, dpi, maxColumns, codepage } = req.body;
    
    if (origins) config.set('allowedOrigins', origins);
    if (paperWidth) config.set('paperWidth', paperWidth);
    if (printableWidth) config.set('printableWidth', printableWidth);
    if (dpi) config.set('dpi', dpi);
    if (maxColumns) config.set('maxColumns', maxColumns);
    if (codepage) config.set('codepage', codepage);
    
    logger.info('Configuração atualizada');
    res.json({ success: true, message: 'Configuração salva' });
  } catch (error) {
    logger.error('Erro em POST /config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== INICIALIZAÇÃO ====================

app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       NÚCLEO PRINT CONNECTOR v${VERSION}              ║
╠══════════════════════════════════════════════════════╣
║  Servidor rodando em: http://127.0.0.1:${PORT}         ║
║  Status: ONLINE                                      ║
╚══════════════════════════════════════════════════════╝
  `);
  
  logger.info(`Print Connector iniciado na porta ${PORT}`);
  
  // Iniciar processamento da fila
  printQueue.startProcessing();
  
  // Verificar impressora padrão
  const defaultPrinter = config.get('defaultPrinter');
  if (defaultPrinter) {
    logger.info(`Impressora padrão: ${defaultPrinter.name}`);
  } else {
    logger.warn('Nenhuma impressora padrão configurada');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Encerrando Print Connector...');
  printQueue.stopProcessing();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Encerrando Print Connector...');
  printQueue.stopProcessing();
  process.exit(0);
});
