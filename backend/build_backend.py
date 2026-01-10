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
    # IMPORTANTE: Quando usar .spec, NÃO passar --specpath ou outras opções de makespec
    print("\nEmpacotando backend...")
    print(f"Spec file: {script_dir / 'nucleo-backend.spec'}")
    print(f"Output dir: {output_dir}")
    
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--distpath", str(output_dir),
        "--workpath", str(script_dir / "build"),
        str(script_dir / "nucleo-backend.spec")
    ]
    
    print(f"\nComando: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, cwd=str(script_dir))
    
    if result.returncode == 0:
        # Verificar se o executável foi gerado
        exe_path = output_dir / "nucleo-backend.exe"
        exe_path_linux = output_dir / "nucleo-backend"
        
        if exe_path.exists():
            print("\n" + "="*50)
            print("BUILD CONCLUÍDO COM SUCESSO!")
            print(f"Executável: {exe_path}")
            print(f"Tamanho: {exe_path.stat().st_size / 1024 / 1024:.2f} MB")
            print("="*50)
        elif exe_path_linux.exists():
            print("\n" + "="*50)
            print("BUILD CONCLUÍDO COM SUCESSO!")
            print(f"Executável: {exe_path_linux}")
            print(f"Tamanho: {exe_path_linux.stat().st_size / 1024 / 1024:.2f} MB")
            print("="*50)
        else:
            print("\n" + "="*50)
            print("BUILD CONCLUÍDO!")
            print(f"Output em: {output_dir}")
            print("="*50)
    else:
        print("\nERRO no build!")
        sys.exit(1)

if __name__ == "__main__":
    main()
