"""
Serviço de IA para ChatBot WhatsApp
Integração com LLM para respostas humanizadas e contextuais
"""
import os
import json
import re
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

# Importar integração LLM
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    print("[CHATBOT AI] emergentintegrations não disponível")

import database as db

# Configuração
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Cache de instâncias de chat por sessão
chat_instances: Dict[str, LlmChat] = {}


def get_system_prompt() -> str:
    """Retorna o prompt do sistema com informações do restaurante"""
    
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
        contatos.append(f"📍 Endereço: {endereco}")
    if telefone and telefone != 'Telefone não configurado':
        contatos.append(f"📞 Telefone: {telefone}")
    if email:
        contatos.append(f"📧 Email: {email}")
    if instagram:
        contatos.append(f"📸 Instagram: {instagram}")
    if facebook:
        contatos.append(f"👤 Facebook: {facebook}")
    
    contatos_texto = "\n".join(contatos) if contatos else "Informações de contato não configuradas"
    
    return f"""Você é um atendente virtual simpático e profissional do {nome_fantasia if nome_fantasia else nome_empresa}.
{f'Nosso slogan é: "{slogan}"' if slogan else ''}
Seu nome é Ana e você deve ser sempre cordial, prestativa e humanizada.

IMPORTANTE:
- NUNCA use menus numerados como "digite 1 para...", "digite 2 para..."
- Converse naturalmente como um humano faria
- Seja proativa em oferecer ajuda
- Use emojis com moderação para parecer mais amigável
- Responda de forma concisa mas completa
- Se não souber algo, diga honestamente e ofereça alternativas
- Sempre mencione o nome da empresa "{nome_fantasia if nome_fantasia else nome_empresa}" quando relevante

INFORMAÇÕES DA EMPRESA:
🏢 Nome: {nome_fantasia if nome_fantasia else nome_empresa}
{contatos_texto}

⏰ HORÁRIOS DE FUNCIONAMENTO:
{chr(10).join(horarios_formatados) if horarios_formatados else "Horários não configurados"}

📋 CARDÁPIO:
{chr(10).join(cardapio) if cardapio else "Cardápio em atualização"}

CAPACIDADES:
- Você pode consultar pedidos pelo número ou telefone do cliente
- Você pode informar status de entregas
- Você pode mostrar o cardápio
- Você pode ajudar com dúvidas sobre produtos
- Você pode registrar reclamações e sugestões

FLUXO DE CONVERSA:
1. Sempre cumprimente de forma calorosa mencionando a empresa
2. Identifique a necessidade do cliente
3. Ajude de forma objetiva
4. Ofereça ajuda adicional antes de encerrar

Se o cliente quiser fazer um pedido, oriente-o a usar nosso app ou site, ou pergunte se deseja que transfira para um atendente humano.

Lembre-se: você representa a empresa {nome_fantasia if nome_fantasia else nome_empresa}, então seja sempre profissional e acolhedora!"""


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


async def process_message(phone: str, message: str, push_name: str = "") -> str:
    """Processa uma mensagem e retorna a resposta da IA"""
    
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
        
        if session_id not in chat_instances:
            system_prompt = get_system_prompt()
            chat_instances[session_id] = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("openai", "gpt-4o-mini")
        
        chat = chat_instances[session_id]
        
        # Construir mensagem com contexto
        full_message = f"""CONTEXTO DO CLIENTE:
{context_text}

MENSAGEM DO CLIENTE:
{message}"""
        
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
