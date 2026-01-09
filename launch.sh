#!/bin/bash
#
# LAUNCH.SH - Inicialização rápida do Sistema Núcleo
# Executar SEMPRE que quiser iniciar o sistema
#
# Uso: ./launch.sh
#
# IMPORTANTE: Execute setup.sh primeiro (apenas uma vez)
#

set -e

cd "$(dirname "$0")"
ROOT_DIR=$(pwd)

echo "🚀 Iniciando Núcleo..."

# =====================================================
# VERIFICAÇÕES RÁPIDAS
# =====================================================

# Verificar se setup foi executado
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    echo "❌ Erro: Execute ./setup.sh primeiro!"
    exit 1
fi

# =====================================================
# PARAR SERVIÇOS EXISTENTES (se houver)
# =====================================================
pkill -f "uvicorn server:app" 2>/dev/null || true
pkill -f "yarn start" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# =====================================================
# INICIAR BACKEND
# =====================================================
echo "📡 Iniciando Backend (porta 8001)..."
cd "$ROOT_DIR/backend"

# Iniciar sem --reload para boot mais rápido
nohup uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 > /tmp/nucleo-backend.log 2>&1 &
BACKEND_PID=$!

# Aguardar backend estar pronto
sleep 2
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Erro ao iniciar backend. Verificar: /tmp/nucleo-backend.log"
    exit 1
fi

echo "   ✅ Backend rodando (PID: $BACKEND_PID)"

# =====================================================
# INICIAR FRONTEND
# =====================================================
echo "🎨 Iniciando Frontend (porta 3000)..."
cd "$ROOT_DIR/frontend"

# Iniciar frontend
nohup yarn start > /tmp/nucleo-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Erro ao iniciar frontend. Verificar: /tmp/nucleo-frontend.log"
    exit 1
fi

echo "   ✅ Frontend rodando (PID: $FRONTEND_PID)"

# =====================================================
# FINALIZAÇÃO
# =====================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✅ Núcleo iniciado com sucesso!                  ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  🌐 Frontend: http://localhost:3000                        ║"
echo "║  📡 Backend:  http://localhost:8001                        ║"
echo "║                                                            ║"
echo "║  📋 Logs:                                                  ║"
echo "║     Backend:  /tmp/nucleo-backend.log                      ║"
echo "║     Frontend: /tmp/nucleo-frontend.log                     ║"
echo "║                                                            ║"
echo "║  🛑 Para parar: pkill -f uvicorn && pkill -f 'yarn start'  ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Manter script rodando para ver logs
echo ""
echo "📜 Aguardando inicialização completa..."
sleep 10
echo ""
echo "Sistema pronto! Acesse http://localhost:3000"
