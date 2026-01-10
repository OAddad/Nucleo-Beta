#!/usr/bin/env python3
"""
Gera icon.ico multi-resolucao a partir de um PNG.
Usado pelo CI para garantir que o icone sempre existe e e valido.
"""
import sys
import os
from pathlib import Path

def main():
    # Encontrar diretorios
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    
    # Arquivos
    source_png = root_dir / "frontend" / "public" / "logo512.png"
    output_ico = root_dir / "build-resources" / "icon.ico"
    
    # Fallback para logo192 se logo512 nao existir
    if not source_png.exists():
        source_png = root_dir / "frontend" / "public" / "logo192.png"
    
    if not source_png.exists():
        print("ERRO: Nenhum logo PNG encontrado em frontend/public/")
        sys.exit(1)
    
    print("Fonte: {}".format(source_png))
    print("Destino: {}".format(output_ico))
    
    # Criar diretorio de saida
    output_ico.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        from PIL import Image
    except ImportError:
        print("Instalando Pillow...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "Pillow"], check=True)
        from PIL import Image
    
    # Abrir imagem fonte
    img = Image.open(source_png)
    print("Imagem fonte: {}x{}, modo: {}".format(img.size[0], img.size[1], img.mode))
    
    # Converter para RGBA se necessario
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Tamanhos para o ICO (Windows padrao)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    
    # Gerar imagens em cada tamanho
    icons = []
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        icons.append(resized)
        print("  Gerado: {}x{}".format(size, size))
    
    # Salvar como ICO
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    
    img_256.save(
        output_ico,
        format='ICO',
        sizes=[(size, size) for size in sizes]
    )
    
    # Verificar resultado
    file_size = output_ico.stat().st_size
    print("")
    print("[OK] icon.ico gerado!")
    print("   Tamanho: {} bytes ({:.1f} KB)".format(file_size, file_size/1024))
    
    # Icone Windows valido deve ter pelo menos alguns KB
    if file_size < 1000:
        print("")
        print("[WARN] Arquivo pequeno, tentando metodo alternativo...")
        
        all_sizes = []
        for size in sizes:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            all_sizes.append(resized)
        
        all_sizes[-1].save(
            output_ico,
            format='ICO',
            append_images=all_sizes[:-1],
            sizes=[(s, s) for s in sizes]
        )
        
        file_size = output_ico.stat().st_size
        print("   Novo tamanho: {} bytes ({:.1f} KB)".format(file_size, file_size/1024))
    
    if file_size < 500:
        print("")
        print("ERRO: Arquivo ainda muito pequeno!")
        sys.exit(1)
    
    print("")
    print("[OK] icon.ico pronto para uso!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
