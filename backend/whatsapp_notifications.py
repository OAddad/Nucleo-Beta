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

# Fila de mensagens pendentes (para delay de 35 segundos em novos pedidos)
pending_notifications = {}


def format_phone(phone: str) -> str:
    """Formata número de telefone para o formato do WhatsApp"""
    if not phone:
        return None
    
    # Remover caracteres não numéricos
    phone_clean = re.sub(r'\D', '', phone)
    
    # Se não tem código do país, adicionar 55 (Brasil)
    if len(phone_clean) == 10 or len(phone_clean) == 11:
        phone_clean = '55' + phone_clean
    
    # Adicionar sufixo do WhatsApp
    return f"{phone_clean}@s.whatsapp.net"


def get_order_messages(tipo_entrega: str = 'delivery') -> dict:
    """Retorna as mensagens para cada status do pedido"""
    
    # Buscar endereço da empresa
    settings = db.get_all_settings()
    endereco = settings.get('company_address', 'nosso estabelecimento')
    
    if tipo_entrega == 'pickup':
        # Mensagens para RETIRADA
        return {
            'aguardando_aceite': '📦 Pedido Criado #{codigo}\n\nSeu pedido foi recebido e está aguardando confirmação!',
            'aceito': '✅ Pedido #{codigo} Aceito!\n\nJá está em produção. Em breve estará pronto para retirada.',
            'producao': '👨‍🍳 Pedido #{codigo} em Produção!\n\nEstamos preparando seu pedido com carinho.',
            'pronto': '🎉 Pedido #{codigo} Pronto!\n\nPode retirar em:\n📍 {endereco}',
            'concluido': '✅ Pedido #{codigo} Retirado com sucesso!\n\nObrigado pela preferência! 😊',
            'retirado': '✅ Pedido #{codigo} Retirado com sucesso!\n\nObrigado pela preferência! 😊',
        }
    else:
        # Mensagens para ENTREGA
        return {
            'aguardando_aceite': '📦 Pedido Criado #{codigo}\n\nSeu pedido foi recebido e está aguardando confirmação!',
            'aceito': '✅ Pedido #{codigo} Aceito!\n\nJá está em produção.',
            'producao': '👨‍🍳 Pedido #{codigo} em Produção!\n\nEstamos preparando seu pedido com carinho.',
            'pronto': '✅ Pedido #{codigo} Pronto!\n\nEstamos aguardando um entregador disponível.',
            'na_bag': '🎒 Pedido #{codigo} na Bag do Entregador!\n\nEm breve entra em rota de entrega.',
            'em_rota': '🛵 Pedido #{codigo} em Rota de Entrega!\n\nO entregador está a caminho. Aguarde!',
            'concluido': '✅ Pedido #{codigo} Entregue!\n\nObrigado pela preferência! 😊',
            'entregue': '✅ Pedido #{codigo} Entregue!\n\nObrigado pela preferência! 😊',
        }


async def send_whatsapp_message(phone: str, message: str) -> bool:
    """Envia mensagem via WhatsApp"""
    try:
        formatted_phone = format_phone(phone)
        if not formatted_phone:
            print(f"[WhatsApp Notify] Telefone inválido: {phone}")
            return False
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={
                    "phone": formatted_phone,
                    "message": message
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"[WhatsApp Notify] Mensagem enviada para {phone}")
                    return True
            
            print(f"[WhatsApp Notify] Erro ao enviar para {phone}: {response.text}")
            return False
            
    except Exception as e:
        print(f"[WhatsApp Notify] Erro ao enviar mensagem: {e}")
        return False


async def notify_order_status(pedido_id: str, new_status: str, delay_seconds: int = 0):
    """
    Notifica o cliente sobre mudança de status do pedido.
    
    Args:
        pedido_id: ID do pedido
        new_status: Novo status do pedido
        delay_seconds: Delay em segundos antes de enviar (35s para novos pedidos)
    """
    try:
        # Aguardar delay se especificado
        if delay_seconds > 0:
            print(f"[WhatsApp Notify] Aguardando {delay_seconds}s antes de notificar pedido {pedido_id}")
            await asyncio.sleep(delay_seconds)
        
        # Buscar dados do pedido
        pedido = db.get_pedido_by_id(pedido_id)
        if not pedido:
            print(f"[WhatsApp Notify] Pedido {pedido_id} não encontrado")
            return
        
        # Verificar se tem telefone do cliente
        cliente_telefone = pedido.get('cliente_telefone')
        if not cliente_telefone:
            # Tentar buscar do cliente
            cliente_id = pedido.get('cliente_id')
            if cliente_id:
                cliente = db.get_cliente_by_id(cliente_id)
                if cliente:
                    cliente_telefone = cliente.get('telefone')
        
        if not cliente_telefone:
            print(f"[WhatsApp Notify] Pedido {pedido_id} sem telefone do cliente")
            return
        
        # Obter tipo de entrega
        tipo_entrega = pedido.get('tipo_entrega', 'delivery')
        
        # Obter mensagens para o tipo de entrega
        messages = get_order_messages(tipo_entrega)
        
        # Verificar se tem mensagem para esse status
        if new_status not in messages:
            print(f"[WhatsApp Notify] Sem mensagem para status '{new_status}'")
            return
        
        # Preparar mensagem
        codigo = pedido.get('numero_pedido', pedido_id[:8].upper())
        settings = db.get_all_settings()
        endereco = settings.get('company_address', 'nosso estabelecimento')
        
        message = messages[new_status].format(
            codigo=codigo,
            endereco=endereco
        )
        
        # Enviar mensagem
        success = await send_whatsapp_message(cliente_telefone, message)
        
        if success:
            print(f"[WhatsApp Notify] Pedido {pedido_id} - Status '{new_status}' notificado")
        
    except Exception as e:
        print(f"[WhatsApp Notify] Erro ao notificar pedido {pedido_id}: {e}")


def schedule_order_notification(pedido_id: str, status: str, delay_seconds: int = 0):
    """
    Agenda uma notificação de pedido para ser enviada em background.
    Para novos pedidos, usa delay de 35 segundos.
    """
    try:
        # Criar task assíncrona
        asyncio.create_task(notify_order_status(pedido_id, status, delay_seconds))
    except RuntimeError:
        # Se não há event loop rodando (ex: chamada síncrona), criar novo loop
        import threading
        def run_notification():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(notify_order_status(pedido_id, status, delay_seconds))
            loop.close()
        
        thread = threading.Thread(target=run_notification)
        thread.daemon = True
        thread.start()
