#!/bin/bash
#
# SETUP.SH - Configuração inicial do Sistema Núcleo
# Executar UMA VEZ após clonar o repositório
#
# Uso: ./setup.sh
#

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           NÚCLEO - Setup Inicial                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

# =====================================================
# 1. BACKEND - Dependências Python
# =====================================================
echo "📦 [1/4] Instalando dependências do Backend..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
    python3 -m venv venv 2>/dev/null || true
fi

# Instalar dependências
pip install -r requirements.txt -q 2>/dev/null || pip3 install -r requirements.txt -q

echo "   ✅ Backend pronto"

# =====================================================
# 2. FRONTEND - Dependências Node
# =====================================================
echo "📦 [2/4] Instalando dependências do Frontend..."
cd "$ROOT_DIR/frontend"

# Verificar se yarn está disponível
if command -v yarn &> /dev/null; then
    yarn install --silent 2>/dev/null || yarn install
else
    npm install --silent 2>/dev/null || npm install
fi

echo "   ✅ Frontend pronto"

# =====================================================
# 3. ARQUIVOS .ENV
# =====================================================
echo "⚙️  [3/4] Configurando arquivos de ambiente..."

# Backend .env
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    cat > "$ROOT_DIR/backend/.env" << 'EOF'
# Configuração do Backend - Núcleo
CORS_ORIGINS="*"
JWT_SECRET="nucleo-secret-key-change-in-production"
EOF
    echo "   ✅ backend/.env criado"
else
    echo "   ℹ️  backend/.env já existe"
fi

# Frontend .env (usando URL relativa, não precisa de BACKEND_URL específico)
if [ ! -f "$ROOT_DIR/frontend/.env" ]; then
    cat > "$ROOT_DIR/frontend/.env" << 'EOF'
# Configuração do Frontend - Núcleo
# Não precisa de REACT_APP_BACKEND_URL - usa URLs relativas
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
EOF
    echo "   ✅ frontend/.env criado"
else
    echo "   ℹ️  frontend/.env já existe"
fi

# =====================================================
# 4. BANCO DE DADOS SQLite
# =====================================================
echo "🗄️  [4/4] Verificando banco de dados..."
cd "$ROOT_DIR/backend"

# Criar diretório se não existir
mkdir -p data_backup

# Inicializar banco (cria tabelas se não existirem)
python3 -c "import database" 2>/dev/null || python -c "import database"

echo "   ✅ SQLite configurado"

# =====================================================
# FINALIZAÇÃO
# =====================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✅ Setup concluído com sucesso!                  ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  Para iniciar o sistema, execute:                          ║"
echo "║                                                            ║"
echo "║    ./launch.sh                                             ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
