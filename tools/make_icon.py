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
    print(f"Imagem fonte: {img.size[0]}x{img.size[1]}, modo: {img.mode}")
    
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
        print(f"  Gerado: {size}x{size}")
    
    # Salvar como ICO - método correto
    # O primeiro ícone salva, os demais são adicionados
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    
    # Salvar usando o método save com sizes
    img_256.save(
        output_ico,
        format='ICO',
        sizes=[(size, size) for size in sizes]
    )
    
    # Verificar resultado
    file_size = output_ico.stat().st_size
    print(f"\n✅ icon.ico gerado!")
    print(f"   Tamanho: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    
    # Ícone Windows válido deve ter pelo menos alguns KB
    if file_size < 1000:
        print("\n⚠️  Arquivo pequeno, tentando método alternativo...")
        
        # Método alternativo: salvar cada tamanho separadamente
        all_sizes = []
        for size in sizes:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            all_sizes.append(resized)
        
        # Usar o maior como base
        all_sizes[-1].save(
            output_ico,
            format='ICO',
            append_images=all_sizes[:-1],
            sizes=[(s, s) for s in sizes]
        )
        
        file_size = output_ico.stat().st_size
        print(f"   Novo tamanho: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    
    if file_size < 500:
        print("\nERRO: Arquivo ainda muito pequeno!")
        sys.exit(1)
    
    print(f"\n✅ icon.ico pronto para uso!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
