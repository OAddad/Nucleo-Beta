# =========================
# 1) Build do Frontend
# =========================
FROM node:20-bookworm-slim AS frontend_build
WORKDIR /app/frontend

# Copia manifests (mantém cache do Docker melhor)
COPY frontend/package*.json ./

# npm ci quebra com lock fora de sync → destrava com legacy peer deps
RUN npm install --legacy-peer-deps

# Código do frontend
COPY frontend/ ./
RUN npm run build


# =========================
# 2) Runtime (Backend + WhatsApp Service)
# =========================
FROM python:3.11-bookworm

# Node 20 no runtime (pra não cair em Node 18 do apt e quebrar o Baileys)
# + curl/ca-certificates para baixar o setup do NodeSource
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# (Opcional, mas ajuda no log/exec)
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copia o projeto todo
COPY . .

# Copia o build do frontend para onde o backend espera
COPY --from=frontend_build /app/frontend/build /app/frontend/build

# Python deps
RUN pip install -r backend/requirements.prod.txt

# WhatsApp service deps (sem npm ci; lock pode estar torto)
WORKDIR /app/whatsapp-service
RUN npm install --legacy-peer-deps

# Volta pra raiz
WORKDIR /app

ENV PORT=8001
EXPOSE 8001

# Healthcheck simples (usa python, então não depende de curl no runtime)
# Se seu backend tiver /api/health, melhor ainda trocar pra ele.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/').read()" || exit 1

CMD ["python", "backend/server.py"]
