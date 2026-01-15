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
    // COZINHA - Layout simplificado para produção
    escpos
      .align('center')
      .setTextSize(2, 2)
      .setBold(true)
      .text('** COZINHA **')
      .setBold(false)
      .setTextSize(1, 1)
      .newLine();
    
    // Código bem grande
    if (pedido.codigo) {
      escpos
        .setTextSize(3, 3)
        .setBold(true)
        .text(`#${pedido.codigo}`)
        .setBold(false)
        .setTextSize(1, 1);
    }
    
    // Tipo entrega destacado
    if (pedido.tipo_entrega) {
      escpos
        .newLine()
        .setTextSize(2, 2)
        .setInverse(true)
        .text(` ${pedido.tipo_entrega.toUpperCase()} `)
        .setInverse(false)
        .setTextSize(1, 1);
    }
    
    escpos.newLine().separator().align('left');
    
    // Itens
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        escpos
          .setTextSize(2, 2)
          .setBold(true)
          .text(`${item.quantidade}x ${item.nome}`)
          .setBold(false)
          .setTextSize(1, 1);
        
        if (item.observacao) {
          escpos.setTextSize(1, 2).text(`  -> ${item.observacao}`).setTextSize(1, 1);
        }
        if (item.adicionais) {
          for (const add of item.adicionais) {
            escpos.text(`  + ${add.nome}`);
          }
        }
        escpos.newLine();
      }
    }
    
    escpos.separator();
    
    // Observação geral
    if (pedido.observacao) {
      escpos
        .setTextSize(1, 2)
        .setBold(true)
        .text('OBS:')
        .setBold(false)
        .wrapText(pedido.observacao)
        .setTextSize(1, 1)
        .separator();
    }
    
    // Horário
    escpos
      .align('center')
      .text(new Date().toLocaleString('pt-BR'));
    
    if (job.cut !== false) escpos.cut();
    return escpos.build();
  }
  
  _buildCaixaTemplate(escpos, pedido, job) {
    // ===== LAYOUT SEGUINDO ESBOÇO DO CLIENTE =====
    // Obtém dados da empresa do job ou do pedido
    const empresa = job.empresa || {};
    const config = job.config || {};
    
    // ===== [LOGO] =====
    escpos.align('center');
    if (config.mostrar_logo) {
      escpos.text('[LOGO]');
    }
    
    // ===== NOME DA EMPRESA =====
    escpos
      .setTextSize(2, 1)
      .setBold(true)
      .text(empresa.nome || pedido.empresa_nome || 'NOME DA EMPRESA')
      .setBold(false)
      .setTextSize(1, 1);
    
    // Slogan
    if (empresa.slogan || pedido.empresa_slogan) {
      escpos.text(empresa.slogan || pedido.empresa_slogan);
    }
    
    // Endereço
    if (empresa.endereco || pedido.empresa_endereco) {
      escpos.text(empresa.endereco || pedido.empresa_endereco);
    }
    
    // CNPJ
    if (empresa.cnpj || pedido.empresa_cnpj) {
      escpos.text(`CNPJ: ${empresa.cnpj || pedido.empresa_cnpj}`);
    }
    
    escpos.separator();
    
    // ===== NÚMERO DO PEDIDO E DATA =====
    const dataHora = new Date(pedido.created_at || Date.now());
    const dataStr = dataHora.toLocaleDateString('pt-BR');
    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const codigoPedido = String(pedido.codigo || '00001').padStart(5, '0');
    
    escpos.align('left');
    escpos
      .setTextSize(2, 2)
      .setBold(true)
      .text(`#${codigoPedido}`)
      .setBold(false)
      .setTextSize(1, 1);
    
    escpos.align('right');
    escpos.text(`${dataStr}, ${horaStr}`);
    escpos.align('left');
    
    // ===== ITENS DO PEDIDO =====
    escpos
      .separator()
      .align('center')
      .setBold(true)
      .text('-- ITENS DO PEDIDO --')
      .setBold(false)
      .align('left');
    
    // Cabeçalho da tabela
    escpos.text('QTD  PRECO  ITEM                TOTAL');
    escpos.separator();
    
    // Itens
    let subtotalItens = 0;
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const qtd = item.quantidade || 1;
        const precoUnit = item.preco_unitario || item.preco || 0;
        const itemTotal = qtd * precoUnit;
        subtotalItens += itemTotal;
        
        const qtdStr = String(qtd);
        const precoStr = precoUnit.toFixed(2);
        const nomeStr = (item.nome || item.product_name || 'Item').substring(0, 18);
        const totalStr = `R$${itemTotal.toFixed(2)}`;
        
        escpos.text(`${qtdStr} x ${precoStr} ${nomeStr}`);
        escpos.align('right').text(totalStr).align('left');
        
        // Observação do item
        if (item.observacao) {
          escpos.text(`  - ${item.observacao}`);
        }
        
        // Subitens/Adicionais
        if (item.subitems && item.subitems.length > 0) {
          for (const sub of item.subitems) {
            const subNome = sub.nome || sub.name;
            const subPreco = sub.preco > 0 ? ` (+R$${sub.preco.toFixed(2)})` : '';
            escpos.text(`  + ${subNome}${subPreco}`);
          }
        }
        if (item.adicionais && item.adicionais.length > 0) {
          for (const add of item.adicionais) {
            const addPreco = add.preco > 0 ? ` (+R$${add.preco.toFixed(2)})` : '';
            escpos.text(`  + ${add.nome}${addPreco}`);
          }
        }
      }
    }
    
    escpos.separator();
    
    // ===== SUBTOTAIS =====
    if (pedido.valor_entrega && pedido.valor_entrega > 0) {
      escpos.columns('Taxa de Entrega:', `R$ ${pedido.valor_entrega.toFixed(2)}`);
    }
    
    if (pedido.desconto && pedido.desconto > 0) {
      escpos.columns('Desconto:', `-R$ ${pedido.desconto.toFixed(2)}`);
    }
    
    escpos
      .setBold(true)
      .columns('TOTAL:', `R$ ${(pedido.total || 0).toFixed(2)}`)
      .setBold(false);
    
    // ===== SEÇÃO DE PAGAMENTO =====
    escpos
      .separator()
      .align('center')
      .setBold(true)
      .text('-- PAGAR NA ENTREGA --')
      .setBold(false)
      .newLine()
      .setTextSize(2, 2)
      .setBold(true)
      .text(`TOTAL ....... R$${(pedido.total || 0).toFixed(2).replace('.', ',')}`)
      .setBold(false)
      .setTextSize(1, 1);
    
    if (pedido.forma_pagamento) {
      escpos.text(`PAGAMENTO: ${pedido.forma_pagamento}`);
    }
    
    if (pedido.troco_precisa && pedido.troco_valor) {
      escpos.text(`TROCO PARA: R$ ${pedido.troco_valor.toFixed(2)}`);
    }
    
    // ===== INFORMAÇÕES DE ENTREGA =====
    if (pedido.tipo_entrega === 'delivery') {
      escpos
        .separator()
        .align('center')
        .setBold(true)
        .text('-- INFORMACOES DE ENTREGA --')
        .setBold(false)
        .align('left');
      
      if (pedido.cliente_nome) {
        escpos.text(`CLIENTE: ${pedido.cliente_nome}`);
      }
      if (pedido.cliente_telefone) {
        escpos.text(`TEL: ${pedido.cliente_telefone}`);
      }
      if (pedido.endereco_rua) {
        const endereco = `${pedido.endereco_rua}${pedido.endereco_numero ? ', ' + pedido.endereco_numero : ''}`;
        escpos.text(`END: ${endereco}`);
      }
      if (pedido.endereco_bairro) {
        escpos.text(`BAIRRO: ${pedido.endereco_bairro}`);
      }
      if (pedido.endereco_complemento) {
        escpos.text(`REF: ${pedido.endereco_complemento}`);
      }
    } else if (pedido.tipo_entrega === 'retirada' || pedido.tipo_entrega === 'pickup') {
      escpos
        .separator()
        .align('center')
        .setBold(true)
        .text('-- RETIRADA NO LOCAL --')
        .setBold(false);
      
      if (pedido.cliente_nome) {
        escpos.text(`CLIENTE: ${pedido.cliente_nome}`);
      }
      if (pedido.cliente_telefone) {
        escpos.text(`TEL: ${pedido.cliente_telefone}`);
      }
    }
    
    // ===== OBSERVAÇÕES =====
    if (pedido.observacao) {
      escpos.separator();
      escpos.align('left').text(`OBS: ${pedido.observacao}`);
    }
    
    // ===== RODAPÉ =====
    escpos
      .newLine()
      .align('center')
      .text('================================')
      .setBold(true)
      .text(config.mensagem_rodape || 'NAO E DOCUMENTO FISCAL')
      .setBold(false);
    
    // Corte
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
