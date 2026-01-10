"""
Script para empacotar o backend Núcleo com PyInstaller
"""
import subprocess
import sys
import os
from pathlib import Path

def main():
    # Diretório do script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("="*50)
    print("Núcleo - Build do Backend")
    print("="*50)
    
    # Verificar PyInstaller
    try:
        import PyInstaller
        print(f"PyInstaller versão: {PyInstaller.__version__}")
    except ImportError:
        print("Instalando PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # Criar diretório de saída
    output_dir = script_dir.parent / "desktop-build" / "backend"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Executar PyInstaller
    print("\nEmpacotando backend...")
    
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--distpath", str(output_dir),
        "--workpath", str(script_dir / "build"),
        "--specpath", str(script_dir),
        "nucleo-backend.spec"
    ]
    
    result = subprocess.run(cmd, cwd=str(script_dir))
    
    if result.returncode == 0:
        print("\n" + "="*50)
        print("BUILD CONCLUÍDO COM SUCESSO!")
        print(f"Executável em: {output_dir}")
        print("="*50)
    else:
        print("\nERRO no build!")
        sys.exit(1)

if __name__ == "__main__":
    main()
