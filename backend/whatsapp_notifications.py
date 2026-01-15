"""
Sistema de Notificações WhatsApp para Pedidos
Envia mensagens automáticas para clientes sobre status de pedidos
"""
import os
import asyncio
import httpx
import re
from datetime import datetime, timezone
from typing import Optional
import database as db

# URL do serviço WhatsApp
WHATSAPP_SERVICE_URL = "http://localhost:3002"


def format_phone(phone: str) -> str:
    """Formata número de telefone para o formato do WhatsApp"""
    if not phone:
        return None
    
    # Remover todos os caracteres não numéricos
    phone_clean = re.sub(r'\D', '', phone)
    
    # Se ficou vazio, retornar None
    if not phone_clean:
        return None
    
    # Se não tem código do país, adicionar 55 (Brasil)
    if len(phone_clean) == 10 or len(phone_clean) == 11:
        phone_clean = '55' + phone_clean
    
    # Para números brasileiros, remover o 9 adicional do celular
    # Formato: 55 + DDD (2) + 9 + número (8) = 55DDNNNNNNNNN (13 dígitos)
    # WhatsApp usa: 55 + DDD (2) + número (8) = 55DDNNNNNNNN (12 dígitos)
    if len(phone_clean) == 13 and phone_clean.startswith('55'):
        ddd = phone_clean[2:4]
        numero = phone_clean[4:]
        # Se começa com 9 e tem 9 dígitos, remover o 9
        if numero.startswith('9') and len(numero) == 9:
            phone_clean = '55' + ddd + numero[1:]
            print(f"[WhatsApp Notify] Número formatado: {phone_clean} (removido 9 extra)")
    
    # Retornar apenas os números (sem @s.whatsapp.net - o serviço adiciona)
    return phone_clean


def generate_order_summary(pedido: dict, settings: dict) -> str:
    """
    Gera um resumo completo do pedido para enviar ao cliente.
    Diferencia entre ENTREGA e RETIRADA.
    Inclui etapas selecionadas e observações de cada item.
    """
    codigo = pedido.get('codigo') or pedido.get('numero_pedido') or f"#{pedido.get('id', '')[:5].upper()}"
    tipo_entrega = pedido.get('tipo_entrega', 'delivery')
    
    # Formatar itens com etapas e observações
    items = pedido.get('items', [])
    items_text = ""
    for item in items:
        nome = item.get('nome') or item.get('name', 'Item')
        qtd = item.get('quantidade') or item.get('qty', 1)
        preco = item.get('preco') or item.get('price', 0)
        total_item = qtd * preco
        combo_type = item.get('combo_type')
        
        # Linha principal do item
        tipo_badge = ""
        if combo_type == 'combo':
            tipo_badge = " (COMBO)"
        elif combo_type == 'simples':
            tipo_badge = " (SIMPLES)"
        
        items_text += f"```{qtd}x {nome}{tipo_badge}``` R$ {total_item:.2f}\n"
        
        # Adicionar subitems (formato Delivery)
        subitems = item.get('subitems', [])
        if subitems:
            # Agrupar subitems por step_name
            by_step = {}
            for sub in subitems:
                step_name = sub.get('step_name', 'Opção')
                sub_nome = sub.get('nome') or sub.get('name', '')
                if step_name not in by_step:
                    by_step[step_name] = []
                by_step[step_name].append(sub_nome)
            
            for step_name, sub_names in by_step.items():
                items_text += f"   ↳ {step_name}: {', '.join(sub_names)}\n"
        
        # Adicionar etapas selecionadas (formato CardapioPublico)
        etapas = item.get('etapas', [])
        if etapas and not subitems:  # Só mostra etapas se não tiver subitems
            for etapa in etapas:
                etapa_nome = etapa.get('etapa', '')
                etapa_itens = etapa.get('itens', [])
                if etapa_itens:
                    items_text += f"   ↳ {etapa_nome}: {', '.join(etapa_itens)}\n"
        
        # Adicionar observação do item
        observacao = item.get('observacao')
        if observacao:
            items_text += f"   📝 _{observacao}_\n"
        
        items_text += "\n"
    
    # Forma de pagamento
    forma_pagamento = pedido.get('forma_pagamento', 'Não informado')
    forma_pagamento_map = {
        'dinheiro': '💵 Dinheiro',
        'pix': '📱 PIX',
        'cartao_credito': '💳 Cartão de Crédito',
        'cartao_debito': '💳 Cartão de Débito',
        'cartao': '💳 Cartão'
    }
    forma_pagamento_texto = forma_pagamento_map.get(forma_pagamento, forma_pagamento.title())
    
    # Troco
    troco_texto = ""
    if forma_pagamento == 'dinheiro':
        troco_precisa = pedido.get('troco_precisa', False)
        troco_valor = pedido.get('troco_valor')
        if troco_precisa and troco_valor:
            total = pedido.get('total', 0)
            troco_levar = troco_valor - total
            troco_texto = f"\nTroco para: R$ {troco_valor:.2f}\nTroco a levar: R$ {troco_levar:.2f}"
    
    # Total e frete
    total = pedido.get('total', 0)
    valor_entrega = pedido.get('valor_entrega', 0)
    subtotal = total - valor_entrega
    
    if tipo_entrega == 'delivery':
        # ENTREGA
        endereco_rua = pedido.get('endereco_rua', '')
        endereco_numero = pedido.get('endereco_numero', '')
        endereco_bairro = pedido.get('endereco_bairro', '')
        endereco_complemento = pedido.get('endereco_complemento', '')
        
        endereco_completo = endereco_rua
        if endereco_numero:
            endereco_completo += f", {endereco_numero}"
        if endereco_bairro:
            endereco_completo += f" - {endereco_bairro}"
        if endereco_complemento:
            endereco_completo += f" ({endereco_complemento})"
        
        message = f"""🛵 *ENTREGA*
Pedido: *{codigo}*

{items_text}
📍 *Endereço para entrega:*
{endereco_completo}

💰 *Forma de pagamento:*
{forma_pagamento_texto}{troco_texto}

Frete: R$ {valor_entrega:.2f}
*Total: R$ {total:.2f}*

✅ Seu pedido foi recebido e está sendo preparado!"""
    else:
        # RETIRADA
        endereco_estabelecimento = settings.get('company_address', 'nosso estabelecimento')
        
        message = f"""🏪 *RETIRADA*
Pedido: *{codigo}*

{items_text}
📍 *Pedido para Retirada no estabelecimento:*
{endereco_estabelecimento}

💰 *Forma de pagamento:*
{forma_pagamento_texto}{troco_texto}

*Total: R$ {total:.2f}*

✅ Seu pedido foi recebido e está sendo preparado!"""
    
    return message


def generate_delivery_message_for_entregador(pedido: dict) -> str:
    """
    Gera mensagem para o entregador quando o pedido é atribuído a ele.
    Contém: código, cliente, telefone, endereço e forma de pagamento.
    """
    codigo = pedido.get('codigo') or pedido.get('numero_pedido') or f"#{pedido.get('id', '')[:5].upper()}"
    
    # Dados do cliente
    cliente_nome = pedido.get('cliente_nome', 'Cliente')
    cliente_telefone = pedido.get('cliente_telefone', 'Não informado')
    
    # Endereço
    endereco_rua = pedido.get('endereco_rua', '')
    endereco_numero = pedido.get('endereco_numero', '')
    endereco_bairro = pedido.get('endereco_bairro', '')
    endereco_complemento = pedido.get('endereco_complemento', '')
    endereco_referencia = pedido.get('endereco_referencia', '')
    
    endereco_completo = endereco_rua
    if endereco_numero:
        endereco_completo += f", {endereco_numero}"
    if endereco_bairro:
        endereco_completo += f" - {endereco_bairro}"
    if endereco_complemento:
        endereco_completo += f" ({endereco_complemento})"
    
    if not endereco_completo:
        endereco_completo = "Não informado"
    
    # Forma de pagamento
    forma_pagamento = pedido.get('forma_pagamento', 'Não informado')
    forma_pagamento_map = {
        'dinheiro': '💵 Dinheiro',
        'pix': '📱 PIX',
        'cartao_credito': '💳 Cartão de Crédito',
        'cartao_debito': '💳 Cartão de Débito',
        'cartao': '💳 Cartão'
    }
    forma_pagamento_texto = forma_pagamento_map.get(forma_pagamento, forma_pagamento.title())
    
    # Troco
    troco_texto = ""
    if forma_pagamento == 'dinheiro':
        troco_precisa = pedido.get('troco_precisa', False)
        troco_valor = pedido.get('troco_valor')
        if troco_precisa and troco_valor:
            total = pedido.get('total', 0)
            troco_levar = troco_valor - total
            troco_texto = f"\n💰 Troco para: R$ {troco_valor:.2f}\n💰 Levar troco: *R$ {troco_levar:.2f}*"
    
    # Referência
    referencia_texto = ""
    if endereco_referencia:
        referencia_texto = f"\n📍 Referência: {endereco_referencia}"
    
    message = f"""🛵 *NOVA ENTREGA*

📦 Pedido: *{codigo}*

👤 *Cliente:* {cliente_nome}
📞 *Telefone:* {cliente_telefone}

📍 *Endereço:*
{endereco_completo}{referencia_texto}

💳 *Pagamento:* {forma_pagamento_texto}{troco_texto}

✅ Pedido pronto para entrega!"""
    
    return message


async def notify_entregador(pedido_id: str, entregador_telefone: str):
    """Envia notificação ao entregador sobre novo pedido na BAG"""
    try:
        if not entregador_telefone:
            print(f"[WhatsApp Notify] Entregador sem telefone cadastrado")
            return
        
        # Buscar dados do pedido
        pedido = db.get_pedido_by_id(pedido_id)
        if not pedido:
            print(f"[WhatsApp Notify] Pedido {pedido_id} não encontrado")
            return
        
        # Gerar mensagem
        message = generate_delivery_message_for_entregador(pedido)
        
        # Enviar
        success = await send_whatsapp_message(entregador_telefone, message)
        if success:
            print(f"[WhatsApp Notify] ✅ Notificação enviada ao entregador")
        else:
            print(f"[WhatsApp Notify] ❌ Falha ao enviar notificação ao entregador")
    except Exception as e:
        print(f"[WhatsApp Notify] Erro ao notificar entregador: {e}")


def schedule_entregador_notification(pedido_id: str, entregador_telefone: str):
    """Agenda notificação ao entregador (sem delay)"""
    if not entregador_telefone:
        print(f"[WhatsApp Notify] Entregador sem telefone - notificação não enviada")
        return
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(notify_entregador(pedido_id, entregador_telefone))
        else:
            loop.run_until_complete(notify_entregador(pedido_id, entregador_telefone))
    except RuntimeError:
        asyncio.run(notify_entregador(pedido_id, entregador_telefone))


def get_order_message_from_templates(tipo_entrega: str, status: str, variables: dict) -> Optional[str]:
    """Busca a mensagem do banco de dados e aplica as variáveis"""
    return db.get_order_message_for_status(tipo_entrega, status, variables)


def get_order_delay_from_templates(tipo_entrega: str, status: str) -> int:
    """Busca o delay do banco de dados para um status"""
    return db.get_order_delay_for_status(tipo_entrega, status)


async def send_whatsapp_message(phone: str, message: str) -> bool:
    """Envia mensagem via WhatsApp"""
    try:
        formatted_phone = format_phone(phone)
        if not formatted_phone:
            print(f"[WhatsApp Notify] Telefone inválido ou vazio: {phone}")
            return False
        
        print(f"[WhatsApp Notify] Enviando para {formatted_phone}...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={
                    "phone": formatted_phone,
                    "message": message
                }
            )
            
            print(f"[WhatsApp Notify] Resposta: {response.status_code} - {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"[WhatsApp Notify] ✅ Mensagem enviada para {phone}")
                    return True
            
            print(f"[WhatsApp Notify] ❌ Erro ao enviar para {phone}: {response.text}")
            return False
            
    except Exception as e:
        print(f"[WhatsApp Notify] ❌ Erro ao enviar mensagem: {e}")
        return False


async def notify_order_status(pedido_id: str, new_status: str, delay_seconds: int = None, motivo: str = None):
    """
    Notifica o cliente sobre mudança de status do pedido.
    
    Args:
        pedido_id: ID do pedido
        new_status: Novo status do pedido
        delay_seconds: Delay em segundos antes de enviar (se None, usa o delay do template)
        motivo: Motivo do cancelamento (se aplicável)
    """
    try:
        # Buscar dados do pedido
        pedido = db.get_pedido_by_id(pedido_id)
        if not pedido:
            print(f"[WhatsApp Notify] ❌ Pedido {pedido_id} não encontrado")
            return
        
        print(f"[WhatsApp Notify] Pedido encontrado: {pedido.get('numero_pedido')} - Cliente: {pedido.get('cliente_nome')}")
        
        # Obter tipo de entrega
        tipo_entrega = pedido.get('tipo_entrega', 'delivery')
        
        # Se delay_seconds não foi especificado, usar o do template
        if delay_seconds is None:
            delay_seconds = get_order_delay_from_templates(tipo_entrega, new_status)
        
        # Aguardar delay se especificado
        if delay_seconds > 0:
            print(f"[WhatsApp Notify] Aguardando {delay_seconds}s antes de notificar pedido {pedido_id}")
            await asyncio.sleep(delay_seconds)
        
        # Verificar se tem telefone do cliente
        cliente_telefone = pedido.get('cliente_telefone')
        
        if not cliente_telefone:
            # Tentar buscar do cliente
            cliente_id = pedido.get('cliente_id')
            if cliente_id:
                cliente = db.get_cliente_by_id(cliente_id)
                if cliente:
                    cliente_telefone = cliente.get('telefone')
                    print(f"[WhatsApp Notify] Telefone encontrado no cliente: {cliente_telefone}")
        
        if not cliente_telefone:
            print(f"[WhatsApp Notify] ❌ Pedido {pedido_id} sem telefone do cliente")
            return
        
        print(f"[WhatsApp Notify] Telefone do cliente: {cliente_telefone}")
        
        # Preparar variáveis para a mensagem
        # O código do pedido está no campo 'codigo' (formato: #00000)
        codigo = pedido.get('codigo') or pedido.get('numero_pedido') or f"#{pedido_id[:5].upper()}"
        
        settings = db.get_all_settings()
        endereco_estabelecimento = settings.get('company_address', 'nosso estabelecimento')
        
        # Nome do entregador
        nome_entregador = pedido.get('entregador_nome') or 'Entregador'
        
        # Usar motivo do cancelamento se fornecido, ou buscar do pedido
        if new_status == 'cancelado':
            motivo_final = motivo or pedido.get('motivo_cancelamento', 'Não informado')
        else:
            motivo_final = ''
        
        # Para status de pedido criado (aguardando_aceite), usar resumo completo
        if new_status == 'aguardando_aceite':
            message = generate_order_summary(pedido, settings)
        else:
            # Para outros status, usar template do banco
            variables = {
                'codigo': codigo,
                'endereco': endereco_estabelecimento,
                'nome_entregador': nome_entregador,
                'motivo': motivo_final
            }
            
            # Buscar mensagem do template
            message = get_order_message_from_templates(tipo_entrega, new_status, variables)
        
        if not message:
            print(f"[WhatsApp Notify] ⚠️ Template não encontrado ou desativado para status '{new_status}' tipo '{tipo_entrega}'")
            return
        
        print(f"[WhatsApp Notify] Mensagem: {message[:100]}...")
        
        # Enviar mensagem
        success = await send_whatsapp_message(cliente_telefone, message)
        
        if success:
            print(f"[WhatsApp Notify] ✅ Pedido {pedido_id} - Status '{new_status}' notificado com sucesso!")
        else:
            print(f"[WhatsApp Notify] ❌ Falha ao notificar pedido {pedido_id}")
        
    except Exception as e:
        print(f"[WhatsApp Notify] ❌ Erro ao notificar pedido {pedido_id}: {e}")
        import traceback
        traceback.print_exc()


def schedule_order_notification(pedido_id: str, status: str, delay_seconds: int = None, motivo: str = None):
    """
    Agenda uma notificação de pedido para ser enviada em background.
    O delay é obtido do template se não especificado.
    """
    try:
        print(f"[WhatsApp Notify] 📝 Agendando notificação: Pedido={pedido_id}, Status={status}, Delay={delay_seconds}s")
        
        # Tentar usar o event loop existente
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(notify_order_status(pedido_id, status, delay_seconds, motivo))
            print(f"[WhatsApp Notify] ✅ Task criada no event loop existente")
        except RuntimeError:
            # Se não há event loop rodando, criar em uma nova thread
            import threading
            def run_notification():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(notify_order_status(pedido_id, status, delay_seconds, motivo))
                finally:
                    loop.close()
            
            thread = threading.Thread(target=run_notification, daemon=True)
            thread.start()
            print(f"[WhatsApp Notify] ✅ Thread iniciada para notificação")
            
    except Exception as e:
        print(f"[WhatsApp Notify] ❌ Erro ao agendar notificação: {e}")
        import traceback
        traceback.print_exc()
