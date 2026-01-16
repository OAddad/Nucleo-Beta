"""
Serviço de IA para ChatBot WhatsApp
Integração com LLM para respostas humanizadas e contextuais
Suporte a áudio: STT (Whisper) e TTS (OpenAI)
Sistema de alerta para pedidos de atendimento humano
"""
import os
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any, Tuple
from dotenv import load_dotenv

load_dotenv()

# Importar integração LLM
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("[CHATBOT AI] emergentintegrations não disponível")

# Importar serviço de áudio
try:
    import audio_service
    AUDIO_AVAILABLE = audio_service.AUDIO_AVAILABLE
except ImportError:
    AUDIO_AVAILABLE = False
    print("[CHATBOT AI] audio_service não disponível")

import database as db

# Configuração
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Cache de instâncias de chat por sessão
chat_instances: Dict[str, LlmChat] = {}

# Cache de pausas por telefone (quando atendente humano intervém)
# Formato: {phone: datetime_expiracao}
human_intervention_pauses: Dict[str, datetime] = {}

# Fila de clientes aguardando atendimento humano
# Formato: {phone: {"push_name": str, "timestamp": datetime, "message": str}}
waiting_for_human: Dict[str, Dict[str, Any]] = {}

# Palavras-chave que indicam pedido de atendimento humano
HUMAN_ASSISTANCE_KEYWORDS = [
    # Português
    "falar com atendente",
    "falar com humano",
    "falar com alguem",
    "falar com alguém",
    "falar com pessoa",
    "falar com funcionario",
    "falar com funcionário",
    "quero atendente",
    "quero humano",
    "quero pessoa",
    "atendente humano",
    "atendimento humano",
    "pessoa real",
    "humano por favor",
    "preciso de ajuda",
    "me ajuda",
    "nao entendi",
    "não entendi",
    "nao entendo",
    "não entendo",
    "voce e um robo",
    "você é um robô",
    "voce é robo",
    "isso é bot",
    "isso e bot",
    "falar com gerente",
    "falar com responsavel",
    "falar com responsável",
    "chamar alguem",
    "chamar alguém",
    "transferir atendimento",
    "atendente",
    "operador",
    "suporte humano",
]


def check_human_assistance_request(message: str) -> bool:
    """
    Verifica se a mensagem indica pedido de atendimento humano.
    
    Args:
        message: Texto da mensagem (pode ser transcrita de áudio)
    
    Returns:
        True se o cliente está pedindo atendimento humano
    """
    if not message:
        return False
    
    message_lower = message.lower().strip()
    
    # Verificar palavras-chave
    for keyword in HUMAN_ASSISTANCE_KEYWORDS:
        if keyword in message_lower:
            return True
    
    return False


def add_to_waiting_queue(phone: str, push_name: str, message: str) -> Dict[str, Any]:
    """
    Adiciona cliente à fila de espera por atendimento humano.
    
    Args:
        phone: Número do telefone
        push_name: Nome do cliente
        message: Mensagem que disparou o pedido
    
    Returns:
        Informações do cliente na fila
    """
    waiting_for_human[phone] = {
        "push_name": push_name or "Cliente",
        "timestamp": datetime.now(timezone.utc),
        "message": message[:200] if message else "",  # Limitar tamanho
        "phone": phone
    }
    print(f"[CHATBOT AI] Cliente {push_name} ({phone}) aguardando atendimento humano")
    return waiting_for_human[phone]


def remove_from_waiting_queue(phone: str) -> bool:
    """
    Remove cliente da fila de espera (quando atendente intervém).
    
    Args:
        phone: Número do telefone
    
    Returns:
        True se foi removido, False se não estava na fila
    """
    if phone in waiting_for_human:
        del waiting_for_human[phone]
        print(f"[CHATBOT AI] Cliente {phone} removido da fila de espera")
        return True
    return False


def get_waiting_queue() -> List[Dict[str, Any]]:
    """
    Retorna a lista de clientes aguardando atendimento humano.
    
    Returns:
        Lista de dicts com informações dos clientes
    """
    result = []
    for phone, data in waiting_for_human.items():
        result.append({
            "phone": phone,
            "push_name": data.get("push_name", "Cliente"),
            "timestamp": data.get("timestamp").isoformat() if data.get("timestamp") else None,
            "message": data.get("message", ""),
            "waiting_time_seconds": (datetime.now(timezone.utc) - data.get("timestamp", datetime.now(timezone.utc))).total_seconds() if data.get("timestamp") else 0
        })
    return sorted(result, key=lambda x: x.get("timestamp") or "", reverse=False)


def is_waiting_for_human(phone: str) -> bool:
    """Verifica se o cliente está na fila de espera"""
    return phone in waiting_for_human


def get_human_assistance_response() -> str:
    """Retorna a mensagem padrão quando cliente pede atendimento humano"""
    settings = db.get_all_settings()
    default_msg = "Entendi! Vou chamar um atendente humano para te ajudar. Por favor, aguarde um momento... 🙋‍♂️"
    return settings.get('human_assistance_message', default_msg)


def get_bot_pause_message() -> str:
    """Retorna a mensagem de pausa do bot (configurável)"""
    settings = db.get_all_settings()
    default_msg = "Opa, vi que um atendente humano começou o atendimento! Núcleo-Vox pausado por 15 minutos. 🤖➡️👤"
    return settings.get('bot_pause_message', default_msg)


def get_bot_pause_duration() -> int:
    """Retorna a duração da pausa em minutos (configurável)"""
    settings = db.get_all_settings()
    try:
        return int(settings.get('bot_pause_duration', '15'))
    except:
        return 15


def is_bot_paused_for_phone(phone: str) -> bool:
    """Verifica se o bot está pausado para este telefone"""
    if phone in human_intervention_pauses:
        if datetime.now(timezone.utc) < human_intervention_pauses[phone]:
            return True
        else:
            # Pausa expirou, remover
            del human_intervention_pauses[phone]
    return False


def pause_bot_for_phone(phone: str) -> str:
    """Pausa o bot para este telefone e retorna a mensagem de pausa"""
    duration = get_bot_pause_duration()
    human_intervention_pauses[phone] = datetime.now(timezone.utc) + timedelta(minutes=duration)
    
    # Remover da fila de espera quando atendente intervém
    remove_from_waiting_queue(phone)
    
    # Substituir [TEMPO] pela duração na mensagem
    message = get_bot_pause_message()
    message = re.sub(r'\[TEMPO\]', str(duration), message, flags=re.IGNORECASE)
    return message


def resume_bot_for_phone(phone: str) -> bool:
    """Remove a pausa do bot para este telefone"""
    if phone in human_intervention_pauses:
        del human_intervention_pauses[phone]
        return True
    return False


def replace_variables_in_response(response_text: str, phone: str, push_name: str = "") -> str:
    """
    Substitui variáveis/comandos na resposta por valores reais.
    
    Variáveis disponíveis:
    - [NOME-DO-CLIENTE] ou [NOME-CLIENTE] - Nome do cliente
    - [DELIVERY-URL] - URL do cardápio digital
    - [ENDERECO] - Endereço da empresa
    - [HORARIOS] - Horários de funcionamento
    - [CODIGO-PEDIDO] ou [ULTIMO-PEDIDO] - Código do último pedido do cliente
    - [TELEFONE-EMPRESA] - Telefone da empresa
    - [NOME-EMPRESA] - Nome da empresa
    - [INSTAGRAM] - Instagram da empresa
    """
    
    # Buscar configurações
    settings = db.get_all_settings()
    business_hours = db.get_all_business_hours()
    
    # Dados da empresa
    nome_empresa = settings.get('company_name', settings.get('company_fantasy_name', 'Núcleo'))
    endereco = settings.get('company_address', 'Endereço não configurado')
    telefone_empresa = settings.get('company_phone', '')
    instagram = settings.get('company_instagram', '')
    delivery_url = settings.get('delivery_url', settings.get('cardapio_url', ''))
    
    # Formatar horários
    horarios = []
    for h in business_hours:
        if h.get('is_open'):
            horario = f"{h['day_name']}: {h['opening_time']} às {h['closing_time']}"
            if h.get('has_second_period'):
                horario += f" e {h['opening_time_2']} às {h['closing_time_2']}"
            horarios.append(horario)
        else:
            horarios.append(f"{h['day_name']}: Fechado")
    horarios_texto = "\n".join(horarios) if horarios else "Horários não configurados"
    
    # Buscar dados do cliente
    nome_cliente = push_name or "Cliente"
    codigo_pedido = ""
    
    # Limpar telefone para busca
    phone_clean = re.sub(r'\D', '', phone)
    if '@s.whatsapp.net' in phone:
        phone_clean = phone.replace('@s.whatsapp.net', '')
        phone_clean = re.sub(r'\D', '', phone_clean)
    
    # Buscar cliente no banco
    clientes = db.get_all_clientes()
    cliente = None
    for c in clientes:
        c_phone = re.sub(r'\D', '', c.get('telefone', ''))
        if c_phone == phone_clean or phone_clean.endswith(c_phone[-8:]) or c_phone.endswith(phone_clean[-8:]):
            cliente = c
            nome_cliente = c.get('nome', nome_cliente)
            break
    
    # Buscar último pedido do cliente
    if cliente:
        pedidos = db.get_all_pedidos()
        pedidos_cliente = [p for p in pedidos if p.get('cliente_id') == cliente.get('id')]
        if pedidos_cliente:
            pedidos_cliente.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            ultimo_pedido = pedidos_cliente[0]
            codigo_pedido = ultimo_pedido.get('numero_pedido', ultimo_pedido.get('id', '')[:8])
    
    # Substituir variáveis (case-insensitive)
    replacements = {
        r'\[NOME[_-]?DO[_-]?CLIENTE\]': nome_cliente,
        r'\[NOME[_-]?CLIENTE\]': nome_cliente,
        r'\[CLIENTE\]': nome_cliente,
        r'\[DELIVERY[_-]?URL\]': delivery_url,
        r'\[CARDAPIO[_-]?URL\]': delivery_url,
        r'\[URL\]': delivery_url,
        r'\[ENDERECO\]': endereco,
        r'\[ENDEREÇO\]': endereco,
        r'\[HORARIOS\]': horarios_texto,
        r'\[HORÁRIOS\]': horarios_texto,
        r'\[CODIGO[_-]?PEDIDO\]': codigo_pedido,
        r'\[CÓDIGO[_-]?PEDIDO\]': codigo_pedido,
        r'\[ULTIMO[_-]?PEDIDO\]': codigo_pedido,
        r'\[ÚLTIMO[_-]?PEDIDO\]': codigo_pedido,
        r'\[PEDIDO\]': codigo_pedido,
        r'\[TELEFONE[_-]?EMPRESA\]': telefone_empresa,
        r'\[TELEFONE\]': telefone_empresa,
        r'\[NOME[_-]?EMPRESA\]': nome_empresa,
        r'\[EMPRESA\]': nome_empresa,
        r'\[INSTAGRAM\]': instagram,
    }
    
    result = response_text
    for pattern, value in replacements.items():
        result = re.sub(pattern, value or '', result, flags=re.IGNORECASE)
    
    return result


def get_system_prompt(for_audio_response: bool = False) -> str:
    """Retorna o prompt do sistema com informações do restaurante
    
    Args:
        for_audio_response: Se True, inclui instruções para gerar texto no formato de fala humana
    """
    
    # Buscar configurações do sistema
    settings = db.get_all_settings()
    business_hours = db.get_all_business_hours()
    
    # Buscar dados da empresa configurados pelo usuário
    nome_empresa = settings.get('company_name', 'Núcleo')
    slogan = settings.get('slogan', 'O Centro da sua Gestão')
    nome_fantasia = settings.get('company_fantasy_name', nome_empresa)
    endereco = settings.get('company_address', 'Endereço não configurado')
    telefone = settings.get('company_phone', 'Telefone não configurado')
    email = settings.get('company_email', '')
    instagram = settings.get('company_instagram', '')
    facebook = settings.get('company_facebook', '')
    
    # Nome do chatbot configurável
    nome_chatbot = settings.get('chatbot_name', 'Ana')
    
    # Formatar horários
    horarios_formatados = []
    for h in business_hours:
        if h.get('is_open'):
            horario = f"- {h['day_name']}: {h['opening_time']} às {h['closing_time']}"
            if h.get('has_second_period'):
                horario += f" e {h['opening_time_2']} às {h['closing_time_2']}"
            horarios_formatados.append(horario)
        else:
            horarios_formatados.append(f"- {h['day_name']}: Fechado")
    
    # Buscar categorias e produtos para cardápio
    categorias = db.get_all_categories()
    produtos = db.get_all_products()
    
    cardapio = []
    for cat in categorias:
        prods_cat = [p for p in produtos if p.get('category') == cat['name']]
        if prods_cat:
            cardapio.append(f"\n**{cat['name']}:**")
            for p in prods_cat[:10]:  # Limitar a 10 por categoria
                preco = p.get('selling_price', 0)
                cardapio.append(f"  - {p['name']}: R$ {preco:.2f}")
    
    # Construir informações de contato
    contatos = []
    if endereco and endereco != 'Endereço não configurado':
        contatos.append(f"Endereço: {endereco}")
    if telefone and telefone != 'Telefone não configurado':
        contatos.append(f"Telefone: {telefone}")
    if email:
        contatos.append(f"Email: {email}")
    if instagram:
        contatos.append(f"Instagram: {instagram}")
    if facebook:
        contatos.append(f"Facebook: {facebook}")
    
    contatos_texto = "\n".join(contatos) if contatos else "Informações de contato não configuradas"
    
    # Instruções para resposta em áudio (fala humana natural)
    audio_instructions = ""
    if for_audio_response:
        audio_instructions = """

=== REGRA CRÍTICA: FORMATO DE FALA HUMANA ===
ESTA RESPOSTA SERÁ LIDA EM VOZ ALTA. NÃO ESCREVA COMO TEXTO.
ESCREVA EXATAMENTE COMO VOCÊ FALARIA COM A BOCA.

OBRIGATÓRIO - NÚMEROS POR EXTENSO:
- Horários: "08:30" → "oito e meia da manhã" | "23:00" → "onze da noite"
- Valores: "R$ 25,90" → "vinte e cinco e noventa"
- Endereços: "411" → "quatrocentos e onze"
- Telefones: dígito por dígito com pausas

OBRIGATÓRIO - ESTRUTURA DE FALA:
- NUNCA liste horários em formato escrito (Segunda: 08:30...)
- Em vez disso: "a gente abre todo dia às oito e meia... e fecha às onze da noite, menos domingo que fecha um pouco antes"
- Use "..." para pausas naturais
- Use hesitações: "hum...", "é...", "então...", "olha só..."
- Use gírias: "tá", "cê", "pra", "beleza", "fechou"

PROIBIDO:
- Listas com dias da semana separados
- Formato "XX:XX" para horários
- Formato "R$ XX,XX" para valores
- Emojis
- Marcadores de lista (-, *, •)

EXEMPLO CORRETO:
"Então... a gente funciona de segunda a sábado das oito e meia até quase meia-noite... e domingo fecha um pouquinho mais cedo, lá pelas onze horas, tá?"
"""
    
    base_prompt = f"""Você é {nome_chatbot}, atendente virtual do {nome_fantasia if nome_fantasia else nome_empresa}.
{f'Nosso slogan é: "{slogan}"' if slogan else ''}

SEU COMPORTAMENTO:
- Você é um HUMANO real trabalhando no atendimento, NUNCA diga que é um robô, IA ou assistente virtual
- Se perguntarem seu nome, responda: "Meu nome é {nome_chatbot}, prazer!"
- Seja natural, use linguagem coloquial brasileira
- Use "cê", "tb", "pra", "tá" etc como um atendente real faria
- NÃO use saudações em TODA mensagem - apenas na primeira ou quando fizer sentido
- Mantenha o contexto da conversa, não repita informações já dadas
- Responda de forma curta e direta
{audio_instructions}

REGRAS IMPORTANTES:
- NUNCA use menus numerados como "digite 1 para...", "digite 2 para..."
- NUNCA se apresente novamente se já fez isso na conversa
- NUNCA repita saudações como "Olá! Bem-vindo" em toda mensagem
- Se o cliente já está conversando, vá direto ao ponto
- Seja proativo mas não repetitivo

REGRA CRÍTICA SOBRE STATUS DE PEDIDOS:
- SEMPRE use APENAS os dados REAIS fornecidos no CONTEXTO DO CLIENTE
- NUNCA invente ou suponha status de pedidos
- Se o cliente perguntar sobre um pedido, use EXATAMENTE o status mostrado na lista de PEDIDOS RECENTES
- Os status possíveis são:
  * aguardando_aceite = pedido foi recebido, aguardando confirmação do restaurante
  * producao = pedido sendo preparado na cozinha
  * pronto = pedido pronto, aguardando entrega ou retirada
  * na_bag = pedido embalado, aguardando entregador
  * em_rota = entregador saiu para entrega
  * concluido = pedido entregue
  * cancelado = pedido foi cancelado
- Se não encontrar o pedido na lista, diga que vai verificar e sugira entrar em contato pelo telefone

INFORMAÇÕES DA EMPRESA:
Nome: {nome_fantasia if nome_fantasia else nome_empresa}
{contatos_texto}

HORÁRIOS DE FUNCIONAMENTO:
{chr(10).join(horarios_formatados) if horarios_formatados else "Horários não configurados"}

CARDÁPIO RESUMIDO:
{chr(10).join(cardapio) if cardapio else "Cardápio em atualização"}

O QUE VOCÊ PODE FAZER:
- Consultar pedidos pelo número ou telefone do cliente
- Informar status de entregas
- Mostrar o cardápio
- Tirar dúvidas sobre produtos
- Registrar reclamações e sugestões

Se o cliente quiser fazer um pedido, oriente a usar o app/site ou pergunte se quer falar com um atendente humano.

LEMBRE-SE: Você está em uma conversa contínua via WhatsApp. Não recomece a conversa, continue de onde parou."""
    
    return base_prompt


async def get_client_context(phone: str) -> Dict[str, Any]:
    """Busca contexto do cliente no banco de dados"""
    context = {
        "cliente": None,
        "pedidos_recentes": [],
        "endereco_principal": None
    }
    
    # Limpar telefone
    phone_clean = re.sub(r'\D', '', phone)
    if phone_clean.endswith('@s.whatsapp.net'):
        phone_clean = phone_clean.replace('@s.whatsapp.net', '')
    
    # Buscar cliente por telefone
    clientes = db.get_all_clientes()
    cliente = None
    for c in clientes:
        c_phone = re.sub(r'\D', '', c.get('telefone', ''))
        if c_phone == phone_clean or phone_clean.endswith(c_phone) or c_phone.endswith(phone_clean[-8:]):
            cliente = c
            break
    
    if cliente:
        context["cliente"] = {
            "id": cliente.get('id'),
            "nome": cliente.get('nome'),
            "telefone": cliente.get('telefone')
        }
        
        # Buscar pedidos recentes do cliente
        pedidos = db.get_all_pedidos()
        pedidos_cliente = [p for p in pedidos if p.get('cliente_id') == cliente.get('id')]
        pedidos_cliente.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        for p in pedidos_cliente[:5]:  # Últimos 5 pedidos
            context["pedidos_recentes"].append({
                "numero": p.get('numero_pedido', p.get('id', '')[:8]),
                "status": p.get('status', 'desconhecido'),
                "total": p.get('total', 0),
                "data": p.get('created_at', ''),
                "itens": p.get('itens', []),
                "entregador": p.get('entregador_nome')
            })
        
        # Buscar endereço principal
        enderecos = db.get_client_addresses(cliente.get('id'))
        if enderecos:
            end_principal = next((e for e in enderecos if e.get('is_default')), enderecos[0])
            context["endereco_principal"] = {
                "rua": end_principal.get('street'),
                "numero": end_principal.get('number'),
                "bairro": end_principal.get('neighborhood'),
                "complemento": end_principal.get('complement')
            }
    
    return context


def format_context_for_llm(context: Dict[str, Any]) -> str:
    """Formata o contexto do cliente para incluir na mensagem do LLM"""
    parts = []
    
    if context.get("cliente"):
        c = context["cliente"]
        parts.append(f"CLIENTE IDENTIFICADO: {c['nome']} (Tel: {c['telefone']})")
    
    if context.get("pedidos_recentes"):
        parts.append("\nPEDIDOS RECENTES DO CLIENTE:")
        for p in context["pedidos_recentes"]:
            status_emoji = {
                "aguardando_aceite": "🕐",
                "producao": "👨‍🍳",
                "pronto": "✅",
                "na_bag": "📦",
                "em_rota": "🛵",
                "concluido": "✔️",
                "cancelado": "❌"
            }.get(p["status"], "❓")
            
            parts.append(f"  - Pedido #{p['numero']}: {status_emoji} {p['status'].replace('_', ' ').title()}")
            parts.append(f"    Total: R$ {p['total']:.2f}")
            if p.get('entregador'):
                parts.append(f"    Entregador: {p['entregador']}")
    
    if context.get("endereco_principal"):
        e = context["endereco_principal"]
        parts.append(f"\nENDEREÇO CADASTRADO: {e['rua']}, {e['numero']} - {e['bairro']}")
        if e.get('complemento'):
            parts.append(f"  Complemento: {e['complemento']}")
    
    return "\n".join(parts) if parts else "Cliente não identificado no sistema."


async def process_message(phone: str, message: str, push_name: str = "", for_audio_response: bool = False) -> str:
    """Processa uma mensagem e retorna a resposta da IA
    
    Args:
        phone: Número do telefone
        message: Mensagem do usuário
        push_name: Nome do usuário no WhatsApp
        for_audio_response: Se True, gera resposta no formato de fala humana para TTS
    """
    
    try:
        # Buscar ou criar conversa
        conversation = db.get_conversation_by_phone(phone)
        now = datetime.now(timezone.utc).isoformat()
        
        if not conversation:
            import uuid
            conversation = {
                "id": str(uuid.uuid4()),
                "phone": phone,
                "client_name": push_name,
                "status": "active",
                "context": "{}",
                "created_at": now,
                "updated_at": now
            }
            db.create_conversation(conversation)
        else:
            # Atualizar timestamp
            db.update_conversation(conversation["id"], {"updated_at": now})
        
        # Salvar mensagem do usuário
        import uuid
        db.add_conversation_message({
            "id": str(uuid.uuid4()),
            "conversation_id": conversation["id"],
            "role": "user",
            "content": message,
            "created_at": now
        })
        
        # =====================================================
        # VERIFICAR RESPOSTAS POR PALAVRAS-CHAVE PRIMEIRO
        # =====================================================
        keyword_response = db.find_keyword_response_for_message(message)
        if keyword_response:
            response_text = keyword_response['response']
            
            # Substituir variáveis na resposta
            response_text = replace_variables_in_response(response_text, phone, push_name)
            
            # Salvar resposta do bot
            db.add_conversation_message({
                "id": str(uuid.uuid4()),
                "conversation_id": conversation["id"],
                "role": "assistant",
                "content": response_text,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return response_text
        # =====================================================
        
        # Se não encontrou palavra-chave, usar IA
        if not LLM_AVAILABLE or not EMERGENT_LLM_KEY:
            return "Desculpe, nosso sistema de atendimento está temporariamente indisponível. Por favor, tente novamente em alguns minutos ou entre em contato pelo telefone."
        
        # Buscar contexto do cliente
        client_context = await get_client_context(phone)
        context_text = format_context_for_llm(client_context)
        
        # Atualizar nome do cliente se identificado
        if client_context.get("cliente") and not conversation.get("client_name"):
            db.update_conversation(conversation["id"], {
                "client_name": client_context["cliente"]["nome"],
                "client_id": client_context["cliente"]["id"]
            })
        
        # Buscar histórico recente da conversa
        history = db.get_conversation_messages(conversation["id"], limit=10)
        
        # Criar ou recuperar instância de chat
        session_id = f"whatsapp_{phone}"
        
        # Sempre recriar a instância para garantir prompt atualizado
        # Se for resposta de áudio, usar prompt com instruções de fala humana
        system_prompt = get_system_prompt(for_audio_response=for_audio_response)
        chat_instances[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        chat = chat_instances[session_id]
        
        # Construir histórico de conversa para contexto
        history_text = ""
        if history and len(history) > 1:
            # Tem histórico, incluir para manter contexto
            history_items = []
            for msg in reversed(history[:-1]):  # Excluir a última (mensagem atual)
                role = "Cliente" if msg.get('role') == 'user' else "Você"
                history_items.append(f"{role}: {msg.get('content', '')}")
            
            if history_items:
                history_text = f"""
HISTÓRICO DA CONVERSA (continue naturalmente, NÃO repita saudações):
{chr(10).join(history_items[-6:])}
---
"""
        
        # Instruções adicionais para resposta de áudio
        audio_instruction = ""
        if for_audio_response:
            audio_instruction = "\nIMPORTANTE: Esta resposta será convertida em ÁUDIO. Escreva como FALA HUMANA, não como texto. Números por extenso, pausas com reticências, linguagem coloquial."
        
        # Construir mensagem com contexto
        full_message = f"""{history_text}CONTEXTO DO CLIENTE:
{context_text}

MENSAGEM ATUAL DO CLIENTE:
{message}

INSTRUÇÕES: Responda de forma natural e direta. Se já cumprimentou antes, NÃO cumprimente novamente.{audio_instruction}"""
        
        # Enviar para LLM
        user_message = UserMessage(text=full_message)
        response = await chat.send_message(user_message)
        
        # Salvar resposta do bot
        db.add_conversation_message({
            "id": str(uuid.uuid4()),
            "conversation_id": conversation["id"],
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return response
        
    except Exception as e:
        print(f"[CHATBOT AI] Erro ao processar mensagem: {e}")
        import traceback
        traceback.print_exc()
        return "Opa, tive um probleminha aqui! 😅 Pode repetir sua mensagem? Se preferir, posso te transferir para um atendente."


async def reset_conversation(phone: str) -> bool:
    """Reseta a conversa de um telefone"""
    try:
        conversation = db.get_conversation_by_phone(phone)
        if conversation:
            db.update_conversation(conversation["id"], {"status": "closed"})
        
        # Limpar cache da instância de chat
        session_id = f"whatsapp_{phone}"
        if session_id in chat_instances:
            del chat_instances[session_id]
        
        return True
    except Exception as e:
        print(f"[CHATBOT AI] Erro ao resetar conversa: {e}")
        return False


# Funções auxiliares para consultas específicas
async def search_order_by_number(order_number: str) -> Optional[Dict]:
    """Busca pedido por número"""
    pedidos = db.get_all_pedidos()
    for p in pedidos:
        if str(p.get('numero_pedido', '')).lower() == order_number.lower():
            return p
        if p.get('id', '').lower().startswith(order_number.lower()):
            return p
    return None


async def get_order_status_text(order: Dict) -> str:
    """Retorna texto formatado do status do pedido"""
    status_map = {
        "aguardando_aceite": "aguardando confirmação",
        "producao": "sendo preparado",
        "pronto": "pronto para entrega",
        "na_bag": "embalado e aguardando entregador",
        "em_rota": "a caminho",
        "concluido": "entregue",
        "cancelado": "cancelado"
    }
    
    status = order.get('status', 'desconhecido')
    status_text = status_map.get(status, status)
    
    result = f"Pedido #{order.get('numero_pedido', order.get('id', '')[:8])}: {status_text}"
    
    if order.get('entregador_nome') and status in ['em_rota', 'na_bag']:
        result += f"\nEntregador: {order['entregador_nome']}"
    
    return result



# ==================== FUNÇÕES DE ÁUDIO ====================

async def process_audio_message(
    phone: str, 
    audio_data: bytes = None,
    audio_base64: str = None,
    audio_url: str = None,
    push_name: str = "",
    respond_with_audio: bool = True
) -> Dict[str, Any]:
    """
    Processa uma mensagem de áudio: transcreve, processa com IA e gera resposta em áudio.
    
    Args:
        phone: Número do telefone
        audio_data: Bytes do áudio (opcional)
        audio_base64: Áudio em base64 (opcional)
        audio_url: URL do áudio (opcional)
        push_name: Nome do cliente
        respond_with_audio: Se deve gerar resposta em áudio
    
    Returns:
        Dict com transcription, response_text, response_audio_base64, etc.
    """
    result = {
        "success": False,
        "transcription": None,
        "response_text": None,
        "response_audio_base64": None,
        "response_audio_url": None,
        "error": None
    }
    
    if not AUDIO_AVAILABLE:
        result["error"] = "Serviço de áudio não disponível"
        return result
    
    try:
        # 1. TRANSCREVER O ÁUDIO
        if audio_data:
            success, transcription = await audio_service.transcribe_audio(audio_data)
        elif audio_base64:
            success, transcription = await audio_service.transcribe_audio_from_base64(audio_base64)
        elif audio_url:
            success, transcription = await audio_service.transcribe_audio_from_url(audio_url)
        else:
            result["error"] = "Nenhum áudio fornecido"
            return result
        
        if not success:
            result["error"] = f"Erro na transcrição: {transcription}"
            return result
        
        result["transcription"] = transcription
        print(f"[CHATBOT AI] Áudio transcrito: {transcription[:100]}...")
        
        # 2. PROCESSAR COM A IA (usando a mensagem transcrita)
        # IMPORTANTE: for_audio_response=True para gerar texto no formato de fala humana
        response_text = await process_message(
            phone=phone,
            message=transcription,
            push_name=push_name,
            for_audio_response=respond_with_audio  # Gera texto humanizado se for responder com áudio
        )
        result["response_text"] = response_text
        
        # 3. GERAR RESPOSTA EM ÁUDIO (se solicitado)
        if respond_with_audio and response_text:
            # Buscar configuração de voz do chatbot
            settings = db.get_all_settings()
            voice = settings.get('chatbot_voice', audio_service.DEFAULT_VOICE)
            
            # O texto já está no formato de fala humana, apenas limpar emojis/formatação
            clean_text = audio_service.clean_text_for_tts(response_text)
            
            success, audio_base64_response, msg = await audio_service.generate_speech_base64(
                text=clean_text,
                voice=voice
            )
            
            if success:
                result["response_audio_base64"] = audio_base64_response
                
                # Salvar áudio em arquivo para URL
                import base64
                audio_bytes = base64.b64decode(audio_base64_response)
                import uuid
                filename = f"response_{uuid.uuid4()}.mp3"
                filepath = await audio_service.save_audio_file(audio_bytes, filename)
                result["response_audio_url"] = audio_service.get_audio_url(filename)
            else:
                print(f"[CHATBOT AI] Erro ao gerar áudio de resposta: {msg}")
        
        result["success"] = True
        return result
        
    except Exception as e:
        print(f"[CHATBOT AI] Erro ao processar áudio: {e}")
        import traceback
        traceback.print_exc()
        result["error"] = str(e)
        return result


async def generate_audio_response(text: str, voice: str = None) -> Dict[str, Any]:
    """
    Gera apenas a resposta em áudio para um texto.
    
    Args:
        text: Texto para converter em áudio
        voice: Voz a usar (opcional, usa padrão se não especificado)
    
    Returns:
        Dict com audio_base64, audio_url, etc.
    """
    result = {
        "success": False,
        "audio_base64": None,
        "audio_url": None,
        "error": None
    }
    
    if not AUDIO_AVAILABLE:
        result["error"] = "Serviço de áudio não disponível"
        return result
    
    try:
        # Buscar configuração de voz se não especificada
        if not voice:
            settings = db.get_all_settings()
            voice = settings.get('chatbot_voice', audio_service.DEFAULT_VOICE)
        
        success, audio_base64, msg = await audio_service.generate_speech_base64(text, voice)
        
        if success:
            result["success"] = True
            result["audio_base64"] = audio_base64
            
            # Salvar em arquivo
            import base64
            import uuid
            audio_bytes = base64.b64decode(audio_base64)
            filename = f"tts_{uuid.uuid4()}.mp3"
            await audio_service.save_audio_file(audio_bytes, filename)
            result["audio_url"] = audio_service.get_audio_url(filename)
        else:
            result["error"] = msg
        
        return result
        
    except Exception as e:
        result["error"] = str(e)
        return result


def get_available_voices() -> Dict[str, str]:
    """Retorna as vozes disponíveis para TTS"""
    if AUDIO_AVAILABLE:
        return audio_service.AVAILABLE_VOICES
    return {}


def is_audio_available() -> bool:
    """Verifica se o serviço de áudio está disponível"""
    return AUDIO_AVAILABLE
