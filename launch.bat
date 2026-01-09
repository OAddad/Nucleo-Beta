@echo off
chcp 65001 >nul 2>&1
title Núcleo - Sistema de Gestão de CMV

:: =====================================================
:: LAUNCH.BAT - Launcher Visual para Windows
:: Sistema Núcleo - Gestão de CMV para Restaurantes
:: =====================================================
:: 
:: Uso: Duplo clique neste arquivo para iniciar o sistema
::
:: Pré-requisito: Git Bash instalado
:: Download: https://git-scm.com/download/win
::

cls
echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║     🍽️  NÚCLEO - Sistema de Gestão de CMV                 ║
echo   ║                                                           ║
echo   ║     Iniciando o sistema...                                ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.

:: =====================================================
:: VERIFICAR GIT BASH
:: =====================================================

set "GITBASH="

:: Tentar encontrar Git Bash em locais comuns
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files\Git\bin\bash.exe"
    goto :found_gitbash
)

if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
    goto :found_gitbash
)

:: Tentar via PATH
where bash >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where bash') do (
        set "GITBASH=%%i"
        goto :found_gitbash
    )
)

:: Git Bash não encontrado
echo   ❌ ERRO: Git Bash não encontrado!
echo.
echo   O Git Bash é necessário para executar o sistema.
echo.
echo   📥 Para instalar:
echo      1. Acesse: https://git-scm.com/download/win
echo      2. Baixe e instale o Git for Windows
echo      3. Reinicie este launcher
echo.
echo   ═══════════════════════════════════════════════════════════
echo.
pause
exit /b 1

:found_gitbash
echo   ✓ Git Bash encontrado: %GITBASH%
echo.

:: =====================================================
:: VERIFICAR LAUNCH.SH
:: =====================================================

set "SCRIPT_DIR=%~dp0"
set "LAUNCH_SCRIPT=%SCRIPT_DIR%launch.sh"

if not exist "%LAUNCH_SCRIPT%" (
    echo   ❌ ERRO: launch.sh não encontrado!
    echo.
    echo   Certifique-se de que este arquivo está na pasta raiz do projeto.
    echo   Esperado: %LAUNCH_SCRIPT%
    echo.
    pause
    exit /b 1
)

echo   ✓ Script de inicialização encontrado
echo.

:: =====================================================
:: INICIAR O SISTEMA
:: =====================================================

echo   ═══════════════════════════════════════════════════════════
echo   📡 Iniciando Backend (FastAPI)...
echo   🎨 Iniciando Frontend (React)...
echo   ═══════════════════════════════════════════════════════════
echo.

:: Converter caminho Windows para formato Unix
set "UNIX_PATH=%SCRIPT_DIR:\=/%"
set "UNIX_PATH=%UNIX_PATH:C:=/c%"
set "UNIX_PATH=%UNIX_PATH:D:=/d%"
set "UNIX_PATH=%UNIX_PATH:E:=/e%"

:: Executar launch.sh via Git Bash
cd /d "%SCRIPT_DIR%"
"%GITBASH%" --login -i -c "cd '%UNIX_PATH%' && chmod +x launch.sh && ./launch.sh; exec bash"

:: Se chegou aqui, algo deu errado
echo.
echo   ❌ O sistema foi encerrado.
echo.
pause
