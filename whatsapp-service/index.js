const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;
const AUTH_SESSION_PATH = path.join(__dirname, 'auth_session');
const BACKEND_URL = 'http://localhost:8001';

let sock = null;
let currentQR = null;
let connectionStatus = 'disconnected';
let lastError = null;
let reconnecting = false;
let autoReplyEnabled = true;
let connectedPhone = null;  // Número conectado

// Estatísticas de atendimento
let stats = {
  clientsServed: new Set(),  // Set de números únicos atendidos
  messagesReceived: 0,
  messagesSent: 0
};

// Logger silencioso para Baileys
const logger = pino({ level: 'silent' });

// Armazenar mensagens recebidas (últimas 100)
let receivedMessages = [];
const MAX_MESSAGES = 100;

// Função para chamar a API de IA do backend
async function getAIResponse(phone, message, pushName) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chatbot/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        push_name: pushName || ''
      })
    });
    
    if (!response.ok) {
      console.log('[WhatsApp] Erro na API de IA:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.log('[WhatsApp] Erro ao chamar API de IA:', error.message);
    return null;
  }
}

// Função para enviar mensagem com efeito de digitação
async function sendMessageWithTyping(jid, message) {
  try {
    if (!sock || connectionStatus !== 'connected') {
      console.log('[WhatsApp] Não conectado, não pode enviar mensagem');
      return false;
    }
    
    console.log(`[WhatsApp] Iniciando envio para ${jid}...`);
    
    // Mostrar "digitando..."
    try {
      await sock.presenceSubscribe(jid);
      await sock.sendPresenceUpdate('composing', jid);
    } catch (presenceErr) {
      console.log('[WhatsApp] Aviso ao atualizar presença:', presenceErr.message);
      // Continua mesmo se falhar o presence
    }
    
    // Calcular tempo de digitação baseado no tamanho da mensagem (mais natural)
    const typingTime = Math.min(Math.max(message.length * 30, 1000), 4000);
    console.log(`[WhatsApp] Aguardando ${typingTime}ms de "digitação"...`);
    await new Promise(resolve => setTimeout(resolve, typingTime));
    
    // Enviar mensagem
    console.log('[WhatsApp] Enviando mensagem...');
    const result = await sock.sendMessage(jid, { text: message });
    console.log('[WhatsApp] Resultado do envio:', result?.key?.id ? 'OK' : 'Falha');
    
    // Incrementar contador de mensagens enviadas (memória)
    stats.messagesSent++;
    
    // Salvar estatística no banco de dados
    try {
      await fetch(`${BACKEND_URL}/api/whatsapp/stats/increment?stat_type=messages_sent&amount=1`, {
        method: 'POST'
      });
    } catch (e) {
      console.log('[WhatsApp] Erro ao salvar estatística de envio no banco:', e.message);
    }
    
    // Parar de "digitar"
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch (pauseErr) {
      // Ignora erro de presence
    }
    
    console.log(`[WhatsApp] Mensagem enviada para ${jid}`);
    return true;
  } catch (error) {
    console.log('[WhatsApp] Erro ao enviar mensagem:', error.message);
    console.log('[WhatsApp] Stack:', error.stack);
    return false;
  }
}

// Função para iniciar conexão WhatsApp
async function connectToWhatsApp() {
  try {
    if (reconnecting) return;
    reconnecting = true;
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: true,
      logger,
      browser: ['Nucleo ChatBot', 'Chrome', '1.0.0'],
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: true,
    });

    // Evento de atualização de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('[WhatsApp] QR Code recebido');
        currentQR = qr;
        connectionStatus = 'waiting_qr';
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('[WhatsApp] Conexão fechada. Status:', statusCode);
        
        if (statusCode === DisconnectReason.loggedOut) {
          connectionStatus = 'disconnected';
          currentQR = null;
          lastError = 'Deslogado do WhatsApp';
          // Limpar sessão
          if (fs.existsSync(AUTH_SESSION_PATH)) {
            fs.rmSync(AUTH_SESSION_PATH, { recursive: true, force: true });
            fs.mkdirSync(AUTH_SESSION_PATH, { recursive: true });
          }
          // SEMPRE reconectar para gerar novo QR Code
          console.log('[WhatsApp] Deslogado. Gerando novo QR Code em 2 segundos...');
          setTimeout(connectToWhatsApp, 2000);
        } else {
          connectionStatus = 'reconnecting';
          lastError = `Conexão perdida (código: ${statusCode})`;
          
          if (shouldReconnect) {
            console.log('[WhatsApp] Reconectando em 3 segundos...');
            setTimeout(connectToWhatsApp, 3000);
          }
        }
        
        reconnecting = false;
      } else if (connection === 'open') {
        console.log('[WhatsApp] Conectado com sucesso!');
        connectionStatus = 'connected';
        currentQR = null;
        lastError = null;
        reconnecting = false;
        
        // Obter número conectado
        try {
          if (sock && sock.user) {
            connectedPhone = sock.user.id.split(':')[0] || sock.user.id.split('@')[0];
            console.log('[WhatsApp] Número conectado:', connectedPhone);
          }
        } catch (e) {
          console.log('[WhatsApp] Erro ao obter número:', e.message);
        }
      }
    });

    // Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Receber mensagens
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const msg of messages) {
          const from = msg.key.remoteJid;
          
          // Ignorar mensagens de grupo e status
          if (from.endsWith('@g.us') || from === 'status@broadcast') {
            continue;
          }
          
          // MENSAGEM ENVIADA PELO ATENDENTE (fromMe = true)
          if (msg.key.fromMe && msg.message) {
            const messageContent = msg.message.conversation || 
                                  msg.message.extendedTextMessage?.text || 
                                  null;
            
            // Se não é uma mensagem automática do bot, pausar o bot para este número
            if (messageContent && !messageContent.includes('🤖') && autoReplyEnabled) {
              console.log(`[WhatsApp] Atendente humano enviou mensagem para ${from}. Pausando bot...`);
              
              // Chamar API para pausar o bot
              try {
                const pauseResponse = await fetch(`${BACKEND_URL}/api/chatbot/process`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    phone: from,
                    message: '',
                    push_name: '',
                    is_from_human_agent: true
                  })
                });
                
                const pauseData = await pauseResponse.json();
                if (pauseData.bot_paused && pauseData.response) {
                  // Enviar mensagem de pausa para o cliente
                  await sendMessageWithTyping(from, pauseData.response);
                  console.log(`[WhatsApp] Bot pausado para ${from}`);
                }
              } catch (e) {
                console.log('[WhatsApp] Erro ao pausar bot:', e.message);
              }
            }
            continue;
          }
          
          // MENSAGEM RECEBIDA DO CLIENTE (fromMe = false)
          if (!msg.key.fromMe && msg.message) {
            const messageContent = msg.message.conversation || 
                                  msg.message.extendedTextMessage?.text || 
                                  msg.message.imageMessage?.caption ||
                                  null;
            
            // Verificar se é mensagem de áudio
            const audioMessage = msg.message.audioMessage || 
                                msg.message.pttMessage ||  // PTT = Push To Talk (áudio gravado)
                                null;
            
            // Se é áudio, processar com transcrição
            if (audioMessage) {
              console.log(`[WhatsApp] Áudio recebido de ${from}`);
              
              // Incrementar estatísticas
              stats.messagesReceived++;
              stats.clientsServed.add(from);
              
              try {
                await fetch(`${BACKEND_URL}/api/whatsapp/stats/increment?stat_type=messages_received&amount=1`, {
                  method: 'POST'
                });
                await fetch(`${BACKEND_URL}/api/whatsapp/stats/client?phone=${encodeURIComponent(from)}&name=${encodeURIComponent(msg.pushName || '')}`, {
                  method: 'POST'
                });
              } catch (e) {
                console.log('[WhatsApp] Erro ao salvar estatística no banco:', e.message);
              }
              
              // Marcar como lida
              try {
                await sock.readMessages([msg.key]);
              } catch (e) {}
              
              // Baixar o áudio
              try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { 
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: sock.updateMediaMessage 
                });
                if (buffer) {
                  const audioBase64 = buffer.toString('base64');
                  console.log(`[WhatsApp] Áudio convertido para base64 (${audioBase64.length} chars)`);
                  
                  // Enviar para processamento com IA
                  if (autoReplyEnabled) {
                    console.log('[WhatsApp] Processando áudio com IA...');
                    const response = await fetch(`${BACKEND_URL}/api/chatbot/process`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: from,
                        message: '',
                        push_name: msg.pushName || '',
                        message_type: 'audio',
                        audio_base64: audioBase64
                      })
                    });
                    
                    const data = await response.json();
                    console.log('[WhatsApp] Resposta da IA (áudio):', data.success ? 'OK' : 'Erro');
                    
                    if (data.success && data.response) {
                      // Se tem áudio de resposta, enviar como áudio
                      if (data.response_audio_base64) {
                        console.log('[WhatsApp] Enviando resposta em áudio...');
                        try {
                          const audioBuffer = Buffer.from(data.response_audio_base64, 'base64');
                          await sock.sendMessage(from, {
                            audio: audioBuffer,
                            mimetype: 'audio/mpeg',
                            ptt: true  // Enviar como mensagem de voz
                          });
                          stats.messagesSent++;
                          console.log('[WhatsApp] Áudio de resposta enviado!');
                        } catch (audioErr) {
                          console.log('[WhatsApp] Erro ao enviar áudio, enviando texto:', audioErr.message);
                          await sendMessageWithTyping(from, data.response);
                        }
                      } else {
                        // Enviar como texto
                        await sendMessageWithTyping(from, data.response);
                      }
                    } else if (data.waiting_for_human) {
                      // Cliente pediu atendente humano
                      if (data.response_audio_base64) {
                        try {
                          const audioBuffer = Buffer.from(data.response_audio_base64, 'base64');
                          await sock.sendMessage(from, {
                            audio: audioBuffer,
                            mimetype: 'audio/mpeg',
                            ptt: true
                          });
                          stats.messagesSent++;
                        } catch (audioErr) {
                          await sendMessageWithTyping(from, data.response);
                        }
                      } else if (data.response) {
                        await sendMessageWithTyping(from, data.response);
                      }
                    }
                  }
                }
              } catch (downloadErr) {
                console.log('[WhatsApp] Erro ao baixar áudio:', downloadErr.message);
              }
              
              continue;
            }
            
            // Ignorar outras mensagens sem texto (imagens sem legenda, etc)
            if (!messageContent) {
              console.log(`[WhatsApp] Mensagem sem texto de ${from} (mídia)`);
              continue;
            }
            
            console.log(`[WhatsApp] Mensagem de ${from}: ${messageContent}`);
            
            // Incrementar estatísticas em memória
            stats.messagesReceived++;
            stats.clientsServed.add(from);
            
            // Salvar estatísticas no banco de dados
            try {
              await fetch(`${BACKEND_URL}/api/whatsapp/stats/increment?stat_type=messages_received&amount=1`, {
                method: 'POST'
              });
              await fetch(`${BACKEND_URL}/api/whatsapp/stats/client?phone=${encodeURIComponent(from)}&name=${encodeURIComponent(msg.pushName || '')}`, {
                method: 'POST'
              });
            } catch (e) {
              console.log('[WhatsApp] Erro ao salvar estatística no banco:', e.message);
            }
            
            // Armazenar mensagem
            const msgData = {
              id: msg.key.id,
              from: from,
              message: messageContent,
              timestamp: new Date().toISOString(),
              pushName: msg.pushName || 'Desconhecido'
            };
            
            receivedMessages.unshift(msgData);
            
            // Limitar a 100 mensagens
            if (receivedMessages.length > MAX_MESSAGES) {
              receivedMessages = receivedMessages.slice(0, MAX_MESSAGES);
            }
            
            // Marcar como lida
            try {
              await sock.readMessages([msg.key]);
            } catch (e) {
              console.log('[WhatsApp] Erro ao marcar como lida:', e.message);
            }
            
            // Resposta automática com IA
            if (autoReplyEnabled) {
              console.log('[WhatsApp] Processando resposta da IA...');
              const aiResponse = await getAIResponse(from, messageContent, msg.pushName);
              
              // Se aiResponse é null, significa que o bot está pausado ou houve erro
              if (aiResponse) {
                await sendMessageWithTyping(from, aiResponse);
              } else {
                console.log(`[WhatsApp] Bot pausado ou sem resposta para ${from}`);
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('[WhatsApp] Erro ao conectar:', error.message);
    lastError = error.message;
    connectionStatus = 'error';
    reconnecting = false;
  }
}

// Endpoint: Status da conexão
app.get('/status', async (req, res) => {
  // Tentar buscar estatísticas do banco de dados
  let dbStats = null;
  try {
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/stats`, {
      headers: { 'Authorization': 'Bearer internal' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.stats) {
        dbStats = data.stats;
      }
    }
  } catch (e) {
    // Usar estatísticas em memória se falhar
  }

  res.json({
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    hasQR: currentQR !== null,
    error: lastError,
    phone: connectedPhone,
    messagesCount: receivedMessages.length,
    autoReplyEnabled: autoReplyEnabled,
    stats: dbStats ? {
      clientsServed: dbStats.clients_served || 0,
      messagesReceived: dbStats.messages_received || 0,
      messagesSent: dbStats.messages_sent || 0
    } : {
      clientsServed: stats.clientsServed.size,
      messagesReceived: stats.messagesReceived,
      messagesSent: stats.messagesSent
    }
  });
});

// Endpoint: Obter QR Code
app.get('/qr', async (req, res) => {
  try {
    if (connectionStatus === 'connected') {
      return res.json({ 
        success: false, 
        message: 'Já conectado ao WhatsApp',
        status: connectionStatus
      });
    }
    
    if (!currentQR) {
      return res.json({ 
        success: false, 
        message: 'QR Code não disponível. Aguarde ou reinicie a conexão.',
        status: connectionStatus
      });
    }
    
    const qrImage = await QRCode.toDataURL(currentQR, { 
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    res.json({ 
      success: true, 
      qr: qrImage,
      status: connectionStatus
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Endpoint: Enviar mensagem
app.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone e message são obrigatórios' 
      });
    }
    
    if (connectionStatus !== 'connected' || !sock) {
      return res.status(400).json({ 
        success: false, 
        message: 'WhatsApp não está conectado' 
      });
    }
    
    // Formatar número
    let jid = phone;
    
    // Se já tem @, usar como está
    if (!jid.includes('@')) {
      // Remover caracteres não numéricos
      jid = jid.replace(/\D/g, '');
      
      // Adicionar código do país se não tiver
      if (jid.length === 10 || jid.length === 11) {
        jid = '55' + jid;
      }
      
      jid = jid + '@s.whatsapp.net';
    }
    
    console.log(`[WhatsApp] Tentando enviar para: ${jid}`);
    
    // Verificar se o número existe no WhatsApp
    try {
      const [result] = await sock.onWhatsApp(jid.replace('@s.whatsapp.net', ''));
      if (result && result.exists) {
        jid = result.jid;
        console.log(`[WhatsApp] Número verificado, JID correto: ${jid}`);
      } else {
        console.log(`[WhatsApp] Número não encontrado no WhatsApp: ${jid}`);
      }
    } catch (checkErr) {
      console.log(`[WhatsApp] Erro ao verificar número (continuando): ${checkErr.message}`);
    }
    
    const success = await sendMessageWithTyping(jid, message);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Mensagem enviada com sucesso'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar mensagem' 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Endpoint: Desconectar
app.post('/disconnect', async (req, res) => {
  try {
    console.log('[WhatsApp] Iniciando desconexão...');
    
    if (sock) {
      try {
        await sock.logout();
      } catch (logoutErr) {
        console.log('[WhatsApp] Erro no logout (ignorando):', logoutErr.message);
      }
      sock = null;
    }
    
    // Limpar sessão
    if (fs.existsSync(AUTH_SESSION_PATH)) {
      fs.rmSync(AUTH_SESSION_PATH, { recursive: true, force: true });
      fs.mkdirSync(AUTH_SESSION_PATH, { recursive: true });
    }
    
    currentQR = null;
    connectionStatus = 'disconnected';
    lastError = null;
    reconnecting = false;
    connectedPhone = null;  // Limpar número conectado
    
    // Responder imediatamente
    res.json({ 
      success: true, 
      message: 'Desconectado com sucesso. Gerando novo QR Code...' 
    });
    
    // Reiniciar conexão para gerar novo QR (após responder)
    console.log('[WhatsApp] Gerando novo QR Code em 2 segundos...');
    setTimeout(connectToWhatsApp, 2000);
    
  } catch (error) {
    console.error('[WhatsApp] Erro ao desconectar:', error.message);
    
    // Mesmo com erro, tentar reconectar
    currentQR = null;
    connectionStatus = 'disconnected';
    sock = null;
    
    res.json({ 
      success: true, 
      message: 'Desconectado (com erros). Gerando novo QR Code...' 
    });
    
    setTimeout(connectToWhatsApp, 2000);
  }
});

// Endpoint: Obter mensagens recebidas
app.get('/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    success: true,
    messages: receivedMessages.slice(0, limit),
    total: receivedMessages.length
  });
});

// Endpoint: Toggle auto-reply
app.post('/toggle-auto-reply', (req, res) => {
  autoReplyEnabled = !autoReplyEnabled;
  res.json({
    success: true,
    autoReplyEnabled: autoReplyEnabled
  });
});

// Endpoint: Definir auto-reply
app.post('/set-auto-reply', (req, res) => {
  const { enabled } = req.body;
  autoReplyEnabled = enabled === true;
  res.json({
    success: true,
    autoReplyEnabled: autoReplyEnabled
  });
});

// Endpoint: Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'whatsapp-service',
    connectionStatus,
    autoReplyEnabled,
    uptime: process.uptime()
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WhatsApp Service] Rodando na porta ${PORT}`);
  // Iniciar conexão WhatsApp
  connectToWhatsApp();
});
