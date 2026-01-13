#!/bin/bash
# ==============================================
# Script de Setup - Pedido Express
# Execute este script após clonar o repositório
# ==============================================

echo "🚀 Iniciando setup do Pedido Express..."

# 1. Instalar dependências do Backend
echo "📦 Instalando dependências do Backend..."
cd /app/backend
if [ -f requirements.txt ]; then
    pip install -r requirements.txt --quiet
    echo "✅ Dependências do backend instaladas"
fi

# 2. Instalar dependências do Frontend
echo "📦 Instalando dependências do Frontend..."
cd /app/frontend
if [ -f package.json ]; then
    yarn install --silent
    echo "✅ Dependências do frontend instaladas"
fi

# 3. Instalar dependências do WhatsApp Service
echo "📦 Instalando dependências do WhatsApp Service..."
cd /app/whatsapp-service
if [ -f package.json ]; then
    npm install --silent
    echo "✅ Dependências do WhatsApp Service instaladas"
fi

# 4. Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /var/log/supervisor
mkdir -p /app/backend/data_backup

# 5. Configurar permissões
chmod +x /app/backend/start_whatsapp.sh 2>/dev/null

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
echo "Para iniciar os serviços:"
echo "  sudo supervisorctl restart all"
echo ""
