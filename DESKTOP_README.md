# Núcleo - Aplicação Desktop

Sistema de Gestão de CMV (Custo de Mercadoria Vendida) para Restaurantes.

## 🚀 Instalação

### Windows

1. Baixe o instalador `Nucleo-Setup.exe` na página de [Releases](../../releases)
2. Execute o instalador
3. Siga as instruções na tela
4. O Núcleo será instalado com atalho no Desktop e Menu Iniciar

### Primeiro Acesso

- **Login:** `admin`
- **Senha:** `admin`
- **IMPORTANTE:** Você será obrigado a trocar a senha no primeiro acesso!

---

## 💻 Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Python 3.9+
- Yarn

### Setup

```bash
# Clonar repositório
git clone <repo-url>
cd nucleo

# Instalar dependências do Electron
npm install

# Instalar dependências do Frontend
cd frontend
yarn install
cd ..

# Instalar dependências do Backend
cd backend
pip install -r requirements.txt
cd ..
```

### Rodar em Desenvolvimento

**Terminal 1 - Backend:**
```bash
cd backend
python server.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

**Terminal 3 - Electron (opcional):**
```bash
npm run electron:dev
```

---

## 📦 Gerar Instalador

### 1. Build do Backend (PyInstaller)

```bash
cd backend
pip install pyinstaller
python build_backend.py
```

Isso gera o executável em `desktop-build/backend/nucleo-backend.exe`

### 2. Build do Frontend

```bash
cd frontend
yarn build
```

Isso gera o build em `frontend/build/`

### 3. Gerar Instalador

```bash
npm run dist:win
```

O instalador será gerado em `dist/Nucleo-Setup.exe`

---

## 📁 Onde Ficam os Dados

### Windows

- **Banco de dados:** `%APPDATA%/nucleo/nucleo.db`
- **Logs:** `%APPDATA%/nucleo/logs/nucleo.log`

### macOS

- **Banco de dados:** `~/Library/Application Support/nucleo/nucleo.db`
- **Logs:** `~/Library/Application Support/nucleo/logs/nucleo.log`

### Linux

- **Banco de dados:** `~/.config/nucleo/nucleo.db`
- **Logs:** `~/.config/nucleo/logs/nucleo.log`

> ⚠️ **IMPORTANTE:** Os dados são mantidos entre atualizações e reinstalações!

### Bootstrap do Banco

No primeiro boot, se o banco não existir no userData:
1. O sistema copia o seed database empacotado (`data_backup/nucleo.db`)
2. Cria automaticamente um usuário admin (`admin/admin`) se não existir
3. Os dados existentes são preservados

---

## ⚙️ Configurações

### Modo sem Login

Você pode ativar o "Modo sem Login" nas configurações do sistema para pular a tela de autenticação.

1. Faça login como administrador
2. Vá em Configurações
3. Ative "Modo sem Login"

### Porta do Backend

Por padrão, o backend usa a porta `17845`. Se estiver ocupada:
- O sistema tenta liberar automaticamente
- Se não conseguir, usa uma porta alternativa

---

## 🔐 Segurança

- Senhas armazenadas com hash SHA256
- Compatibilidade com senhas em texto puro (migração automática)
- JWT para autenticação de sessão
- Dados locais (não enviados para nuvem)

---

## 🐛 Diagnóstico

### Ver Logs

1. Abra o Núcleo
2. Vá em Configurações > Diagnóstico
3. Clique em "Abrir Pasta de Logs"

### Verificar Banco de Dados

Endpoint de health: `http://127.0.0.1:17845/api/health`

---

## 📝 GitHub Actions

Quando você criar uma tag `vX.Y.Z`, o GitHub Actions automaticamente:

1. Compila o backend com PyInstaller
2. Gera o build do React
3. Empacota tudo com electron-builder
4. Anexa o instalador `Nucleo-Setup.exe` ao Release

### Criar Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 📄 Licença

MIT License - Veja [LICENSE.txt](build-resources/LICENSE.txt)
