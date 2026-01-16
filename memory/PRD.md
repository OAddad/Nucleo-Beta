# Núcleo - Sistema de Gestão para Restaurantes

## Descrição do Produto
Sistema completo de gestão para restaurantes com módulos de delivery, cardápio digital, controle de estoque, financeiro, e chatbot inteligente com integração WhatsApp.

## Stack Tecnológico
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Banco de Dados**: SQLite
- **Print Service**: Node.js compilado para Windows (.exe) usando pkg

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
- **Pausa por Intervenção Humana** - bot pausa quando atendente humano envia qualquer tipo de mensagem (texto, áudio, foto, vídeo, GIF, documento)

### 4. Sistema de Impressão
- Suporte a múltiplas impressoras por setor
- Cupom de Entrega (Caixa)
- Cupom de Preparo (Cozinha)
- Print Connector como executável Windows

## Changelog Recente

### 2025-01-16 - Melhoria na Pausa por Intervenção Humana
- **Implementado**: Bot agora pausa quando funcionário envia qualquer tipo de mídia (não apenas texto)
- **Tipos suportados**: text, audio, image, video, gif, sticker, document, ptt, voice
- **Backend**: Adicionado campo `message_type` no endpoint `/api/chatbot/process`
- **Frontend**: Atualizado UI para mostrar tipos de mídia que acionam a pausa

## Backlog / Tarefas Pendentes

### P0 - Alta Prioridade
- [ ] Resolver persistência do executável `NucleoPrintConnector.exe` entre sessões
- [ ] Verificar funcionalidades de impressão automática

### P1 - Média Prioridade
- [ ] Verificar reimpressão de 2ª via
- [ ] Testar exibição de itens combo (estrutura `etapas`)

### P2 - Baixa Prioridade
- [ ] Refatorar URL do Print Connector (`http://127.0.0.1:9100`) para constante compartilhada

## Arquivos de Referência

### ChatBot
- `/app/backend/chatbot_ai.py` - Lógica de IA e pausa do bot
- `/app/backend/server.py` - Endpoints de API (linha ~3928)
- `/app/frontend/src/pages/ChatBot.js` - Interface do ChatBot

### Impressão
- `/app/print-connector/src/print-queue.js` - Templates de cupons
- `/app/print-connector/src/index.js` - API do Print Connector
- `/app/frontend/src/pages/Sistema.js` - Configurações de impressoras
- `/app/frontend/src/pages/Delivery.js` - Impressão automática e manual

## Credenciais de Teste
- **Login**: admin
- **Senha**: admin
