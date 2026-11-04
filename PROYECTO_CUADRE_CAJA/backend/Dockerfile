FROM node:22-slim

WORKDIR /app/backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHON_BIN=/opt/rapidocr-venv/bin/python

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgomp1 \
        libgl1 \
        libxcb1 \
        libxrender1 \
        libsm6 \
        libxext6 \
        python3 \
        python3-pip \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./

RUN npm ci --omit=dev

RUN python3 -m venv /opt/rapidocr-venv \
    && /opt/rapidocr-venv/bin/pip install --no-cache-dir \
        rapidocr_onnxruntime \
        opencv-python-headless \
        pypdfium2

RUN mkdir -p /app/backend/tmp

COPY backend/src ./src
COPY ocr-service/rapid_ocr_service.py /app/ocr-service/rapid_ocr_service.py
COPY main_ocr_1_7.py /app/main_ocr_1_7.py
COPY main_transferencia_1_11.py /app/main_transferencia_1_11.py

EXPOSE 3000

CMD ["node", "src/server.js"]