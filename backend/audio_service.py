"""
Serviço de Áudio para ChatBot WhatsApp
- Speech-to-Text (STT) usando OpenAI Whisper
- Text-to-Speech (TTS) usando OpenAI TTS
"""
import os
import base64
import tempfile
import uuid
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

# Importar integrações de áudio
try:
    from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False
    print("[AUDIO SERVICE] emergentintegrations não disponível para áudio")

# Configuração
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Diretório para arquivos de áudio temporários
AUDIO_DIR = "/app/backend/audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)


async def transcribe_audio(audio_data: bytes, file_extension: str = "ogg") -> Tuple[bool, str]:
    """
    Transcreve áudio para texto usando OpenAI Whisper.
    
    Args:
        audio_data: Bytes do arquivo de áudio
        file_extension: Extensão do arquivo (ogg, mp3, wav, etc.)
    
    Returns:
        Tuple (sucesso: bool, texto_ou_erro: str)
    """
    if not AUDIO_AVAILABLE or not EMERGENT_LLM_KEY:
        return False, "Serviço de transcrição não disponível"
    
    try:
        import subprocess
        
        # Criar arquivo temporário com o áudio original
        temp_filename = f"{uuid.uuid4()}.{file_extension}"
        temp_path = os.path.join(AUDIO_DIR, temp_filename)
        
        with open(temp_path, "wb") as f:
            f.write(audio_data)
        
        # Se for OGG/OPUS (formato do WhatsApp), converter para MP3
        final_path = temp_path
        if file_extension.lower() in ["ogg", "opus", "oga"]:
            mp3_path = temp_path.replace(f".{file_extension}", ".mp3")
            try:
                # Converter usando ffmpeg
                result = subprocess.run(
                    ["ffmpeg", "-i", temp_path, "-acodec", "libmp3lame", "-y", mp3_path],
                    capture_output=True,
                    timeout=30
                )
                if result.returncode == 0 and os.path.exists(mp3_path):
                    final_path = mp3_path
                    print(f"[AUDIO SERVICE] Convertido {file_extension} para MP3")
                else:
                    print(f"[AUDIO SERVICE] Erro ffmpeg: {result.stderr.decode()[:200]}")
            except Exception as conv_err:
                print(f"[AUDIO SERVICE] Erro na conversão: {conv_err}")
        
        # Inicializar STT
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Transcrever
        with open(final_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="pt"  # Português
            )
        
        # Limpar arquivos temporários
        try:
            os.remove(temp_path)
            if final_path != temp_path:
                os.remove(final_path)
        except:
            pass
        
        return True, response.text
        
    except Exception as e:
        print(f"[AUDIO SERVICE] Erro na transcrição: {e}")
        return False, f"Erro ao transcrever áudio: {str(e)}"


async def transcribe_audio_from_base64(audio_base64: str, file_extension: str = "ogg") -> Tuple[bool, str]:
    """
    Transcreve áudio de uma string base64.
    
    Args:
        audio_base64: String base64 do áudio
        file_extension: Extensão do arquivo
    
    Returns:
        Tuple (sucesso: bool, texto_ou_erro: str)
    """
    try:
        # Remover prefixo data:audio/... se existir
        if "," in audio_base64:
            audio_base64 = audio_base64.split(",")[1]
        
        audio_data = base64.b64decode(audio_base64)
        return await transcribe_audio(audio_data, file_extension)
    except Exception as e:
        return False, f"Erro ao decodificar áudio: {str(e)}"


async def transcribe_audio_from_url(audio_url: str) -> Tuple[bool, str]:
    """
    Transcreve áudio de uma URL.
    
    Args:
        audio_url: URL do arquivo de áudio
    
    Returns:
        Tuple (sucesso: bool, texto_ou_erro: str)
    """
    try:
        import httpx
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(audio_url)
            response.raise_for_status()
            
            # Detectar extensão do arquivo
            content_type = response.headers.get("content-type", "audio/ogg")
            if "opus" in content_type or "ogg" in content_type:
                ext = "ogg"
            elif "mp3" in content_type or "mpeg" in content_type:
                ext = "mp3"
            elif "wav" in content_type:
                ext = "wav"
            elif "m4a" in content_type:
                ext = "m4a"
            else:
                ext = "ogg"  # Default para WhatsApp
            
            return await transcribe_audio(response.content, ext)
            
    except Exception as e:
        return False, f"Erro ao baixar áudio: {str(e)}"


def make_text_natural_for_speech(text: str) -> str:
    """
    Transforma o texto para soar mais natural quando falado.
    Adiciona pausas, hesitações e torna mais conversacional.
    
    Args:
        text: Texto original
    
    Returns:
        Texto modificado para fala natural
    """
    import random
    import re
    
    if not text:
        return text
    
    # Remover emojis (TTS não lê bem)
    text = re.sub(r'[^\w\s\.\,\!\?\:\;\-\(\)\"\'\@\#\$\%\&\*\/\\àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ]', '', text)
    
    # Remover formatação do WhatsApp
    text = re.sub(r'\*([^*]+)\*', r'\1', text)  # *negrito*
    text = re.sub(r'_([^_]+)_', r'\1', text)    # _itálico_
    text = re.sub(r'~([^~]+)~', r'\1', text)    # ~riscado~
    
    # Lista de hesitações naturais para inserir ocasionalmente
    hesitations = ["hmm, ", "então, ", "bom, ", "olha, ", "ah, ", "é, "]
    
    # Lista de conectores naturais
    connectors = [" né, ", " sabe, ", " tá, ", " viu, "]
    
    # Dividir em sentenças
    sentences = re.split(r'([.!?])', text)
    result = []
    
    for i, part in enumerate(sentences):
        if part in '.!?':
            result.append(part)
            continue
            
        if not part.strip():
            continue
        
        sentence = part.strip()
        
        # Adicionar hesitação no início de algumas frases (30% de chance)
        if i > 0 and random.random() < 0.3 and len(sentence) > 20:
            sentence = random.choice(hesitations) + sentence[0].lower() + sentence[1:]
        
        # Adicionar pausa após vírgulas longas
        sentence = re.sub(r',\s*', ', ... ', sentence, count=1) if random.random() < 0.2 else sentence
        
        result.append(sentence)
    
    text = ''.join(result)
    
    # Adicionar pausas naturais (reticências = pausa no TTS)
    text = re.sub(r'\.\s+', '. ... ', text, count=2)  # Pausa entre frases
    
    # Substituir alguns "você" por "cê" para soar mais natural (50% de chance)
    if random.random() < 0.5:
        text = re.sub(r'\bvocê\b', 'cê', text, count=1, flags=re.IGNORECASE)
    
    # Limpar espaços extras
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


async def generate_speech(text: str, voice: str = "nova") -> Tuple[bool, Optional[bytes], str]:
    """
    Gera áudio a partir de texto usando OpenAI TTS.
    
    Args:
        text: Texto para converter em áudio
        voice: Voz a usar (alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer)
    
    Returns:
        Tuple (sucesso: bool, audio_bytes: Optional[bytes], mensagem: str)
    """
    if not AUDIO_AVAILABLE or not EMERGENT_LLM_KEY:
        return False, None, "Serviço de TTS não disponível"
    
    if not text or len(text.strip()) == 0:
        return False, None, "Texto vazio"
    
    # Tornar o texto mais natural para fala
    text = make_text_natural_for_speech(text)
    
    # Limitar texto a 4096 caracteres
    if len(text) > 4096:
        text = text[:4096]
    
    try:
        # Inicializar TTS
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        
        # Gerar áudio
        audio_bytes = await tts.generate_speech(
            text=text,
            model="tts-1",  # Modelo mais rápido para respostas em tempo real
            voice=voice,
            response_format="mp3",
            speed=1.0
        )
        
        return True, audio_bytes, "Áudio gerado com sucesso"
        
    except Exception as e:
        print(f"[AUDIO SERVICE] Erro na geração de áudio: {e}")
        return False, None, f"Erro ao gerar áudio: {str(e)}"


async def generate_speech_base64(text: str, voice: str = "nova") -> Tuple[bool, Optional[str], str]:
    """
    Gera áudio em base64 a partir de texto.
    
    Args:
        text: Texto para converter em áudio
        voice: Voz a usar
    
    Returns:
        Tuple (sucesso: bool, audio_base64: Optional[str], mensagem: str)
    """
    success, audio_bytes, message = await generate_speech(text, voice)
    
    if success and audio_bytes:
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        return True, audio_base64, message
    
    return success, None, message


async def save_audio_file(audio_bytes: bytes, filename: str = None) -> str:
    """
    Salva áudio em arquivo e retorna o caminho.
    
    Args:
        audio_bytes: Bytes do áudio
        filename: Nome do arquivo (opcional)
    
    Returns:
        Caminho do arquivo salvo
    """
    if not filename:
        filename = f"{uuid.uuid4()}.mp3"
    
    filepath = os.path.join(AUDIO_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    
    return filepath


def get_audio_url(filename: str) -> str:
    """
    Retorna a URL para acessar um arquivo de áudio.
    """
    return f"/api/audio/{filename}"


# Vozes disponíveis com descrições
AVAILABLE_VOICES = {
    "alloy": "Neutra e equilibrada",
    "ash": "Clara e articulada", 
    "coral": "Calorosa e amigável",
    "echo": "Suave e calma",
    "fable": "Expressiva, boa para histórias",
    "nova": "Energética e animada",
    "onyx": "Profunda e autoritária",
    "sage": "Sábia e ponderada",
    "shimmer": "Brilhante e alegre"
}

# Voz padrão do chatbot
DEFAULT_VOICE = "nova"
