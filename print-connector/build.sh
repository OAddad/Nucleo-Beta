#!/bin/bash
echo "========================================"
echo "  Nucleo Print Connector - Build"
echo "========================================"
echo ""

echo "[1/3] Instalando dependências..."
npm install

echo ""
echo "[2/3] Instalando pkg globalmente..."
npm install -g pkg 2>/dev/null || true

echo ""
echo "[3/3] Gerando executável..."
npx pkg . --targets node18-win-x64 --output dist/NucleoPrintConnector.exe

echo ""
echo "========================================"
echo "  BUILD CONCLUÍDO!"
echo "  Arquivo: dist/NucleoPrintConnector.exe"
echo "========================================"
