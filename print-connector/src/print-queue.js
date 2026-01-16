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
    
    if (template === 'cozinha' || template === 'preparo') {
      return this._buildPreparoTemplate(escpos, pedido, job);
    }
    return this._buildCaixaTemplate(escpos, pedido, job);
  }
  
  // ==================== CUPOM DE PREPARO ====================
  // Mostra: CÓDIGO, HORA, ITENS, OBSERVAÇÃO, Nome do cliente
  _buildPreparoTemplate(escpos, pedido, job) {
    // ===== 8 LINHAS EM BRANCO NO INÍCIO =====
    escpos
      .newLine()
      .newLine()
      .newLine()
      .newLine()
      .newLine()
      .newLine()
      .newLine()
      .newLine();
    
    escpos.align('center');
    
    // ===== TÍTULO =====
    escpos
      .setTextSize(2, 2)
      .setBold(true)
      .text('** PREPARO **')
      .setBold(false)
      .setTextSize(1, 1)
      .newLine();
    
    // ===== CÓDIGO DO PEDIDO (BEM GRANDE) =====
    const codigoPedido = String(pedido.codigo || '00001').padStart(5, '0');
    escpos
      .setTextSize(3, 3)
      .setBold(true)
      .text(`#${codigoPedido}`)
      .setBold(false)
      .setTextSize(1, 1);
    
    // ===== HORA =====
    const dataHora = new Date(pedido.created_at || Date.now());
    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    escpos
      .setTextSize(2, 2)
      .text(horaStr)
      .setTextSize(1, 1);
    
    escpos.separator();
    
    // ===== NOME DO CLIENTE =====
    if (pedido.cliente_nome) {
      escpos
        .align('center')
        .setTextSize(1, 2)
        .setBold(true)
        .text(`CLIENTE: ${pedido.cliente_nome}`)
        .setBold(false)
        .setTextSize(1, 1);
    }
    
    escpos.separator();
    
    // ===== ITENS =====
    escpos
      .align('center')
      .setBold(true)
      .text('-- ITENS --')
      .setBold(false)
      .align('left')
      .newLine();
    
    if (pedido.items && pedido.items.length > 0) {
      for (let i = 0; i < pedido.items.length; i++) {
        const item = pedido.items[i];
        const qtd = item.quantidade || 1;
        const nome = item.nome || item.product_name || 'Item';
        const tipo = item.combo_type || item.tipo_combo || item.tipo || '';
        const isCombo = tipo && tipo.toLowerCase() === 'combo';
        
        // Item com quantidade grande + tipo ao lado
        escpos
          .setTextSize(2, 2)
          .setBold(true)
          .text(`${qtd}x ${nome}${isCombo ? ' -> COMBO' : ''}`)
          .setBold(false)
          .setTextSize(1, 1);
        
        // Se for combo, mostrar etapas (bebidas, batatas, adicionais)
        if (isCombo && item.etapas && item.etapas.length > 0) {
          for (const etapa of item.etapas) {
            // Cada etapa tem um array de itens
            if (etapa.itens && etapa.itens.length > 0) {
              for (const subItem of etapa.itens) {
                escpos
                  .setTextSize(2, 2)
                  .setBold(true)
                  .text(`  -> ${subItem}`)
                  .setBold(false)
                  .setTextSize(1, 1);
              }
            }
          }
        }
        
        // Fallback: subitems antigo (para compatibilidade)
        if (isCombo && item.subitems && item.subitems.length > 0) {
          for (const sub of item.subitems) {
            const subNome = sub.nome || sub.name || sub;
            escpos
              .setTextSize(2, 2)
              .setBold(true)
              .text(`  -> ${subNome}`)
              .setBold(false)
              .setTextSize(1, 1);
          }
        }
        
        // Fallback: adicionais antigo (para compatibilidade)
        if (item.adicionais && item.adicionais.length > 0) {
          for (const add of item.adicionais) {
            const addNome = add.nome || add.name || add;
            escpos
              .setTextSize(2, 2)
              .setBold(true)
              .text(`  -> ${addNome}`)
              .setBold(false)
              .setTextSize(1, 1);
          }
        }
        
        // Observação do item principal (destacada)
        if (item.observacao) {
          escpos
            .setTextSize(1, 2)
            .setBold(true)
            .text(`      >>> ${item.observacao}`)
            .setBold(false)
            .setTextSize(1, 1);
        }
        
        // Linha separadora entre itens (exceto no último)
        if (i < pedido.items.length - 1) {
          escpos.text('--------------------------');
        }
      }
    }
    
    escpos.separator();
    
    // ===== RODAPÉ =====
    escpos
      .align('center')
      .text(new Date().toLocaleString('pt-BR'));
    
    if (job.cut !== false) escpos.cut();
    return escpos.build();
  }
  
  // ==================== CUPOM DE ENTREGA/CAIXA ====================
  _buildCaixaTemplate(escpos, pedido, job) {
    // ===== LAYOUT SEGUINDO ESBOÇO DO CLIENTE =====
    // Obtém dados da empresa do job ou do pedido
    const empresa = job.empresa || {};
    const config = job.config || {};
    
    // DEBUG - Log dos dados recebidos
    console.log('=== DEBUG IMPRESSAO ===');
    console.log('job.empresa:', JSON.stringify(job.empresa));
    console.log('empresa.nome:', empresa.nome);
    console.log('empresa.slogan:', empresa.slogan);
    console.log('empresa.endereco:', empresa.endereco);
    console.log('empresa.cnpj:', empresa.cnpj);
    console.log('========================');
    
    // ===== CABEÇALHO CENTRALIZADO =====
    escpos.align('center');
    
    // Logo (texto placeholder - impressoras térmicas não suportam imagens facilmente)
    escpos
      .setTextSize(2, 2)
      .text('[LOGO]')
      .setTextSize(1, 1);
    
    // ===== NOME DA EMPRESA =====
    const nomeEmpresa = empresa.nome || pedido.empresa_nome || 'NOME DA EMPRESA';
    escpos
      .setTextSize(2, 1)
      .setBold(true)
      .text(nomeEmpresa)
      .setBold(false)
      .setTextSize(1, 1);
    
    // Slogan - SEMPRE imprime se existir
    const slogan = empresa.slogan || pedido.empresa_slogan || '';
    if (slogan && slogan.trim() !== '') {
      escpos.text(slogan);
    }
    
    // Endereço - SEMPRE imprime se existir
    const endereco = empresa.endereco || pedido.empresa_endereco || '';
    if (endereco && endereco.trim() !== '') {
      escpos.text(endereco);
    }
    
    // CNPJ - SEMPRE imprime se existir
    const cnpj = empresa.cnpj || pedido.empresa_cnpj || '';
    if (cnpj && cnpj.trim() !== '') {
      escpos.text(`CNPJ: ${cnpj}`);
    }
    
    escpos.separator();
    
    // ===== NÚMERO DO PEDIDO (3x MAIOR E NEGRITO) =====
    const codigoPedido = String(pedido.codigo || '00001').padStart(5, '0');
    escpos
      .align('center')
      .setTextSize(3, 3)
      .setBold(true)
      .text(`#${codigoPedido}`)
      .setBold(false)
      .setTextSize(1, 1);
    
    // ===== DATA/HORA (CENTRALIZADA abaixo do código) =====
    const dataHora = new Date(pedido.created_at || Date.now());
    const dataStr = dataHora.toLocaleDateString('pt-BR');
    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    escpos
      .align('center')
      .text(`${dataStr}, ${horaStr}`)
      .align('left');
    
    // ===== ITENS DO PEDIDO =====
    escpos
      .separator()
      .align('center')
      .setBold(true)
      .text('-- ITENS DO PEDIDO --')
      .setBold(false)
      .align('left');
    
    // Cabeçalho da tabela
    escpos.columns('QTD  PRECO  ITEM', 'TOTAL');
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
        const nomeStr = (item.nome || item.product_name || 'Item').substring(0, 16);
        const totalStr = `R$${itemTotal.toFixed(2)}`;
        const tipo = item.combo_type || item.tipo_combo || '';
        const isCombo = tipo && tipo.toLowerCase() === 'combo';
        
        // Item e total na mesma linha (com indicação de COMBO)
        escpos.columns(`${qtdStr} x ${precoStr} ${nomeStr}${isCombo ? ' [COMBO]' : ''}`, totalStr);
        
        // Se for combo, mostrar etapas (bebidas, batatas, adicionais)
        if (isCombo && item.etapas && item.etapas.length > 0) {
          for (const etapa of item.etapas) {
            if (etapa.itens && etapa.itens.length > 0) {
              for (const subItem of etapa.itens) {
                escpos.text(`  -> ${subItem}`);
              }
            }
          }
        }
        
        // Fallback: subitens antigo (para compatibilidade)
        if (item.subitems && item.subitems.length > 0) {
          for (const sub of item.subitems) {
            const subNome = sub.nome || sub.name || sub;
            const subPreco = sub.preco > 0 ? ` (+R$${sub.preco.toFixed(2)})` : '';
            escpos.text(`  -> ${subNome}${subPreco}`);
          }
        }
        
        // Fallback: adicionais antigo (para compatibilidade)
        if (item.adicionais && item.adicionais.length > 0) {
          for (const add of item.adicionais) {
            const addNome = add.nome || add.name || add;
            const addPreco = add.preco > 0 ? ` (+R$${add.preco.toFixed(2)})` : '';
            escpos.text(`  -> ${addNome}${addPreco}`);
          }
        }
        
        // Observação do item
        if (item.observacao) {
          escpos.text(`  >>> ${item.observacao}`);
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
      .newLine()
      .setTextSize(2, 2)
      .text(`TOTAL ..... R$${(pedido.total || 0).toFixed(2).replace('.', ',')}`)
      .setTextSize(1, 1)
      .setBold(false);
    
    if (pedido.forma_pagamento) {
      escpos.text(`PAGAMENTO: ${pedido.forma_pagamento}`);
    }
    
    if (pedido.troco_precisa && pedido.troco_valor) {
      escpos.text(`TROCO PARA: R$ ${pedido.troco_valor.toFixed(2)}`);
    }
    
    // ===== INFORMAÇÕES DE ENTREGA (NEGRITO, ALTURA 2x, COM QUEBRA DE LINHA) =====
    if (pedido.tipo_entrega === 'delivery') {
      escpos
        .separator()
        .align('center')
        .setBold(true)
        .text('-- INFORMACOES DE ENTREGA --')
        .setBold(false)
        .align('left')
        .setTextSize(1, 2)
        .setBold(true);
      
      // Com texto altura 2x, usar 48 colunas (largura normal)
      if (pedido.cliente_nome) {
        escpos.wrapText(`CLIENTE: ${pedido.cliente_nome}`, 48);
      }
      if (pedido.cliente_telefone) {
        escpos.wrapText(`TEL: ${pedido.cliente_telefone}`, 48);
      }
      if (pedido.endereco_rua) {
        const enderecoCompleto = `END: ${pedido.endereco_rua}${pedido.endereco_numero ? ', ' + pedido.endereco_numero : ''}`;
        escpos.wrapText(enderecoCompleto, 48);
      }
      if (pedido.endereco_bairro) {
        escpos.wrapText(`BAIRRO: ${pedido.endereco_bairro}`, 48);
      }
      if (pedido.endereco_complemento) {
        escpos.wrapText(`REF: ${pedido.endereco_complemento}`, 48);
      }
      
      escpos
        .setBold(false)
        .setTextSize(1, 1);
    } else if (pedido.tipo_entrega === 'retirada' || pedido.tipo_entrega === 'pickup') {
      escpos
        .separator()
        .align('center')
        .setBold(true)
        .text('-- RETIRADA NO LOCAL --')
        .setBold(false)
        .setTextSize(1, 2)
        .setBold(true);
      
      if (pedido.cliente_nome) {
        escpos.wrapText(`CLIENTE: ${pedido.cliente_nome}`, 48);
      }
      if (pedido.cliente_telefone) {
        escpos.wrapText(`TEL: ${pedido.cliente_telefone}`, 48);
      }
      
      escpos
        .setBold(false)
        .setTextSize(1, 1);
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
      .doubleSeparator()
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
