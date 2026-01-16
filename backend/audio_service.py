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


def number_to_words(n: int) -> str:
    """Converte número para texto por extenso em português"""
    if n == 0:
        return "zero"
    
    units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
             "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
    tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
    hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]
    
    if n < 0:
        return "menos " + number_to_words(-n)
    
    if n < 20:
        return units[n]
    
    if n < 100:
        if n % 10 == 0:
            return tens[n // 10]
        return tens[n // 10] + " e " + units[n % 10]
    
    if n == 100:
        return "cem"
    
    if n < 1000:
        if n % 100 == 0:
            return hundreds[n // 100]
        return hundreds[n // 100] + " e " + number_to_words(n % 100)
    
    if n < 1000000:
        thousands = n // 1000
        remainder = n % 1000
        if thousands == 1:
            result = "mil"
        else:
            result = number_to_words(thousands) + " mil"
        if remainder > 0:
            if remainder < 100:
                result += " e " + number_to_words(remainder)
            else:
                result += " " + number_to_words(remainder)
        return result
    
    return str(n)  # Para números muito grandes, retorna o número


def format_money_for_speech(match) -> str:
    """Formata valor monetário para fala natural"""
    value = match.group(0)
    # Remover R$ e espaços
    value = value.replace("R$", "").replace(" ", "").strip()
    
    # Separar reais e centavos
    if "," in value:
        parts = value.split(",")
        reais = int(parts[0]) if parts[0] else 0
        centavos = int(parts[1][:2]) if len(parts) > 1 and parts[1] else 0
    elif "." in value:
        parts = value.split(".")
        if len(parts[-1]) == 2:  # É centavo
            reais = int(parts[0]) if parts[0] else 0
            centavos = int(parts[1]) if parts[1] else 0
        else:  # É milhar
            reais = int(value.replace(".", ""))
            centavos = 0
    else:
        reais = int(value) if value else 0
        centavos = 0
    
    result = ""
    if reais > 0:
        result = number_to_words(reais) + (" real" if reais == 1 else " reais")
    
    if centavos > 0:
        if result:
            result += " e "
        result += number_to_words(centavos) + (" centavo" if centavos == 1 else " centavos")
    
    if not result:
        result = "zero reais"
    
    return result


def format_time_for_speech(match) -> str:
    """Formata horário para fala natural"""
    time_str = match.group(0)
    parts = time_str.replace("h", ":").replace("H", ":").split(":")
    
    hours = int(parts[0]) if parts[0] else 0
    minutes = int(parts[1]) if len(parts) > 1 and parts[1] else 0
    
    if minutes == 0:
        return number_to_words(hours) + " horas"
    elif minutes == 30:
        return number_to_words(hours) + " e meia"
    else:
        return number_to_words(hours) + " e " + number_to_words(minutes)


def format_phone_for_speech(match) -> str:
    """Formata telefone para fala natural com pausas"""
    phone = match.group(0)
    # Remover caracteres não numéricos
    digits = ''.join(filter(str.isdigit, phone))
    
    # Falar dígito por dígito com pausas
    result = []
    for i, digit in enumerate(digits):
        digit_words = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"]
        result.append(digit_words[int(digit)])
        # Adicionar pausa a cada 2-3 dígitos
        if i in [1, 4, 8] and i < len(digits) - 1:
            result.append("...")
    
    return " ".join(result)


def make_text_natural_for_speech(text: str) -> str:
    """
    Transforma o texto para soar mais natural quando falado.
    Adiciona pausas, hesitações, converte números e torna mais conversacional.
    
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
    
    # CONVERTER NÚMEROS PARA TEXTO
    
    # Valores monetários: R$ 25,90 → vinte e cinco reais e noventa centavos
    text = re.sub(r'R\$\s*[\d\.,]+', format_money_for_speech, text)
    
    # Horários: 08:30, 18h30 → oito e trinta
    text = re.sub(r'\b(\d{1,2})[h:](\d{2})\b', format_time_for_speech, text)
    
    # Telefones: (34) 99672-7535 → três quatro... nove nove...
    text = re.sub(r'\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4}', format_phone_for_speech, text)
    
    # Números simples (1-999) → por extenso
    def replace_number(match):
        num = int(match.group(0))
        if 1 <= num <= 999:
            return number_to_words(num)
        return match.group(0)
    
    text = re.sub(r'\b(\d{1,3})\b', replace_number, text)
    
    # TORNAR MAIS NATURAL
    
    # Lista de hesitações naturais para inserir ocasionalmente
    hesitations = ["hmm... ", "então... ", "bom... ", "olha... ", "ah... ", "é... ", "tipo... "]
    
    # Lista de conectores naturais
    fillers = [" né", " sabe", " viu", " tá"]
    
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
        
        # Adicionar hesitação no início de algumas frases (25% de chance)
        if i > 0 and random.random() < 0.25 and len(sentence) > 15:
            sentence = random.choice(hesitations) + sentence[0].lower() + sentence[1:]
        
        # Adicionar filler no meio de frases longas (20% de chance)
        if random.random() < 0.2 and "," in sentence:
            parts = sentence.split(",", 1)
            if len(parts) == 2 and len(parts[0]) > 10:
                sentence = parts[0] + random.choice(fillers) + "," + parts[1]
        
        result.append(sentence)
    
    text = ''.join(result)
    
    # Adicionar pausas naturais (reticências = pausa no TTS)
    text = re.sub(r'\.\s*', '... ', text)  # Pausa entre frases
    text = re.sub(r'!\s*', '!... ', text)  # Pausa após exclamação
    text = re.sub(r'\?\s*', '?... ', text)  # Pausa após pergunta
    
    # Substituir alguns "você" por "cê" para soar mais natural (40% de chance)
    if random.random() < 0.4:
        text = re.sub(r'\bvocê\b', 'cê', text, count=1, flags=re.IGNORECASE)
    
    # Substituir "está" por "tá" ocasionalmente
    if random.random() < 0.3:
        text = re.sub(r'\bestá\b', 'tá', text, count=1, flags=re.IGNORECASE)
    
    # Substituir "para" por "pra" ocasionalmente
    if random.random() < 0.4:
        text = re.sub(r'\bpara\b', 'pra', text, count=2, flags=re.IGNORECASE)
    
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
