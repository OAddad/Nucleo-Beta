#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🍽️  NÚCLEO - Sistema de Gestão de CMV                        ║
║                                                                   ║
║     Launcher Executável para Windows                              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Este script inicia o backend (FastAPI) e frontend (React) do sistema Núcleo.
Pode ser compilado em .exe usando PyInstaller.

Uso:
    python launcher.py          # Executar diretamente
    NucleoLauncher.exe          # Após compilar com PyInstaller
"""

import os
import sys
import subprocess
import time
import webbrowser
import signal
import shutil
from pathlib import Path

# Configurações
BACKEND_PORT = 8001
FRONTEND_PORT = 3000
STARTUP_DELAY = 5  # Segundos para aguardar o servidor iniciar
BROWSER_DELAY = 10  # Segundos antes de abrir o navegador

# Processos globais para cleanup
backend_process = None
frontend_process = None


def print_banner():
    """Exibe banner do sistema"""
    print()
    print("  ╔═══════════════════════════════════════════════════════════╗")
    print("  ║                                                           ║")
    print("  ║     🍽️  NÚCLEO - Sistema de Gestão de CMV                 ║")
    print("  ║                                                           ║")
    print("  ║     Iniciando servidor...                                 ║")
    print("  ║                                                           ║")
    print("  ╚═══════════════════════════════════════════════════════════╝")
    print()


def get_project_root():
    """Encontra o diretório raiz do projeto"""
    # Se executando como .exe, o diretório é onde está o .exe
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    # Se executando como script, é o diretório do script
    return Path(__file__).parent


def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    print("  🔍 Verificando dependências...")
    
    errors = []
    
    # Verificar Python
    python_cmd = find_python()
    if not python_cmd:
        errors.append("  ❌ Python não encontrado. Instale em: https://python.org")
    else:
        print(f"  ✓ Python encontrado: {python_cmd}")
    
    # Verificar Node/Yarn
    node_cmd = find_node()
    if not node_cmd:
        errors.append("  ❌ Node.js não encontrado. Instale em: https://nodejs.org")
    else:
        print(f"  ✓ Node.js encontrado")
    
    yarn_cmd = find_yarn()
    if not yarn_cmd:
        # Yarn não é crítico, pode usar npm
        print("  ⚠️  Yarn não encontrado, tentará usar npm")
    else:
        print(f"  ✓ Yarn encontrado")
    
    if errors:
        print()
        for error in errors:
            print(error)
        print()
        print("  Por favor, instale as dependências necessárias e tente novamente.")
        return False
    
    print()
    return True


def find_python():
    """Encontra o executável Python"""
    for cmd in ['python', 'python3', 'py']:
        if shutil.which(cmd):
            return cmd
    return None


def find_node():
    """Encontra o executável Node"""
    for cmd in ['node', 'nodejs']:
        if shutil.which(cmd):
            return cmd
    return None


def find_yarn():
    """Encontra o executável Yarn"""
    if shutil.which('yarn'):
        return 'yarn'
    return None


def find_npm():
    """Encontra o executável npm"""
    if shutil.which('npm'):
        return 'npm'
    return None


def check_project_structure(root):
    """Verifica se a estrutura do projeto está correta"""
    backend_dir = root / 'backend'
    frontend_dir = root / 'frontend'
    
    if not backend_dir.exists():
        print(f"  ❌ Diretório backend não encontrado em: {backend_dir}")
        return False
    
    if not frontend_dir.exists():
        print(f"  ❌ Diretório frontend não encontrado em: {frontend_dir}")
        return False
    
    if not (backend_dir / 'server.py').exists():
        print(f"  ❌ Arquivo server.py não encontrado em: {backend_dir}")
        return False
    
    if not (frontend_dir / 'package.json').exists():
        print(f"  ❌ Arquivo package.json não encontrado em: {frontend_dir}")
        return False
    
    return True


def start_backend(root):
    """Inicia o servidor backend"""
    global backend_process
    
    print("  📡 Iniciando Backend (FastAPI)...")
    
    backend_dir = root / 'backend'
    python_cmd = find_python()
    
    # Comando para iniciar o backend
    cmd = [python_cmd, '-m', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', str(BACKEND_PORT)]
    
    try:
        # Criar processo sem janela visível (Windows)
        startupinfo = None
        if sys.platform == 'win32':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE
        
        backend_process = subprocess.Popen(
            cmd,
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            startupinfo=startupinfo,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
        )
        
        print(f"  ✓ Backend iniciado (PID: {backend_process.pid})")
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao iniciar backend: {e}")
        return False


def start_frontend(root):
    """Inicia o servidor frontend"""
    global frontend_process
    
    print("  🎨 Iniciando Frontend (React)...")
    
    frontend_dir = root / 'frontend'
    
    # Verificar se node_modules existe
    if not (frontend_dir / 'node_modules').exists():
        print("  ⚠️  node_modules não encontrado. Executando instalação...")
        install_frontend_deps(frontend_dir)
    
    # Comando para iniciar o frontend
    yarn_cmd = find_yarn()
    if yarn_cmd:
        cmd = [yarn_cmd, 'start']
    else:
        npm_cmd = find_npm()
        cmd = [npm_cmd, 'start']
    
    try:
        # Configurar variáveis de ambiente
        env = os.environ.copy()
        env['PORT'] = str(FRONTEND_PORT)
        env['BROWSER'] = 'none'  # Não abrir navegador automaticamente
        
        # Criar processo
        startupinfo = None
        if sys.platform == 'win32':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE
        
        frontend_process = subprocess.Popen(
            cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            startupinfo=startupinfo,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
            shell=True if sys.platform == 'win32' else False
        )
        
        print(f"  ✓ Frontend iniciado (PID: {frontend_process.pid})")
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao iniciar frontend: {e}")
        return False


def install_frontend_deps(frontend_dir):
    """Instala dependências do frontend"""
    print("  📦 Instalando dependências do frontend...")
    
    yarn_cmd = find_yarn()
    if yarn_cmd:
        cmd = [yarn_cmd, 'install']
    else:
        npm_cmd = find_npm()
        cmd = [npm_cmd, 'install']
    
    try:
        subprocess.run(cmd, cwd=str(frontend_dir), check=True, capture_output=True)
        print("  ✓ Dependências instaladas")
    except Exception as e:
        print(f"  ⚠️  Erro ao instalar dependências: {e}")


def open_browser():
    """Abre o navegador no sistema"""
    url = f"http://localhost:{FRONTEND_PORT}"
    print(f"  🌐 Abrindo navegador em {url}...")
    
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"  ⚠️  Não foi possível abrir o navegador: {e}")
        print(f"  → Acesse manualmente: {url}")


def cleanup():
    """Encerra os processos do servidor"""
    global backend_process, frontend_process
    
    print()
    print("  🛑 Encerrando servidor...")
    
    if frontend_process:
        try:
            if sys.platform == 'win32':
                frontend_process.terminate()
            else:
                os.killpg(os.getpgid(frontend_process.pid), signal.SIGTERM)
            frontend_process.wait(timeout=5)
            print("  ✓ Frontend encerrado")
        except:
            frontend_process.kill()
    
    if backend_process:
        try:
            if sys.platform == 'win32':
                backend_process.terminate()
            else:
                os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
            backend_process.wait(timeout=5)
            print("  ✓ Backend encerrado")
        except:
            backend_process.kill()
    
    print("  ✓ Servidor encerrado com sucesso!")
    print()


def signal_handler(signum, frame):
    """Handler para sinais de interrupção"""
    cleanup()
    sys.exit(0)


def main():
    """Função principal"""
    # Registrar handlers de sinal
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    if sys.platform == 'win32':
        signal.signal(signal.SIGBREAK, signal_handler)
    
    # Exibir banner
    print_banner()
    
    # Encontrar diretório do projeto
    root = get_project_root()
    print(f"  📂 Diretório do projeto: {root}")
    print()
    
    # Verificar estrutura do projeto
    if not check_project_structure(root):
        print()
        print("  ❌ Estrutura do projeto inválida!")
        print("  Certifique-se de que o executável está na pasta raiz do projeto.")
        input("\n  Pressione ENTER para sair...")
        return 1
    
    # Verificar dependências
    if not check_dependencies():
        input("\n  Pressione ENTER para sair...")
        return 1
    
    # Iniciar backend
    if not start_backend(root):
        input("\n  Pressione ENTER para sair...")
        return 1
    
    # Aguardar backend iniciar
    print(f"  ⏳ Aguardando backend iniciar ({STARTUP_DELAY}s)...")
    time.sleep(STARTUP_DELAY)
    
    # Iniciar frontend
    if not start_frontend(root):
        cleanup()
        input("\n  Pressione ENTER para sair...")
        return 1
    
    # Aguardar frontend iniciar e abrir navegador
    print(f"  ⏳ Aguardando frontend iniciar ({BROWSER_DELAY}s)...")
    time.sleep(BROWSER_DELAY)
    open_browser()
    
    # Exibir informações
    print()
    print("  ═══════════════════════════════════════════════════════════")
    print()
    print("  ✅ NÚCLEO iniciado com sucesso!")
    print()
    print(f"  🌐 Acesse: http://localhost:{FRONTEND_PORT}")
    print(f"  📡 API:    http://localhost:{BACKEND_PORT}")
    print()
    print("  ═══════════════════════════════════════════════════════════")
    print()
    print("  💡 Para encerrar o servidor:")
    print("     - Feche esta janela")
    print("     - Ou pressione Ctrl+C")
    print()
    
    # Manter o processo rodando
    try:
        while True:
            # Verificar se os processos ainda estão rodando
            if backend_process and backend_process.poll() is not None:
                print("  ⚠️  Backend encerrou inesperadamente!")
                break
            if frontend_process and frontend_process.poll() is not None:
                print("  ⚠️  Frontend encerrou inesperadamente!")
                break
            
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()
    
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as e:
        print(f"\n  ❌ Erro fatal: {e}")
        input("\n  Pressione ENTER para sair...")
        sys.exit(1)
