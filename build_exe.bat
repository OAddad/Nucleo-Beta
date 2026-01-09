@echo off
chcp 65001 >nul 2>&1
title Núcleo - Build Executável

:: =====================================================
:: BUILD_EXE.BAT - Compila o NucleoLauncher.exe
:: =====================================================
::
:: Este script usa PyInstaller para criar um executável
:: standalone do launcher do Núcleo.
::
:: Pré-requisitos:
::   - Python instalado
::   - PyInstaller instalado (pip install pyinstaller)
::
:: Uso: build_exe.bat
::

cls
echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║     🍽️  NÚCLEO - Build Executável                         ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: =====================================================
:: VERIFICAR PYTHON
:: =====================================================

echo   🔍 Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ Python não encontrado!
    echo   Instale Python em: https://python.org
    pause
    exit /b 1
)
echo   ✓ Python encontrado
echo.

:: =====================================================
:: INSTALAR PYINSTALLER
:: =====================================================

echo   📦 Verificando PyInstaller...
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo   📥 Instalando PyInstaller...
    pip install pyinstaller
)
echo   ✓ PyInstaller disponível
echo.

:: =====================================================
:: COMPILAR EXECUTÁVEL
:: =====================================================

echo   🔨 Compilando executável...
echo.

pyinstaller --onefile ^
    --name "NucleoLauncher" ^
    --console ^
    --clean ^
    --noconfirm ^
    launcher.py

if %errorlevel% neq 0 (
    echo.
    echo   ❌ Erro ao compilar!
    pause
    exit /b 1
)

:: =====================================================
:: COPIAR PARA RAIZ
:: =====================================================

echo.
echo   📁 Copiando executável para raiz do projeto...
copy /Y "dist\NucleoLauncher.exe" "NucleoLauncher.exe" >nul

:: =====================================================
:: LIMPEZA
:: =====================================================

echo   🧹 Limpando arquivos temporários...
rmdir /S /Q build >nul 2>&1
rmdir /S /Q __pycache__ >nul 2>&1
del /Q NucleoLauncher.spec >nul 2>&1

:: =====================================================
:: FINALIZAÇÃO
:: =====================================================

echo.
echo   ═══════════════════════════════════════════════════════════
echo.
echo   ✅ Build concluído com sucesso!
echo.
echo   📁 Executável criado:
echo      %CD%\NucleoLauncher.exe
echo.
echo   💡 Para usar:
echo      Duplo clique no NucleoLauncher.exe
echo.
echo   ═══════════════════════════════════════════════════════════
echo.
pause
