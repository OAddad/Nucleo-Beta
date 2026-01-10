# Núcleo - Aplicação Desktop

Sistema de Gestão de CMV (Custo de Mercadoria Vendida) para Restaurantes.

## 🚀 Instalação (Windows)

1. Baixe `Nucleo-Setup.exe` da página de [Releases](../../releases)
2. Execute o instalador
3. Após a instalação, o "Núcleo" aparecerá no Menu Iniciar
4. Clique para abrir - a interface abre dentro do Electron (não no navegador)

### Primeiro Acesso

- **Login:** `admin`
- **Senha:** `admin`
- **IMPORTANTE:** Troque a senha no primeiro acesso!

---

## 📁 Onde Ficam os Dados

### Windows

| Item | Caminho |
|------|---------|
| **Banco de dados** | `%APPDATA%\nucleo\nucleo.db` |
| **Logs** | `%APPDATA%\nucleo\logs\nucleo.log` |

> ⚠️ Os dados são **preservados** entre atualizações e reinstalações!

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
cd frontend && yarn install && cd ..

# Instalar dependências do Backend
cd backend && pip install -r requirements.txt && cd ..
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

Executável em: `desktop-build/backend/nucleo-backend.exe`

### 2. Build do Frontend

```bash
cd frontend
yarn build
```

Build em: `frontend/build/`

### 3. Gerar Instalador

```bash
npm run dist:win
```

Instalador em: `dist/Nucleo-Setup.exe`

---

## 🔄 CI/CD (GitHub Actions)

Ao criar uma tag `vX.Y.Z`:

1. Build do backend com PyInstaller
2. Build do React
3. Empacotamento com electron-builder
4. Upload do `Nucleo-Setup.exe` no Release

### Criar Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## ⚙️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN                         │
│  - Gerencia janela (BrowserWindow)                      │
│  - Inicia backend como processo filho                   │
│  - Define variáveis de ambiente (NUCLEO_DB_PATH, etc)   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (PyInstaller)                    │
│  - FastAPI servindo API em /api/*                       │
│  - Serve React build na raiz /                          │
│  - SQLite em %APPDATA%/nucleo/nucleo.db                 │
│  - Porta: 17845 (ou alternativa se ocupada)             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    BROWSERWINDOW                         │
│  - Carrega http://127.0.0.1:17845                       │
│  - React SPA com HashRouter                             │
│  - Nunca abre navegador externo                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança

- Senhas: SHA256 + salt (compatível com texto puro legado)
- Autenticação: JWT
- Dados: 100% locais (offline)

---

## 🐛 Diagnóstico

### Ver Logs

- Navegue até `%APPDATA%\nucleo\logs\`
- Abra `nucleo.log`

### Endpoint de Health

```
http://127.0.0.1:17845/api/health
```

---

## 📄 Licença

MIT License
