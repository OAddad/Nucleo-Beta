@echo off
echo ========================================
echo   Nucleo Print Connector - Build
echo ========================================
echo.

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo [2/3] Instalando pkg globalmente...
call npm install -g pkg
if errorlevel 1 (
    echo AVISO: pkg pode ja estar instalado
)

echo.
echo [3/3] Gerando executavel...
call npx pkg . --targets node18-win-x64 --output dist/NucleoPrintConnector.exe
if errorlevel 1 (
    echo ERRO: Falha ao gerar executavel
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD CONCLUIDO!
echo   Arquivo: dist/NucleoPrintConnector.exe
echo ========================================
pause
