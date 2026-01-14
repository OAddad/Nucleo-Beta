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
    // CAIXA/ENTREGA - Layout estilo cupom profissional
    
    // ===== CABEÇALHO =====
    escpos.align('center');
    
    // Nome da empresa
    if (pedido.empresa_nome) {
      escpos
        .setTextSize(2, 2)
        .setBold(true)
        .text(pedido.empresa_nome)
        .setBold(false)
        .setTextSize(1, 1);
    }
    
    // Slogan (se houver)
    if (pedido.empresa_slogan) {
      escpos.text(pedido.empresa_slogan);
    }
    
    // Endereço
    if (pedido.empresa_endereco) {
      escpos.text(pedido.empresa_endereco);
    }
    
    // CNPJ
    if (pedido.empresa_cnpj) {
      escpos.text(`CNPJ: ${pedido.empresa_cnpj}`);
    }
    
    // Cidade
    if (pedido.empresa_cidade) {
      escpos.text(pedido.empresa_cidade);
    }
    
    // Data e Pedido na mesma linha
    escpos.align('left');
    const dataStr = new Date(pedido.created_at || Date.now()).toLocaleString('pt-BR');
    const pedidoStr = pedido.codigo ? `Pedido: ${pedido.codigo}` : '';
    if (pedidoStr) {
      escpos.columns(`Data: ${dataStr}`, pedidoStr);
    } else {
      escpos.text(`Data: ${dataStr}`);
    }
    
    escpos.separator();
    
    // ===== TÍTULO DO RELATÓRIO =====
    let tituloRelatorio = 'Relatorio';
    if (pedido.tipo_entrega === 'delivery') {
      tituloRelatorio = 'Relatorio para Entrega';
    } else if (pedido.tipo_entrega === 'retirada') {
      tituloRelatorio = 'Relatorio para Retirada';
    } else if (pedido.tipo_entrega === 'mesa') {
      tituloRelatorio = `Relatorio Mesa ${pedido.mesa || ''}`;
    }
    
    escpos
      .align('center')
      .setTextSize(1, 2)
      .text(tituloRelatorio)
      .setTextSize(1, 1)
      .align('left');
    
    // ===== CABEÇALHO DA TABELA =====
    escpos.text('Descricao              Preco Qtd  Total');
    escpos.separator();
    
    // ===== ITENS =====
    if (pedido.items && pedido.items.length > 0) {
      for (const item of pedido.items) {
        const nome = (item.nome || '').substring(0, 22).padEnd(22);
        const preco = (item.preco_unitario || 0).toFixed(2).padStart(6);
        const qtd = String(item.quantidade || 1).padStart(3);
        const total = ((item.preco_unitario || 0) * (item.quantidade || 1)).toFixed(2).padStart(6);
        
        escpos.text(`${nome}${preco}${qtd}${total}`);
        
        // Observação do item
        if (item.observacao) {
          escpos.text(`  -> ${item.observacao}`);
        }
        
        // Adicionais
        if (item.adicionais && item.adicionais.length > 0) {
          for (const add of item.adicionais) {
            if (add.preco && add.preco > 0) {
              const addNome = `  + ${add.nome}`.substring(0, 22).padEnd(22);
              const addPreco = add.preco.toFixed(2).padStart(6);
              escpos.text(`${addNome}${addPreco}  1${addPreco}`);
            } else {
              escpos.text(`  + ${add.nome}`);
            }
          }
        }
      }
    }
    
    escpos.separator();
    
    // ===== TOTAIS =====
    const pontilhado = (label, valor) => {
      const pontos = '.'.repeat(Math.max(2, 38 - label.length - valor.length));
      return `${label}${pontos}${valor}`;
    };
    
    if (pedido.subtotal) {
      escpos.text(pontilhado('Produtos', `R$ ${pedido.subtotal.toFixed(2)}`));
    }
    
    if (pedido.valor_entrega && pedido.valor_entrega > 0) {
      escpos.text(pontilhado('Entrega', `R$ ${pedido.valor_entrega.toFixed(2)}`));
    }
    
    if (pedido.desconto && pedido.desconto > 0) {
      escpos.text(pontilhado('Desconto', `-R$ ${pedido.desconto.toFixed(2)}`));
    }
    
    // TOTAL destacado
    escpos
      .newLine()
      .setTextSize(1, 2)
      .setBold(true)
      .text(pontilhado('Total', `R$ ${(pedido.total || 0).toFixed(2)}`))
      .setBold(false)
      .setTextSize(1, 1);
    
    // ===== FORMA DE PAGAMENTO =====
    if (pedido.forma_pagamento) {
      escpos.separator();
      escpos
        .align('center')
        .text(`-- ${pedido.pagar_na_entrega ? 'Pagar na entrega' : 'Pagamento'} --`)
        .align('left');
      
      escpos.text(pontilhado(pedido.forma_pagamento, `R$ ${(pedido.total || 0).toFixed(2)}`));
      
      if (pedido.troco_para && pedido.troco_para > 0) {
        escpos.text(pontilhado('Troco para', `R$ ${pedido.troco_para.toFixed(2)}`));
        const troco = pedido.troco_para - (pedido.total || 0);
        if (troco > 0) {
          escpos.text(pontilhado('Troco', `R$ ${troco.toFixed(2)}`));
        }
      }
    }
    
    // A Pagar
    escpos
      .setTextSize(1, 2)
      .setBold(true)
      .text(pontilhado('A Pagar', `R$ ${(pedido.total || 0).toFixed(2)}`))
      .setBold(false)
      .setTextSize(1, 1);
    
    // Entregador
    if (pedido.entregador) {
      escpos.align('right').text(`Entregador(a): ${pedido.entregador}`).align('left');
    }
    
    // ===== INFORMAÇÕES PARA ENTREGA =====
    if (pedido.tipo_entrega === 'delivery' || pedido.cliente_nome) {
      escpos
        .separator()
        .align('center')
        .setTextSize(1, 2)
        .text('Informacoes para Entrega')
        .setTextSize(1, 1)
        .align('left')
        .newLine();
      
      if (pedido.cliente_nome) {
        escpos.text(`Cliente: ${pedido.cliente_nome}`);
      }
      
      if (pedido.cliente_telefone) {
        escpos.text(`Telefone: ${pedido.cliente_telefone}`);
      }
      
      // Endereço completo
      if (pedido.endereco_rua) {
        let endereco = `Endereco: ${pedido.endereco_rua}`;
        if (pedido.endereco_numero) endereco += `, No ${pedido.endereco_numero}`;
        escpos.wrapText(endereco);
        
        if (pedido.endereco_bairro) {
          escpos.text(`-${pedido.endereco_bairro}`);
        }
        
        if (pedido.endereco_complemento) {
          escpos.text(pedido.endereco_complemento);
        }
        
        if (pedido.endereco_referencia) {
          escpos.text(`Ref: ${pedido.endereco_referencia}`);
        }
      }
    }
    
    // ===== OBSERVAÇÃO GERAL =====
    if (pedido.observacao) {
      escpos
        .separator()
        .setBold(true)
        .text('Observacoes:')
        .setBold(false)
        .wrapText(pedido.observacao);
    }
    
    // ===== RODAPÉ =====
    escpos
      .separator()
      .align('center')
      .text(pedido.mensagem_rodape || 'NAO E DOCUMENTO FISCAL')
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
