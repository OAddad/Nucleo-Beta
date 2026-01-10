#!/usr/bin/env python3
"""
Gera icon.ico multi-resolução a partir de um PNG.
Usado pelo CI para garantir que o ícone sempre existe e é válido.
"""
import sys
import os
from pathlib import Path

def main():
    # Encontrar diretórios
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    
    # Arquivos
    source_png = root_dir / "frontend" / "public" / "logo512.png"
    output_ico = root_dir / "build-resources" / "icon.ico"
    
    # Fallback para logo192 se logo512 não existir
    if not source_png.exists():
        source_png = root_dir / "frontend" / "public" / "logo192.png"
    
    if not source_png.exists():
        print(f"ERRO: Nenhum logo PNG encontrado em frontend/public/")
        sys.exit(1)
    
    print(f"Fonte: {source_png}")
    print(f"Destino: {output_ico}")
    
    # Criar diretório de saída
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
    
    # Converter para RGBA se necessário
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Tamanhos para o ICO (Windows padrão)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    
    # Gerar imagens em cada tamanho
    icons = []
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        icons.append(resized)
    
    # Salvar como ICO
    icons[0].save(
        output_ico,
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=icons[1:]
    )
    
    # Verificar resultado
    file_size = output_ico.stat().st_size
    print(f"\n✅ icon.ico gerado com sucesso!")
    print(f"   Tamanho: {file_size:,} bytes")
    print(f"   Resoluções: {sizes}")
    
    if file_size < 1000:
        print("ERRO: Arquivo muito pequeno, algo deu errado!")
        sys.exit(1)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
