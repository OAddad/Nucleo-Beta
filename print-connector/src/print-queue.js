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
    
    this.queue = [];           // Jobs pendentes
    this.processing = false;   // Flag de processamento
    this.paused = false;       // Pausa manual
    this.maxRetries = 3;       // Máximo de tentativas
    this.retryDelay = 2000;    // Delay inicial (ms)
    this.maxRetryDelay = 30000; // Delay máximo (ms)
    
    this.completedJobs = [];   // Jobs concluídos (últimos 50)
    this.failedJobs = [];      // Jobs com erro (últimos 50)
    
    // Carregar fila persistida
    this._loadQueue();
  }
  
  /**
   * Adiciona job à fila
   */
  addJob(job) {
    job.status = 'pending';
    job.attempts = 0;
    job.addedAt = new Date().toISOString();
    
    this.queue.push(job);
    this._saveQueue();
    
    this.logger.info(`Job adicionado: ${job.id}`);
    
    // Iniciar processamento se não estiver rodando
    if (!this.processing && !this.paused) {
      this._processNext();
    }
  }
  
  /**
   * Remove job da fila
   */
  removeJob(jobId) {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this._saveQueue();
      this.logger.info(`Job removido: ${jobId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Retenta job com erro
   */
  retryJob(jobId) {
    // Buscar em failedJobs
    const index = this.failedJobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const job = this.failedJobs.splice(index, 1)[0];
      job.status = 'pending';
      job.attempts = 0;
      job.error = null;
      this.queue.push(job);
      this._saveQueue();
      this.logger.info(`Job reenviado: ${jobId}`);
      
      if (!this.processing && !this.paused) {
        this._processNext();
      }
      return true;
    }
    return false;
  }
  
  /**
   * Lista todos os jobs
   */
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
  
  /**
   * Tamanho da fila
   */
  getQueueSize() {
    return this.queue.length;
  }
  
  /**
   * Limpa toda a fila
   */
  clearQueue() {
    this.queue = [];
    this._saveQueue();
    this.logger.info('Fila limpa');
  }
  
  /**
   * Pausa processamento
   */
  pause() {
    this.paused = true;
    this.logger.info('Fila pausada');
  }
  
  /**
   * Resume processamento
   */
  resume() {
    this.paused = false;
    this.logger.info('Fila resumida');
    if (!this.processing && this.queue.length > 0) {
      this._processNext();
    }
  }
  
  /**
   * Inicia loop de processamento
   */
  startProcessing() {
    this.logger.info('Processamento de fila iniciado');
    if (this.queue.length > 0 && !this.processing && !this.paused) {
      this._processNext();
    }
  }
  
  /**
   * Para processamento
   */
  stopProcessing() {
    this.processing = false;
    this.logger.info('Processamento de fila parado');
  }
  
  /**
   * Processa próximo job da fila
   */
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
      
      // Gerar dados ESC/POS
      const escposData = this._buildESCPOS(job);
      
      // Imprimir
      const result = await this.printerManager.printRaw(job.printer, escposData);
      
      if (result.success) {
        // Sucesso!
        job.status = 'success';
        job.completedAt = new Date().toISOString();
        
        // Remover da fila e adicionar aos concluídos
        this.queue.shift();
        this.completedJobs.push(job);
        
        // Limitar histórico
        if (this.completedJobs.length > 50) {
          this.completedJobs = this.completedJobs.slice(-50);
        }
        
        this._saveQueue();
        this.logger.info(`Job ${job.id} impresso com sucesso`);
        
        // Múltiplas cópias
        for (let i = 1; i < job.copies; i++) {
          await this._delay(500);
          await this.printerManager.printRaw(job.printer, escposData);
          this.logger.info(`Job ${job.id} cópia ${i + 1}/${job.copies}`);
        }
        
      } else {
        throw new Error(result.error || 'Erro desconhecido na impressão');
      }
      
    } catch (error) {
      this.logger.error(`Erro no job ${job.id}: ${error.message}`);
      
      if (job.attempts < this.maxRetries) {
        // Retry com backoff
        job.status = 'pending';
        job.error = error.message;
        
        const delay = Math.min(
          this.retryDelay * Math.pow(2, job.attempts - 1),
          this.maxRetryDelay
        );
        
        this.logger.info(`Retry do job ${job.id} em ${delay}ms`);
        await this._delay(delay);
        
      } else {
        // Máximo de tentativas atingido
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
    
    // Processar próximo
    setTimeout(() => this._processNext(), 100);
  }
  
  /**
   * Constrói dados ESC/POS a partir do job
   */
  _buildESCPOS(job) {
    const { pedido, template } = job;
    const escpos = new ESCPOSBuilder();
    
    escpos
      .initialize()
      .setCodepage('CP850');
    
    // Template COZINHA
    if (template === 'cozinha') {
      return this._buildCozinhaTemplate(escpos, pedido, job);
    }
    
    // Template CAIXA (padrão)
    return this._buildCaixaTemplate(escpos, pedido, job);
  }
  
  /**
   * Template para cozinha (simplificado)
   */
  _buildCozinhaTemplate(escpos, pedido, job) {
    escpos
      .align('center')
      .setTextSize(2, 2)
      .text('*** COZINHA ***')
      .setTextSize(1, 1)
      .newLine();
    
    // Código do pedido
    if (pedido.codigo) {
      escpos
        .setTextSize(2, 2)
        .setBold(true)
        .text(`#${pedido.codigo}`)
        .setBold(false)
        .setTextSize(1, 1);
    }
    
    // Tipo de entrega
    if (pedido.tipo_entrega) {
      const tipo = pedido.tipo_entrega.toUpperCase();
      escpos
        .setInverse(true)
        .text(` ${tipo} `)
        .setInverse(false);
    }
    
    escpos.separator();
    
    // Itens
    escpos.align('left');
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        escpos
          .setBold(true)
          .text(`${item.quantidade}x ${item.nome}`)
          .setBold(false);
        
        // Observação do item
        if (item.observacao) {
          escpos.text(`   -> ${item.observacao}`);
        }
        
        // Adicionais/etapas
        if (item.adicionais && item.adicionais.length > 0) {
          for (const add of item.adicionais) {
            escpos.text(`   + ${add.nome}`);
          }
        }
      }
    }
    
    escpos.separator();
    
    // Observação geral
    if (pedido.observacao) {
      escpos
        .text('OBS:')
        .wrapText(pedido.observacao);
      escpos.separator();
    }
    
    // Horário
    escpos
      .align('center')
      .text(new Date().toLocaleString('pt-BR'));
    
    if (job.cut !== false) {
      escpos.cut();
    }
    
    return escpos.build();
  }
  
  /**
   * Template para caixa (completo)
   */
  _buildCaixaTemplate(escpos, pedido, job) {
    // Cabeçalho
    escpos
      .align('center')
      .setTextSize(2, 1)
      .text(pedido.empresa_nome || 'PEDIDO')
      .setTextSize(1, 1);
    
    if (pedido.empresa_endereco) {
      escpos.text(pedido.empresa_endereco);
    }
    if (pedido.empresa_telefone) {
      escpos.text(pedido.empresa_telefone);
    }
    
    escpos.doubleSeparator();
    
    // Código e data
    if (pedido.codigo) {
      escpos
        .setTextSize(2, 2)
        .setBold(true)
        .text(`PEDIDO #${pedido.codigo}`)
        .setBold(false)
        .setTextSize(1, 1);
    }
    
    escpos
      .text(new Date(pedido.created_at || Date.now()).toLocaleString('pt-BR'))
      .separator();
    
    // Cliente
    escpos.align('left');
    if (pedido.cliente_nome) {
      escpos.text(`Cliente: ${pedido.cliente_nome}`);
    }
    if (pedido.cliente_telefone) {
      escpos.text(`Tel: ${pedido.cliente_telefone}`);
    }
    
    // Endereço de entrega
    if (pedido.tipo_entrega === 'delivery' && pedido.endereco_rua) {
      escpos.separator();
      escpos
        .setBold(true)
        .text('ENTREGA:')
        .setBold(false);
      
      let endereco = pedido.endereco_rua;
      if (pedido.endereco_numero) endereco += `, ${pedido.endereco_numero}`;
      escpos.text(endereco);
      
      if (pedido.endereco_bairro) {
        escpos.text(pedido.endereco_bairro);
      }
      if (pedido.endereco_complemento) {
        escpos.text(pedido.endereco_complemento);
      }
      if (pedido.endereco_referencia) {
        escpos.text(`Ref: ${pedido.endereco_referencia}`);
      }
    } else if (pedido.tipo_entrega === 'retirada') {
      escpos
        .separator()
        .setInverse(true)
        .align('center')
        .text(' RETIRADA NO LOCAL ')
        .setInverse(false)
        .align('left');
    }
    
    escpos.separator();
    
    // Itens
    escpos
      .setBold(true)
      .text('ITENS:')
      .setBold(false);
    
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const preco = (item.preco_unitario * item.quantidade).toFixed(2);
        escpos.columns(
          `${item.quantidade}x ${item.nome}`,
          `R$ ${preco}`
        );
        
        if (item.observacao) {
          escpos.text(`   -> ${item.observacao}`);
        }
        
        if (item.adicionais && item.adicionais.length > 0) {
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
    
    // Totais
    if (pedido.subtotal) {
      escpos.columns('Subtotal:', `R$ ${pedido.subtotal.toFixed(2)}`);
    }
    if (pedido.valor_entrega && pedido.valor_entrega > 0) {
      escpos.columns('Taxa de entrega:', `R$ ${pedido.valor_entrega.toFixed(2)}`);
    }
    if (pedido.desconto && pedido.desconto > 0) {
      escpos.columns('Desconto:', `-R$ ${pedido.desconto.toFixed(2)}`);
    }
    
    escpos
      .separator()
      .setBold(true)
      .setTextSize(1, 2)
      .columns('TOTAL:', `R$ ${(pedido.total || 0).toFixed(2)}`)
      .setTextSize(1, 1)
      .setBold(false);
    
    // Forma de pagamento
    if (pedido.forma_pagamento) {
      escpos
        .separator()
        .text(`Pagamento: ${pedido.forma_pagamento}`);
      
      if (pedido.troco_para && pedido.forma_pagamento.toLowerCase().includes('dinheiro')) {
        escpos.text(`Troco para: R$ ${pedido.troco_para.toFixed(2)}`);
      }
    }
    
    // Observação
    if (pedido.observacao) {
      escpos
        .separator()
        .setBold(true)
        .text('OBSERVAÇÕES:')
        .setBold(false)
        .wrapText(pedido.observacao);
    }
    
    // Rodapé
    escpos
      .separator()
      .align('center')
      .text(pedido.mensagem_rodape || 'Obrigado pela preferência!')
      .newLine();
    
    if (job.cut !== false) {
      escpos.cut();
    }
    
    return escpos.build();
  }
  
  /**
   * Delay helper
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Salva fila no disco
   */
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
  
  /**
   * Carrega fila do disco
   */
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
