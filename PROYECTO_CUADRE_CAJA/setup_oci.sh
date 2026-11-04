#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

sudo apt update
sudo apt install -y \
  python3 \
  python3-pip \
  python3-venv \
  libglib2.0-0 \
  libgomp1 \
  libgl1 \
  libxcb1 \
  libxrender1 \
  libsm6 \
  libxext6

sudo python3 -m venv /opt/rapidocr-venv
sudo /opt/rapidocr-venv/bin/pip install --no-cache-dir \
  -r "$PROJECT_ROOT/ocr-service/requirements-rapid.txt"

printf 'RapidOCR environment ready at %s\n' '/opt/rapidocr-venv'
printf 'Set PYTHON_BIN=%s for the backend process.\n' '/opt/rapidocr-venv/bin/python'
