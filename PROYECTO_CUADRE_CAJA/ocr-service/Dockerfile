FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY ocr-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ocr-service/main.py ./main.py
COPY main_ocr_1_7.py ./main_ocr_1_7.py
COPY main_transferencia_1_11.py ./main_transferencia_1_11.py

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "1", "--timeout", "210", "main:app"]
