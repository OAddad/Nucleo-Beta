/**
 * Print Queue
 * Fila de impressão com retry automático e backoff
 */

const ESCPOSBuilder = require('./escpos-builder');

class PrintQueue {
  constructor(printerManager, logger, config) {
    this.printerManager = printerManager;
    this.logger = logger;
    this.config = config;
    
    this.queue = [];
    this.processing = false;
    this.paused = false;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.maxRetryDelay = 30000;
    
    this.completedJobs = [];
    this.failedJobs = [];
    
    this._loadQueue();
  }
  
  addJob(job) {
    job.status = 'pending';
    job.attempts = 0;
    job.addedAt = new Date().toISOString();
    this.queue.push(job);
    this._saveQueue();
    this.logger.info(`Job adicionado: ${job.id}`);
    
    if (!this.processing && !this.paused) {
      this._processNext();
    }
  }
  
  getJobs() {
    return {
      pending: this.queue,
      completed: this.completedJobs.slice(-20),
      failed: this.failedJobs.slice(-20),
      stats: {
        pending_count: this.queue.length,
        completed_count: this.completedJobs.length,
        failed_count: this.failedJobs.length,
        is_processing: this.processing,
        is_paused: this.paused
      }
    };
  }
  
  getQueueSize() {
    return this.queue.length;
  }
  
  startProcessing() {
    this.logger.info('Processamento de fila iniciado');
    if (this.queue.length > 0 && !this.processing && !this.paused) {
      this._processNext();
    }
  }
  
  stopProcessing() {
    this.processing = false;
    this.logger.info('Processamento de fila parado');
  }
  
  async _processNext() {
    if (this.paused || this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const job = this.queue[0];
    
    try {
      job.status = 'printing';
      job.attempts++;
      job.lastAttempt = new Date().toISOString();
      
      this.logger.info(`Processando job ${job.id} (tentativa ${job.attempts})`);
      
      const escposData = this._buildESCPOS(job);
      const result = await this.printerManager.printRaw(job.printer.name, escposData);
      
      if (result.success) {
        job.status = 'success';
        job.completedAt = new Date().toISOString();
        this.queue.shift();
        this.completedJobs.push(job);
        
        if (this.completedJobs.length > 50) {
          this.completedJobs = this.completedJobs.slice(-50);
        }
        
        this._saveQueue();
        this.logger.info(`Job ${job.id} impresso com sucesso`);
        
        // Múltiplas cópias
        for (let i = 1; i < job.copies; i++) {
          await this._delay(500);
          await this.printerManager.printRaw(job.printer.name, escposData);
          this.logger.info(`Job ${job.id} cópia ${i + 1}/${job.copies}`);
        }
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      this.logger.error(`Erro no job ${job.id}: ${error.message}`);
      
      if (job.attempts < this.maxRetries) {
        job.status = 'pending';
        job.error = error.message;
        
        const delay = Math.min(
          this.retryDelay * Math.pow(2, job.attempts - 1),
          this.maxRetryDelay
        );
        
        this.logger.info(`Retry do job ${job.id} em ${delay}ms`);
        await this._delay(delay);
      } else {
        job.status = 'error';
        job.error = error.message;
        job.failedAt = new Date().toISOString();
        
        this.queue.shift();
        this.failedJobs.push(job);
        
        if (this.failedJobs.length > 50) {
          this.failedJobs = this.failedJobs.slice(-50);
        }
        
        this._saveQueue();
        this.logger.error(`Job ${job.id} falhou após ${this.maxRetries} tentativas`);
      }
    }
    
    setTimeout(() => this._processNext(), 100);
  }
  
  _buildESCPOS(job) {
    const { pedido, template } = job;
    const escpos = new ESCPOSBuilder();
    
    escpos.initialize().setCodepage('CP850');
    
    if (template === 'cozinha') {
      return this._buildCozinhaTemplate(escpos, pedido, job);
    }
    return this._buildCaixaTemplate(escpos, pedido, job);
  }
  
  _buildCozinhaTemplate(escpos, pedido, job) {
    escpos
      .align('center')
      .setTextSize(2, 2)
      .text('*** COZINHA ***')
      .setTextSize(1, 1)
      .newLine();
    
    if (pedido.codigo) {
      escpos.setTextSize(2, 2).setBold(true)
        .text(`#${pedido.codigo}`)
        .setBold(false).setTextSize(1, 1);
    }
    
    if (pedido.tipo_entrega) {
      escpos.setInverse(true)
        .text(` ${pedido.tipo_entrega.toUpperCase()} `)
        .setInverse(false);
    }
    
    escpos.separator().align('left');
    
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        escpos.setBold(true).text(`${item.quantidade}x ${item.nome}`).setBold(false);
        if (item.observacao) escpos.text(`   -> ${item.observacao}`);
        if (item.adicionais) {
          for (const add of item.adicionais) {
            escpos.text(`   + ${add.nome}`);
          }
        }
      }
    }
    
    escpos.separator();
    
    if (pedido.observacao) {
      escpos.text('OBS:').wrapText(pedido.observacao).separator();
    }
    
    escpos.align('center').text(new Date().toLocaleString('pt-BR'));
    
    if (job.cut !== false) escpos.cut();
    return escpos.build();
  }
  
  _buildCaixaTemplate(escpos, pedido, job) {
    escpos
      .align('center')
      .setTextSize(2, 1)
      .text(pedido.empresa_nome || 'PEDIDO')
      .setTextSize(1, 1);
    
    if (pedido.empresa_endereco) escpos.text(pedido.empresa_endereco);
    if (pedido.empresa_telefone) escpos.text(pedido.empresa_telefone);
    
    escpos.doubleSeparator();
    
    if (pedido.codigo) {
      escpos.setTextSize(2, 2).setBold(true)
        .text(`PEDIDO #${pedido.codigo}`)
        .setBold(false).setTextSize(1, 1);
    }
    
    escpos.text(new Date(pedido.created_at || Date.now()).toLocaleString('pt-BR'))
      .separator().align('left');
    
    if (pedido.cliente_nome) escpos.text(`Cliente: ${pedido.cliente_nome}`);
    if (pedido.cliente_telefone) escpos.text(`Tel: ${pedido.cliente_telefone}`);
    
    if (pedido.tipo_entrega === 'delivery' && pedido.endereco_rua) {
      escpos.separator().setBold(true).text('ENTREGA:').setBold(false);
      let end = pedido.endereco_rua;
      if (pedido.endereco_numero) end += `, ${pedido.endereco_numero}`;
      escpos.text(end);
      if (pedido.endereco_bairro) escpos.text(pedido.endereco_bairro);
      if (pedido.endereco_complemento) escpos.text(pedido.endereco_complemento);
    } else if (pedido.tipo_entrega === 'retirada') {
      escpos.separator().setInverse(true).align('center')
        .text(' RETIRADA NO LOCAL ').setInverse(false).align('left');
    }
    
    escpos.separator().setBold(true).text('ITENS:').setBold(false);
    
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const preco = ((item.preco_unitario || 0) * (item.quantidade || 1)).toFixed(2);
        escpos.columns(`${item.quantidade}x ${item.nome}`, `R$ ${preco}`);
        if (item.observacao) escpos.text(`   -> ${item.observacao}`);
        if (item.adicionais) {
          for (const add of item.adicionais) {
            if (add.preco) {
              escpos.columns(`   + ${add.nome}`, `R$ ${add.preco.toFixed(2)}`);
            } else {
              escpos.text(`   + ${add.nome}`);
            }
          }
        }
      }
    }
    
    escpos.separator();
    
    if (pedido.subtotal) escpos.columns('Subtotal:', `R$ ${pedido.subtotal.toFixed(2)}`);
    if (pedido.valor_entrega > 0) escpos.columns('Taxa entrega:', `R$ ${pedido.valor_entrega.toFixed(2)}`);
    if (pedido.desconto > 0) escpos.columns('Desconto:', `-R$ ${pedido.desconto.toFixed(2)}`);
    
    escpos.separator().setBold(true).setTextSize(1, 2)
      .columns('TOTAL:', `R$ ${(pedido.total || 0).toFixed(2)}`)
      .setTextSize(1, 1).setBold(false);
    
    if (pedido.forma_pagamento) {
      escpos.separator().text(`Pagamento: ${pedido.forma_pagamento}`);
      if (pedido.troco_para) escpos.text(`Troco para: R$ ${pedido.troco_para.toFixed(2)}`);
    }
    
    if (pedido.observacao) {
      escpos.separator().setBold(true).text('OBSERVAÇÕES:').setBold(false)
        .wrapText(pedido.observacao);
    }
    
    escpos.separator().align('center')
      .text(pedido.mensagem_rodape || 'Obrigado pela preferência!')
      .newLine();
    
    if (job.cut !== false) escpos.cut();
    return escpos.build();
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  _saveQueue() {
    try {
      this.config.set('printQueue', {
        queue: this.queue,
        failedJobs: this.failedJobs
      });
    } catch (error) {
      this.logger.error('Erro ao salvar fila:', error.message);
    }
  }
  
  _loadQueue() {
    try {
      const saved = this.config.get('printQueue');
      if (saved) {
        this.queue = saved.queue || [];
        this.failedJobs = saved.failedJobs || [];
        if (this.queue.length > 0) {
          this.logger.info(`Fila restaurada: ${this.queue.length} jobs pendentes`);
        }
      }
    } catch (error) {
      this.logger.error('Erro ao carregar fila:', error.message);
    }
  }
}

module.exports = PrintQueue;
