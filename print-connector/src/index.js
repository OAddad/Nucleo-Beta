#!/usr/bin/env node
/**
 * Núcleo Print Connector v1.0.0
 * Servidor local para impressão térmica ESC/POS
 * Porta: 9100
 * 
 * Executável standalone para Windows - não requer Node.js instalado
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, exec } = require('child_process');

// Módulos internos
const ESCPOSBuilder = require('./escpos-builder');
const PrinterManager = require('./printer-manager');
const PrintQueue = require('./print-queue');
const Config = require('./config');
const Logger = require('./logger');

const app = express();
const PORT = 9100;
const VERSION = '1.0.0';

// Instâncias globais
const config = new Config();
const logger = new Logger(config);
const printerManager = new PrinterManager(logger, config);
const printQueue = new PrintQueue(printerManager, logger, config);

// CORS - aceita qualquer origem local e domínios Emergent
const corsOptions = {
  origin: true,
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
      printerConnected = await printerManager.isPrinterAvailable(defaultPrinter.name);
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
 * Lista impressoras instaladas no Windows
 */
app.get('/printers', async (req, res) => {
  try {
    const printers = await printerManager.listPrinters();
    const defaultPrinter = config.get('defaultPrinter');
    
    const printersWithDefault = printers.map(p => ({
      ...p,
      is_default: defaultPrinter && p.name === defaultPrinter.name
    }));
    
    res.json(printersWithDefault);
  } catch (error) {
    logger.error('Erro em /printers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /printers/connect
 * Seleciona impressora padrão
 */
app.post('/printers/connect', async (req, res) => {
  try {
    const { name, port } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome da impressora é obrigatório' 
      });
    }
    
    // Verificar se impressora existe
    const available = await printerManager.isPrinterAvailable(name);
    
    if (!available) {
      return res.status(404).json({ 
        success: false, 
        error: 'Impressora não encontrada ou offline' 
      });
    }
    
    // Salvar como padrão
    const printerConfig = {
      name,
      port: port || null,
      connectedAt: new Date().toISOString()
    };
    config.set('defaultPrinter', printerConfig);
    logger.info(`Impressora padrão definida: ${name}`);
    
    res.json({ 
      success: true, 
      message: 'Impressora conectada e salva como padrão',
      printer: printerConfig
    });
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
    const { pedido, template = 'cozinha', copies = 1, cut = true, empresa = {}, config: printConfig = {} } = req.body;
    
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
    
    // Log dos dados recebidos para debug
    logger.info(`Dados empresa recebidos: ${JSON.stringify(empresa)}`);
    logger.info(`Dados config recebidos: ${JSON.stringify(printConfig)}`);
    
    // Criar job de impressão com empresa e config
    const jobId = uuidv4();
    const job = {
      id: jobId,
      pedido,
      template,
      copies,
      cut,
      empresa,
      config: printConfig,
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
      .setBold(true)
      .text('=== TESTE ===')
      .setBold(false)
      .setTextSize(1, 1)
      .newLine()
      .setTextSize(1, 2)
      .text('Nucleo Print Connector')
      .text(`Versao: ${VERSION}`)
      .setTextSize(1, 1)
      .newLine()
      .separator()
      .align('left')
      .setTextSize(1, 2)
      .text(`Impressora: ${defaultPrinter.name}`)
      .setTextSize(1, 1)
      .text(`Data: ${new Date().toLocaleString('pt-BR')}`)
      .text(`Papel: 80mm (72mm imprimivel)`)
      .separator()
      .align('center')
      .text('Caracteres PT-BR:')
      .setTextSize(1, 2)
      .text('AEIOU aeiou Cc')
      .setTextSize(1, 1)
      .separator()
      .align('left')
      .setTextSize(1, 2)
      .text('2x Item Teste 1      R$20,00')
      .text('1x Item Teste 2      R$15,00')
      .setTextSize(1, 1)
      .text('  -> Com observacao')
      .separator()
      .setTextSize(2, 2)
      .setBold(true)
      .align('center')
      .text('TOTAL: R$35,00')
      .setBold(false)
      .setTextSize(1, 1)
      .separator()
      .align('center')
      .setTextSize(1, 2)
      .text('Impressao OK!')
      .setTextSize(1, 1)
      .newLine(2)
      .cut()
      .build();
    
    // Imprimir diretamente
    const result = await printerManager.printRaw(defaultPrinter.name, testData);
    
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
 * Lista jobs na fila
 */
app.get('/queue', (req, res) => {
  res.json(printQueue.getJobs());
});

/**
 * GET /logs
 * Últimos 200 eventos
 */
app.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 200;
  res.json(logger.getLogs(limit));
});

/**
 * GET /config
 * Configuração atual
 */
app.get('/config', (req, res) => {
  res.json({
    defaultPrinter: config.get('defaultPrinter'),
    paperWidth: 80,
    printableWidth: 72,
    dpi: 203,
    maxColumns: 48,
    codepage: 'CP850'
  });
});

// ==================== INICIALIZAÇÃO ====================

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       NÚCLEO PRINT CONNECTOR v${VERSION}              ║
╠══════════════════════════════════════════════════════╣
║  Servidor: http://127.0.0.1:${PORT}                    ║
║  Status: ONLINE                                      ║
║                                                      ║
║  Endpoints:                                          ║
║    GET  /health    - Status do serviço               ║
║    GET  /printers  - Listar impressoras              ║
║    POST /printers/connect - Selecionar impressora    ║
║    POST /print     - Imprimir pedido                 ║
║    POST /test      - Página de teste                 ║
╚══════════════════════════════════════════════════════╝
  `);
  
  logger.info(`Print Connector iniciado na porta ${PORT}`);
  printQueue.startProcessing();
  
  const defaultPrinter = config.get('defaultPrinter');
  if (defaultPrinter) {
    logger.info(`Impressora padrão: ${defaultPrinter.name}`);
  } else {
    logger.warn('Nenhuma impressora padrão configurada');
    console.log('\n⚠️  Configure uma impressora padrão via /printers/connect\n');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Encerrando Print Connector...');
  printQueue.stopProcessing();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Encerrando Print Connector...');
  printQueue.stopProcessing();
  server.close();
  process.exit(0);
});
