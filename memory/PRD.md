# Núcleo - Sistema de Gestão para Restaurantes

## Descrição do Produto
Sistema completo de gestão para restaurantes com módulos de delivery, cardápio digital, controle de estoque, financeiro, e chatbot inteligente com integração WhatsApp.

## Stack Tecnológico
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Banco de Dados**: SQLite
- **Print Service**: Node.js compilado para Windows (.exe) usando pkg
- **IA/Audio**: OpenAI GPT-4o-mini, Whisper (STT), TTS

## Módulos Principais

### 1. Cardápio Digital
- Exibição de produtos por categoria
- Gerenciamento de preços e disponibilidade
- Upload de imagens de produtos

### 2. Delivery
- Gestão de pedidos
- Impressão automática de cupons
- Acompanhamento de entregadores

### 3. ChatBot Inteligente
- Integração com WhatsApp
- IA para atendimento automático
- Respostas por palavras-chave configuráveis
- **Pausa por Intervenção Humana** - bot pausa quando atendente humano envia qualquer tipo de mensagem
- **🎤 Entende áudios (STT)** - Transcrição via OpenAI Whisper
- **🔊 Responde com áudio (TTS)** - 9 vozes disponíveis via OpenAI TTS

### 4. Sistema de Impressão
- Suporte a múltiplas impressoras por setor
- Cupom de Entrega (Caixa)
- Cupom de Preparo (Cozinha)
- Print Connector como executável Windows

## Changelog Recente

### 2025-01-16 - ChatBot com Suporte a Áudio
- **Implementado**: Speech-to-Text usando OpenAI Whisper
- **Implementado**: Text-to-Speech usando OpenAI TTS
- **Novos endpoints**: `/api/chatbot/process-audio`, `/api/chatbot/text-to-speech`, `/api/chatbot/voices`
- **Novo arquivo**: `/app/backend/audio_service.py`
- **UI**: Configuração de voz do chatbot na página de Configurações BOT

### 2025-01-16 - Melhoria na Pausa por Intervenção Humana
- **Implementado**: Bot agora pausa quando funcionário envia qualquer tipo de mídia
- **Tipos suportados**: text, audio, image, video, gif, sticker, document

## Backlog / Tarefas Pendentes

### P0 - Alta Prioridade
- [ ] Integrar processamento de áudio com serviço WhatsApp real
- [ ] Resolver persistência do executável `NucleoPrintConnector.exe` entre sessões

### P1 - Média Prioridade
- [ ] Verificar funcionalidades de impressão automática
- [ ] Testar reimpressão de 2ª via

### P2 - Baixa Prioridade
- [ ] Refatorar URL do Print Connector para constante compartilhada

## Arquivos de Referência

### ChatBot e Áudio
- `/app/backend/chatbot_ai.py` - Lógica de IA, pausa do bot e funções de áudio
- `/app/backend/audio_service.py` - Serviço STT (Whisper) e TTS (OpenAI)
- `/app/backend/server.py` - Endpoints de API
- `/app/frontend/src/pages/ChatBot.js` - Interface do ChatBot

### Impressão
- `/app/print-connector/src/print-queue.js` - Templates de cupons
- `/app/print-connector/src/index.js` - API do Print Connector

## API de Áudio

### Processar Áudio (STT + IA + TTS)
```bash
POST /api/chatbot/process-audio
{
  "phone": "5511999998888",
  "audio_base64": "...",  # ou audio_url
  "push_name": "Cliente",
  "respond_with_audio": true
}
```

### Text-to-Speech
```bash
POST /api/chatbot/text-to-speech
{
  "text": "Olá, como posso ajudar?",
  "voice": "nova"
}
```

### Vozes Disponíveis
- `nova` - Energética e animada (padrão)
- `alloy` - Neutra e equilibrada
- `echo` - Suave e calma
- `fable` - Expressiva
- `onyx` - Profunda e autoritária
- `shimmer` - Brilhante e alegre
- `ash` - Clara e articulada
- `coral` - Calorosa e amigável
- `sage` - Sábia e ponderada

## Credenciais de Teste
- **Login**: admin
- **Senha**: admin
