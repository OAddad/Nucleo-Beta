@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title NÚCLEO - Sistema de Gestão de CMV

:: =====================================================
:: NUCLEO.BAT - Launcher Windows 100%% Nativo
:: =====================================================
::
:: Sistema Núcleo - Gestão de CMV para Restaurantes
::
:: USO: Duplo clique neste arquivo
::
:: Pré-requisito: Python 3.11 instalado
:: Download: https://python.org
::
:: NÃO requer Git Bash, WSL ou qualquer ferramenta Linux
::
:: =====================================================

:: Diretório do projeto (onde está este .bat)
cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"

:: =====================================================
:: BANNER
:: =====================================================

cls
echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║     NÚCLEO - Sistema de Gestão de CMV                     ║
echo   ║                                                           ║
echo   ║     Iniciando...                                          ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.

:: =====================================================
:: DETECTAR PYTHON 3.11
:: =====================================================

echo   [1/6] Verificando Python...

set "PYTHON_EXE="

:: Tentar caminho padrão do Python 3.11 (instalação do python.org)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :python_found
)

:: Tentar Python 3.11 no PATH
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)"') do set "PYTHON_EXE=%%i"
    goto :python_found
)

:: Tentar py launcher
where py >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('py -3.11 -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_EXE=%%i"
    if defined PYTHON_EXE goto :python_found
)

:: Python não encontrado
echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║   ERRO: Python 3.11 não encontrado!                       ║
echo   ║                                                           ║
echo   ║   Por favor, instale o Python 3.11:                       ║
echo   ║                                                           ║
echo   ║   1. Acesse: https://python.org/downloads                 ║
echo   ║   2. Baixe o Python 3.11                                  ║
echo   ║   3. Na instalação, marque "Add to PATH"                  ║
echo   ║   4. Execute este arquivo novamente                       ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.
pause
exit /b 1

:python_found
echo         OK: Python encontrado
echo         Caminho: %PYTHON_EXE%
echo.

:: =====================================================
:: DETECTAR NODE.JS
:: =====================================================

echo   [2/6] Verificando Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   ╔═══════════════════════════════════════════════════════════╗
    echo   ║                                                           ║
    echo   ║   ERRO: Node.js não encontrado!                           ║
    echo   ║                                                           ║
    echo   ║   Por favor, instale o Node.js:                           ║
    echo   ║                                                           ║
    echo   ║   1. Acesse: https://nodejs.org                           ║
    echo   ║   2. Baixe a versão LTS                                   ║
    echo   ║   3. Instale normalmente                                  ║
    echo   ║   4. Execute este arquivo novamente                       ║
    echo   ║                                                           ║
    echo   ╚═══════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

echo         OK: Node.js encontrado
echo.

:: =====================================================
:: VERIFICAR YARN (instalar se necessário)
:: =====================================================

echo   [3/6] Verificando Yarn...

where yarn >nul 2>&1
if %errorlevel% neq 0 (
    echo         Yarn não encontrado. Instalando...
    call npm install -g yarn >nul 2>&1
    if %errorlevel% neq 0 (
        echo         AVISO: Não foi possível instalar Yarn. Usando npm.
        set "USE_NPM=1"
    ) else (
        echo         OK: Yarn instalado
    )
) else (
    echo         OK: Yarn encontrado
)
echo.

:: =====================================================
:: CRIAR/ATIVAR VENV DO BACKEND
:: =====================================================

echo   [4/6] Configurando Backend...

cd /d "%PROJECT_DIR%backend"

:: Criar venv se não existir
if not exist "venv" (
    echo         Criando ambiente virtual Python...
    "%PYTHON_EXE%" -m venv venv
    if %errorlevel% neq 0 (
        echo         ERRO: Falha ao criar ambiente virtual!
        pause
        exit /b 1
    )
    echo         OK: Ambiente virtual criado
    set "INSTALL_BACKEND_DEPS=1"
) else (
    echo         OK: Ambiente virtual existe
)

:: Ativar venv
call venv\Scripts\activate.bat

:: Instalar dependências se necessário
if defined INSTALL_BACKEND_DEPS (
    echo         Instalando dependências do backend...
    pip install -r requirements.txt -q
    if %errorlevel% neq 0 (
        echo         ERRO: Falha ao instalar dependências!
        pause
        exit /b 1
    )
    echo         OK: Dependências instaladas
)

echo.

:: =====================================================
:: INSTALAR DEPENDÊNCIAS DO FRONTEND
:: =====================================================

echo   [5/6] Configurando Frontend...

cd /d "%PROJECT_DIR%frontend"

:: Instalar dependências se não existir node_modules
if not exist "node_modules" (
    echo         Instalando dependências do frontend...
    if defined USE_NPM (
        call npm install --silent
    ) else (
        call yarn install --silent 2>nul || call yarn install
    )
    if %errorlevel% neq 0 (
        echo         AVISO: Alguns avisos durante instalação (normal)
    )
    echo         OK: Dependências instaladas
) else (
    echo         OK: Dependências já instaladas
)

echo.

:: =====================================================
:: INICIAR SERVIDORES
:: =====================================================

echo   [6/6] Iniciando servidores...
echo.

:: Matar processos anteriores (se existirem)
taskkill /F /IM "uvicorn.exe" >nul 2>&1
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq *react*" >nul 2>&1

:: Iniciar Backend
echo         Iniciando Backend (porta 8001)...
cd /d "%PROJECT_DIR%backend"
start /B "Nucleo-Backend" cmd /c "venv\Scripts\activate.bat && python -m uvicorn server:app --host 0.0.0.0 --port 8001 2>&1"

:: Aguardar backend iniciar
timeout /t 3 /nobreak >nul

:: Iniciar Frontend
echo         Iniciando Frontend (porta 3000)...
cd /d "%PROJECT_DIR%frontend"

:: Configurar variáveis para o frontend
set "PORT=3000"
set "BROWSER=none"

if defined USE_NPM (
    start /B "Nucleo-Frontend" cmd /c "npm start 2>&1"
) else (
    start /B "Nucleo-Frontend" cmd /c "yarn start 2>&1"
)

:: Aguardar frontend iniciar
echo.
echo         Aguardando servidores iniciarem...
echo.

:: Loop de espera com feedback
set /a "WAIT_COUNT=0"
:wait_loop
timeout /t 2 /nobreak >nul
set /a "WAIT_COUNT+=1"

:: Verificar se frontend está respondendo
curl -s -o nul -w "%%{http_code}" http://localhost:3000 >temp_status.txt 2>nul
set /p HTTP_STATUS=<temp_status.txt
del temp_status.txt >nul 2>&1

if "%HTTP_STATUS%"=="200" goto :servers_ready
if %WAIT_COUNT% geq 30 goto :servers_ready

echo         Aguardando... (%WAIT_COUNT%/30)
goto :wait_loop

:servers_ready

:: =====================================================
:: ABRIR NAVEGADOR
:: =====================================================

echo.
echo         Abrindo navegador...
start "" "http://localhost:3000"

:: =====================================================
:: TELA FINAL
:: =====================================================

cls
echo.
echo   ╔═══════════════════════════════════════════════════════════╗
echo   ║                                                           ║
echo   ║     NÚCLEO - Sistema de Gestão de CMV                     ║
echo   ║                                                           ║
echo   ║     SERVIDOR INICIADO COM SUCESSO!                        ║
echo   ║                                                           ║
echo   ╚═══════════════════════════════════════════════════════════╝
echo.
echo   ═══════════════════════════════════════════════════════════
echo.
echo      Acesse o sistema em: http://localhost:3000
echo.
echo      API Backend em:      http://localhost:8001
echo.
echo   ═══════════════════════════════════════════════════════════
echo.
echo      Credenciais padrão:
echo      Usuario: Addad
echo      Senha:   Addad123
echo.
echo   ═══════════════════════════════════════════════════════════
echo.
echo      IMPORTANTE:
echo      - NÃO feche esta janela enquanto estiver usando o sistema
echo      - Para encerrar, pressione qualquer tecla nesta janela
echo.
echo   ═══════════════════════════════════════════════════════════
echo.

:: Manter janela aberta
pause >nul

:: =====================================================
:: ENCERRAR SERVIDORES
:: =====================================================

echo.
echo   Encerrando servidores...

:: Matar processos do backend
taskkill /F /FI "WINDOWTITLE eq Nucleo-Backend*" >nul 2>&1
taskkill /F /IM "uvicorn.exe" >nul 2>&1

:: Matar processos do frontend
taskkill /F /FI "WINDOWTITLE eq Nucleo-Frontend*" >nul 2>&1

:: Matar node na porta 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo   Servidores encerrados.
echo   Obrigado por usar o NÚCLEO!
echo.
timeout /t 3 >nul
exit /b 0
