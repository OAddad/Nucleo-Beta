# 🍽️ Núcleo - Sistema de Gestão de CMV

Sistema completo de gestão de **CMV (Custo de Mercadoria Vendida)** para restaurantes.

---

## 🚀 Início Rápido

### 🪟 Windows - Executável (1 clique)

**Pré-requisitos:** [Python](https://python.org) e [Node.js](https://nodejs.org) instalados

**Opção A - Usar executável pronto:**
1. Duplo clique em `NucleoLauncher.exe` → Sistema inicia automaticamente!

**Opção B - Gerar o executável:**
1. Execute `build_exe.bat` para compilar
2. Duplo clique em `NucleoLauncher.exe`

> 📖 Veja mais detalhes em [LAUNCHER_README.md](LAUNCHER_README.md)

---

### 🪟 Windows - Script Batch (2 cliques)

**Pré-requisito:** [Git for Windows](https://git-scm.com/download/win) instalado

1. **Clone o repositório** (apenas uma vez)
2. **Duplo clique em `launch.bat`** → Sistema inicia automaticamente!

> 💡 **Dica:** Crie um atalho do `launch.bat` na área de trabalho para acesso rápido.

---

### 🐧 Linux / macOS / Git Bash

#### Passo 1: Clone o repositório
```bash
git clone <url-do-repositorio>
cd nucleo
```

#### Passo 2: Execute o setup (apenas uma vez)
```bash
./setup.sh
```
> Instala dependências e configura o ambiente (~2-3 minutos)

#### Passo 3: Inicie o sistema
```bash
./launch.sh
```
> Tempo de inicialização: **< 60 segundos**

---

### Acesse o sistema
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8001

### Credenciais padrão
- **Usuário:** `Addad`
- **Senha:** `Addad123`

---

## 📋 Funcionalidades

- ✅ **Autenticação** com JWT (3 níveis: proprietário, administrador, observador)
- ✅ **Ingredientes** - CRUD com controle de estoque
- ✅ **Produtos** - Receitas com cálculo automático de CMV
- ✅ **Compras** - Lançamento individual ou em lote
- ✅ **Categorias** - Organização de produtos
- ✅ **Etapas de Pedido** - Configuração de combos/steps
- ✅ **Relatórios** - Dashboard e histórico de preços
- ✅ **Auditoria** - Log de todas as ações
- ✅ **Backup** - SQLite + Excel automático

---

## 🏗️ Arquitetura

```
/app
├── backend/              # FastAPI (Python)
│   ├── server.py         # API principal
│   ├── database.py       # SQLite operations
│   └── data_backup/      # Banco SQLite + Excel
├── frontend/             # React
│   └── src/pages/        # Páginas do sistema
├── NucleoLauncher.exe    # 🖥️ Executável Windows (após build)
├── launcher.py           # Script Python do launcher
├── build_exe.bat         # Script para compilar .exe
├── launch.bat            # 🪟 Launcher Windows (2 cliques)
├── Nucleo.vbs            # 🪟 Launcher silencioso Windows
├── setup.sh              # Setup inicial (executar 1x)
├── launch.sh             # Inicialização rápida (Linux/Mac)
├── LAUNCHER_README.md    # Guia do executável
└── README.md
```

### Tecnologias
- **Backend:** FastAPI + SQLite + JWT
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Banco:** SQLite (arquivo local, sem MongoDB)

---

## 🔧 Comandos Úteis

### Windows
```batch
:: Iniciar sistema (duplo clique ou via terminal)
launch.bat

:: Parar sistema
Ctrl+C no terminal ou fechar a janela
```

### Linux / macOS
```bash
# Iniciar sistema
./launch.sh

# Parar sistema
pkill -f uvicorn && pkill -f 'yarn start'

# Ver logs
tail -f /tmp/nucleo-backend.log
tail -f /tmp/nucleo-frontend.log

# Reiniciar apenas backend
pkill -f uvicorn
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 &
```

---

## 📊 Dados Persistentes

Os dados são armazenados em:
- **SQLite:** `/app/backend/data_backup/nucleo.db`
- **Backup Excel:** `/app/backend/data_backup/nucleo_backup.xlsx`

---

## 🌐 Deploy no Emergent

O sistema usa **URLs relativas** (`/api/...`) para chamadas ao backend, evitando problemas com troca de domínio no preview.

### Supervisor (ambiente Emergent)
O arquivo `supervisor.conf.example` contém a configuração otimizada sem MongoDB.

---

## 📝 Notas de Versão

### v2.2 - Executável Windows
- 🖥️ **NucleoLauncher.exe** - Executável standalone para Windows
- 🔨 **build_exe.bat** - Script para compilar o executável
- 📖 **LAUNCHER_README.md** - Documentação do launcher
- ⚡ Inicialização com 1 clique
- 🌐 Abre navegador automaticamente

### v2.1 - Launcher Windows
- 🪟 **launch.bat** - Iniciar com 2 cliques no Windows
- 🪟 **Nucleo.vbs** - Launcher silencioso alternativo
- 📖 README atualizado com instruções Windows

### v2.0 - Launch Otimizado
- ⚡ Setup separado da execução
- ⚡ Boot < 60 segundos
- ⚡ URLs relativas (sem dependência de domínio)
- ⚡ SQLite exclusivo (sem MongoDB)
- ⚡ Sem --reload no uvicorn

---

**© 2025 Núcleo - Sistema de Gestão**
