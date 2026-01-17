# =========================
# 1) Build do Frontend
# =========================
FROM node:20-bookworm-slim AS frontend_build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# =========================
# 2) Runtime (Backend + WhatsApp Service)
# =========================
FROM python:3.11-bookworm

# Node + deps do sistema (porque o backend dá "npm start" no whatsapp-service)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia o projeto todo
COPY . .

# Copia o build do frontend para onde o backend espera: ../frontend/build
COPY --from=frontend_build /app/frontend/build /app/frontend/build

# Python deps (usa requirements.prod.txt)
RUN pip install --no-cache-dir -r backend/requirements.prod.txt

# WhatsApp service deps
WORKDIR /app/whatsapp-service
RUN npm ci --legacy-peer-deps

# Volta pra raiz
WORKDIR /app

ENV PORT=8001
EXPOSE 8001

CMD ["python", "backend/server.py"]
