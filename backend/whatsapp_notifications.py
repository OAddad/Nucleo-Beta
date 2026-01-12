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

# Delay para novos pedidos (em segundos)
NEW_ORDER_DELAY = 25


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
            'cancelado': '❌ Pedido #{codigo} foi Cancelado\n\nMotivo: {motivo}',
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
            'cancelado': '❌ Pedido #{codigo} foi Cancelado\n\nMotivo: {motivo}',
        }


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


async def notify_order_status(pedido_id: str, new_status: str, delay_seconds: int = 0, motivo: str = None):
    """
    Notifica o cliente sobre mudança de status do pedido.
    
    Args:
        pedido_id: ID do pedido
        new_status: Novo status do pedido
        delay_seconds: Delay em segundos antes de enviar
        motivo: Motivo do cancelamento (se aplicável)
    """
    try:
        # Aguardar delay se especificado
        if delay_seconds > 0:
            print(f"[WhatsApp Notify] Aguardando {delay_seconds}s antes de notificar pedido {pedido_id}")
            await asyncio.sleep(delay_seconds)
        
        # Buscar dados do pedido
        pedido = db.get_pedido_by_id(pedido_id)
        if not pedido:
            print(f"[WhatsApp Notify] ❌ Pedido {pedido_id} não encontrado")
            return
        
        print(f"[WhatsApp Notify] Pedido encontrado: {pedido.get('numero_pedido')} - Cliente: {pedido.get('cliente_nome')}")
        
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
        
        # Obter tipo de entrega
        tipo_entrega = pedido.get('tipo_entrega', 'delivery')
        
        # Obter mensagens para o tipo de entrega
        messages = get_order_messages(tipo_entrega)
        
        # Verificar se tem mensagem para esse status
        if new_status not in messages:
            print(f"[WhatsApp Notify] ⚠️ Sem mensagem configurada para status '{new_status}'")
            return
        
        # Preparar mensagem
        codigo = pedido.get('numero_pedido', pedido_id[:8].upper())
        settings = db.get_all_settings()
        endereco = settings.get('company_address', 'nosso estabelecimento')
        
        # Usar motivo do cancelamento se fornecido, ou buscar do pedido
        if new_status == 'cancelado':
            motivo_final = motivo or pedido.get('motivo_cancelamento', 'Não informado')
        else:
            motivo_final = ''
        
        message = messages[new_status].format(
            codigo=codigo,
            endereco=endereco,
            motivo=motivo_final
        )
        
        print(f"[WhatsApp Notify] Mensagem: {message[:50]}...")
        
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


def schedule_order_notification(pedido_id: str, status: str, delay_seconds: int = 0, motivo: str = None):
    """
    Agenda uma notificação de pedido para ser enviada em background.
    Para novos pedidos, usa delay de 25 segundos.
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
