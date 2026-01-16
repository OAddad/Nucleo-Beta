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
- **🚨 Sistema de Alerta** - Som em loop quando cliente pede atendimento humano

### 4. Sistema de Impressão
- Suporte a múltiplas impressoras por setor
- Cupom de Entrega (Caixa)
- Cupom de Preparo (Cozinha)
- Print Connector como executável Windows

## Changelog Recente

### 2025-01-16 - Sistema de Alerta de Atendimento Humano
- **Implementado**: Som de alerta tocando em loop quando cliente pede atendente
- **Implementado**: Banner visual vermelho pulsante com lista de clientes aguardando
- **Implementado**: Parada automática do som quando atendente responde
- **Palavras-chave detectadas**: "falar com atendente", "quero humano", "preciso de ajuda", etc.
- **Novos endpoints**: `/api/chatbot/waiting-queue`, `/api/sounds/cliente-esperando`

### 2025-01-16 - ChatBot com Suporte a Áudio
- **Implementado**: Speech-to-Text usando OpenAI Whisper
- **Implementado**: Text-to-Speech usando OpenAI TTS
- **Novos endpoints**: `/api/chatbot/process-audio`, `/api/chatbot/text-to-speech`, `/api/chatbot/voices`

### 2025-01-16 - Melhoria na Pausa por Intervenção Humana
- **Implementado**: Bot pausa quando funcionário envia qualquer tipo de mídia
- **Tipos suportados**: text, audio, image, video, gif, sticker, document

## Backlog / Tarefas Pendentes

### P0 - Alta Prioridade
- [ ] Integrar processamento de áudio com serviço WhatsApp real
- [ ] Resolver persistência do executável `NucleoPrintConnector.exe` entre sessões

### P1 - Média Prioridade
- [ ] Verificar funcionalidades de impressão automática
- [ ] Testar reimpressão de 2ª via

### P2 - Baixa Prioridade
- [ ] Notificações push no navegador para clientes aguardando
- [ ] Refatorar URL do Print Connector para constante compartilhada

## Arquivos de Referência

### ChatBot e Áudio
- `/app/backend/chatbot_ai.py` - Lógica de IA, pausa do bot, fila de espera e funções de áudio
- `/app/backend/audio_service.py` - Serviço STT (Whisper) e TTS (OpenAI)
- `/app/backend/server.py` - Endpoints de API
- `/app/frontend/src/pages/ChatBot.js` - Interface do ChatBot com banner de alerta
- `/app/backend/static/sounds/cliente_esperando.mp3` - Som de alerta

### Impressão
- `/app/print-connector/src/print-queue.js` - Templates de cupons
- `/app/print-connector/src/index.js` - API do Print Connector

## API de Fila de Espera

### Listar Clientes Aguardando
```bash
GET /api/chatbot/waiting-queue
```
Retorna: `{ queue: [...], count: N, has_waiting: bool }`

### Som de Alerta
```bash
GET /api/sounds/cliente-esperando
```
Retorna: Arquivo MP3

## Credenciais de Teste
- **Login**: admin
- **Senha**: admin
