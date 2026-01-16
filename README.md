# 🍽️ Núcleo - Sistema de Gestão de CMV

Sistema completo de gestão de **CMV (Custo de Mercadoria Vendida)** para restaurantes.

---

## 🚀 Início Rápido - Windows

### Pré-requisitos

Instale antes de usar:

| Software | Download | Observação |
|----------|----------|------------|
| **Python 3.11** | [python.org/downloads](https://python.org/downloads) | Marque "Add to PATH" na instalação |
| **Node.js** | [nodejs.org](https://nodejs.org) | Versão LTS recomendada |

### Como usar

1. **Duplo clique em `Nucleo.bat`**
2. Aguarde ~30 segundos na primeira vez (instala dependências)
3. O navegador abre automaticamente
4. Faça login: `Addad` / `Addad123`

**Pronto!** ✅

---

### O que o launcher faz automaticamente:

✅ Detecta Python e Node.js instalados  
✅ Cria ambiente virtual Python (venv)  
✅ Instala dependências do backend  
✅ Instala dependências do frontend  
✅ Inicia os servidores  
✅ Abre o navegador  
✅ Mantém tudo rodando  

---

## 📋 Funcionalidades

- ✅ **Autenticação** com JWT (3 níveis: proprietário, administrador, observador)
- ✅ **Ingredientes/Estoque** - CRUD com controle de estoque e códigos automáticos
- ✅ **Produtos** - Receitas com cálculo automático de CMV
- ✅ **Compras** - Lançamento individual ou em lote
- ✅ **Fornecedores** - Cadastro com CPF/CNPJ formatado
- ✅ **Categorias** - Organização de produtos
- ✅ **Relatórios** - Dashboard e histórico
- ✅ **Auditoria** - Log de todas as ações

---

## 🔧 Informações Técnicas

### Portas utilizadas
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8001

### Credenciais padrão
- **Usuário:** `Addad`
- **Senha:** `Addad123`

### Dados persistentes
- **Banco:** `backend/data_backup/nucleo.db` (SQLite)
- **Backup:** `backend/data_backup/nucleo_backup.xlsx`

---

## 🏗️ Estrutura do Projeto

```
/nucleo
├── Nucleo.bat            # ← CLIQUE AQUI PARA INICIAR
├── backend/              # Servidor FastAPI (Python)
│   ├── server.py
│   ├── database.py
│   ├── requirements.txt
│   └── data_backup/      # Banco de dados
├── frontend/             # Interface React
│   ├── src/
│   └── package.json
└── README.md
```

---

## ❓ Problemas Comuns

### "Python não encontrado"
1. Baixe Python 3.11 em [python.org](https://python.org/downloads)
2. Na instalação, **marque "Add Python to PATH"**
3. Reinicie o computador
4. Execute `Nucleo.bat` novamente

### "Node.js não encontrado"
1. Baixe Node.js em [nodejs.org](https://nodejs.org)
2. Instale a versão LTS
3. Reinicie o computador
4. Execute `Nucleo.bat` novamente

### Navegador não abre
Acesse manualmente: http://localhost:3000

### Como encerrar o sistema
1. Pressione qualquer tecla na janela do Núcleo
2. Ou feche a janela diretamente

---

## 📱 ChatBot WhatsApp

O sistema inclui um ChatBot WhatsApp integrado para atendimento automático de pedidos.

### Portas do ChatBot
- **WhatsApp Service:** http://localhost:3002

### Setup do WhatsApp (Emergent/Cloud)
O WhatsApp é iniciado automaticamente pelo backend. Se precisar reinstalar as dependências:

```bash
cd /app/whatsapp-service
npm install
```

### Funcionalidades do ChatBot
- ✅ Atendimento automático via IA
- ✅ Cardápio interativo
- ✅ Criação de pedidos pelo WhatsApp
- ✅ Notificações de status do pedido
- ✅ Resumo completo do pedido enviado ao cliente

---

## 🔧 Setup para Desenvolvimento (Emergent/Cloud)

Para configurar o ambiente após clonar ou reiniciar:

```bash
# Executar script de setup completo
bash /app/setup.sh

# Ou manualmente:
cd /app/whatsapp-service && npm install
cd /app/frontend && yarn install
cd /app/backend && pip install -r requirements.txt

# Reiniciar serviços
sudo supervisorctl restart all
```

---

## 🖨️ Print Connector - Sistema de Impressão

O sistema inclui um aplicativo de impressão para impressoras térmicas via ESC/POS.

### Arquivos do Print Connector
```
/app/print-connector/
├── src/                    # Código fonte
│   ├── index.js           # Servidor Express (porta 9100)
│   ├── print-queue.js     # Fila de impressão e templates
│   ├── escpos-builder.js  # Construtor de comandos ESC/POS
│   ├── printer-manager.js # Gerenciador de impressoras
│   └── config.js          # Persistência de configurações
├── dist/
│   └── NucleoPrintConnector.exe  # Executável Windows (37MB)
└── package.json
```

### Compilar o Executável (se necessário)
```bash
cd /app/print-connector
npm install
npm run build
# Executável gerado em: dist/NucleoPrintConnector.exe
```

### Funcionalidades do Print Connector
- ✅ Impressão automática de novos pedidos
- ✅ Cupom de Entrega (para o caixa)
- ✅ Cupom de Preparo (para a cozinha)
- ✅ Suporte a múltiplas impressoras por setor
- ✅ Fila de impressão com retry automático
- ✅ Cálculo automático de troco

### Endpoints do Print Connector
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Status do serviço |
| `/printers` | GET | Lista impressoras disponíveis |
| `/printers/sectors` | GET | Impressoras configuradas por setor |
| `/printers/sector` | POST | Configura impressora para setor |
| `/printers/connect` | POST | Define impressora padrão |
| `/print` | POST | Envia impressão |
| `/test` | POST | Página de teste |

### Porta padrão
- **Print Connector:** http://127.0.0.1:9100

### Como usar
1. Baixe o executável em **Sistema → Impressão → Download App**
2. Execute `NucleoPrintConnector.exe` no Windows
3. Configure as impressoras em **Sistema → Impressão → Configurações**
4. Selecione impressora para "Cupom de Entrega" (caixa)
5. Selecione impressora para "Cupom de Preparo" (cozinha)
6. Mantenha a tela de **Delivery** aberta para impressão automática

---

## 📝 Notas de Versão

### v3.2 - Print Connector
- 🖨️ Sistema de impressão térmica ESC/POS
- 📄 Cupom de Entrega e Cupom de Preparo
- 🔄 Impressão automática de novos pedidos
- 🏪 Múltiplas impressoras por setor (caixa/cozinha)
- 💰 Cálculo automático de troco
- 📥 Executável standalone para Windows

### v3.1 - WhatsApp Integration
- 📱 ChatBot WhatsApp com IA
- 🔄 Inicialização automática do WhatsApp Service
- 📦 Setup automático de dependências
- 📋 Resumo completo do pedido via WhatsApp

### v3.0 - Windows Native
- 🖥️ Launcher 100% Windows (sem Bash/Git Bash)
- ⚡ Setup automático na primeira execução
- 🔄 Boot < 60 segundos (após primeiro uso)
- 🌐 Abre navegador automaticamente

---

**© 2025 Núcleo - Sistema de Gestão de CMV**

