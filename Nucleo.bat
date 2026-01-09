@echo off
title NUCLEO - Sistema de Gestao de CMV

cd /d "%~dp0"
set "PROJECT_DIR=%~dp0"

cls
echo.
echo ========================================================
echo.
echo     NUCLEO - Sistema de Gestao de CMV
echo.
echo     Iniciando...
echo.
echo ========================================================
echo.

echo [1/6] Verificando Python...

set "PYTHON_EXE="

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto python_ok
)

if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    goto python_ok
)

if exist "C:\Python311\python.exe" (
    set "PYTHON_EXE=C:\Python311\python.exe"
    goto python_ok
)

if exist "C:\Python310\python.exe" (
    set "PYTHON_EXE=C:\Python310\python.exe"
    goto python_ok
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_EXE=python"
    goto python_ok
)

echo.
echo ERRO: Python nao encontrado!
echo.
echo Instale Python 3.11 em: https://python.org
echo Marque "Add Python to PATH" na instalacao
echo.
pause
exit /b 1

:python_ok
echo       OK: Python encontrado
echo.

echo [2/6] Verificando Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Node.js nao encontrado!
    echo.
    echo Instale Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo       OK: Node.js encontrado
echo.

echo [3/6] Verificando Yarn...

where yarn >nul 2>&1
if %errorlevel% neq 0 (
    echo       Yarn nao encontrado. Instalando...
    call npm install -g yarn >nul 2>&1
)

echo       OK: Yarn verificado
echo.

echo [4/6] Configurando Backend...

cd /d "%PROJECT_DIR%backend"

if not exist "venv" (
    echo       Criando ambiente virtual...
    call "%PYTHON_EXE%" -m venv venv
    echo       OK: Ambiente criado
    
    echo       Instalando dependencias backend...
    call venv\Scripts\pip install -r requirements.txt -q
    echo       OK: Dependencias instaladas
) else (
    echo       OK: Ambiente virtual existe
)

echo.

echo [5/6] Configurando Frontend...

cd /d "%PROJECT_DIR%frontend"

if not exist "node_modules" (
    echo       Instalando dependencias frontend...
    call yarn install --silent 2>nul
    if %errorlevel% neq 0 (
        call npm install --silent 2>nul
    )
    echo       OK: Dependencias instaladas
) else (
    echo       OK: Dependencias existem
)

echo.

echo [6/6] Iniciando servidores...

cd /d "%PROJECT_DIR%backend"
start "NUCLEO-Backend" cmd /c "call venv\Scripts\activate.bat && python -m uvicorn server:app --host 0.0.0.0 --port 8001"

timeout /t 3 /nobreak >nul

cd /d "%PROJECT_DIR%frontend"
set "PORT=3000"
set "BROWSER=none"
start "NUCLEO-Frontend" cmd /c "yarn start"

echo.
echo       Aguardando servidores...
timeout /t 15 /nobreak >nul

start "" "http://localhost:3000"

cls
echo.
echo ========================================================
echo.
echo     NUCLEO - SERVIDOR INICIADO!
echo.
echo ========================================================
echo.
echo     Acesse: http://localhost:3000
echo.
echo     Usuario: Addad
echo     Senha:   Addad123
echo.
echo ========================================================
echo.
echo     NAO FECHE ESTA JANELA!
echo.
echo     Pressione qualquer tecla para ENCERRAR o sistema.
echo.
echo ========================================================
echo.

pause >nul

echo.
echo Encerrando servidores...

taskkill /FI "WINDOWTITLE eq NUCLEO-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq NUCLEO-Frontend*" /F >nul 2>&1

echo Servidores encerrados.
echo.
timeout /t 2 >nul
exit /b 0
