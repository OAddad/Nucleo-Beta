"""
Serviço WhatsApp Simulado para Núcleo
Gera QR Code e gerencia status de conexão
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import qrcode
import io
import base64
import uuid
import time
from datetime import datetime
from typing import Optional, List, Dict

app = FastAPI(title="WhatsApp Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado do serviço
service_state = {
    "connected": False,
    "status": "waiting_qr",
    "phone": None,
    "qr_code": None,
    "qr_timestamp": 0,
    "auto_reply_enabled": True,
    "messages": []
}

# Gerar QR Code a cada 30 segundos (simula renovação)
QR_REFRESH_INTERVAL = 30


def generate_qr_code() -> str:
    """Gera um QR Code único para conexão"""
    # Dados únicos para o QR Code (simula sessão WhatsApp)
    session_id = str(uuid.uuid4())[:8]
    timestamp = int(time.time())
    qr_data = f"whatsapp://nucleo-{session_id}-{timestamp}"
    
    # Gerar imagem do QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Converter para base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_base64}"


def ensure_qr_code():
    """Garante que existe um QR Code válido"""
    current_time = time.time()
    
    # Renovar QR Code se expirado ou não existe
    if (service_state["qr_code"] is None or 
        current_time - service_state["qr_timestamp"] > QR_REFRESH_INTERVAL):
        service_state["qr_code"] = generate_qr_code()
        service_state["qr_timestamp"] = current_time


@app.get("/status")
async def get_status():
    """Retorna status da conexão WhatsApp"""
    ensure_qr_code()
    
    return {
        "status": service_state["status"],
        "connected": service_state["connected"],
        "phone": service_state["phone"],
        "autoReplyEnabled": service_state["auto_reply_enabled"],
        "hasQR": service_state["qr_code"] is not None
    }


@app.get("/qr")
async def get_qr():
    """Retorna QR Code para conexão"""
    if service_state["connected"]:
        return {"success": False, "message": "Já conectado"}
    
    ensure_qr_code()
    
    return {
        "success": True,
        "qr": service_state["qr_code"]
    }


class ConnectRequest(BaseModel):
    phone: Optional[str] = None


@app.post("/connect")
async def connect(data: ConnectRequest = None):
    """Simula conexão bem-sucedida"""
    service_state["connected"] = True
    service_state["status"] = "connected"
    service_state["phone"] = data.phone if data else "5511999999999"
    service_state["qr_code"] = None
    
    return {"success": True, "message": "Conectado com sucesso"}


@app.post("/disconnect")
async def disconnect():
    """Desconecta do WhatsApp"""
    service_state["connected"] = False
    service_state["status"] = "waiting_qr"
    service_state["phone"] = None
    service_state["qr_code"] = None
    service_state["qr_timestamp"] = 0
    
    return {"success": True, "message": "Desconectado"}


@app.post("/toggle-auto-reply")
async def toggle_auto_reply():
    """Alterna resposta automática"""
    service_state["auto_reply_enabled"] = not service_state["auto_reply_enabled"]
    
    return {
        "success": True,
        "autoReplyEnabled": service_state["auto_reply_enabled"]
    }


class SendMessageRequest(BaseModel):
    phone: str
    message: str


@app.post("/send")
async def send_message(data: SendMessageRequest):
    """Simula envio de mensagem"""
    if not service_state["connected"]:
        return {"success": False, "message": "WhatsApp não conectado"}
    
    # Registrar mensagem enviada
    msg = {
        "id": str(uuid.uuid4()),
        "from": "bot",
        "to": data.phone,
        "body": data.message,
        "timestamp": datetime.now().isoformat(),
        "type": "sent"
    }
    service_state["messages"].append(msg)
    
    return {"success": True, "messageId": msg["id"]}


@app.get("/messages")
async def get_messages(limit: int = 20):
    """Retorna mensagens recentes"""
    messages = service_state["messages"][-limit:]
    return {"success": True, "messages": messages}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
