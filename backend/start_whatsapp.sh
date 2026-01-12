#!/bin/bash
# Script para iniciar o serviço WhatsApp
cd /app/backend
nohup /root/.venv/bin/python whatsapp_service.py > /var/log/supervisor/whatsapp.log 2>&1 &
echo "WhatsApp service started with PID $!"
