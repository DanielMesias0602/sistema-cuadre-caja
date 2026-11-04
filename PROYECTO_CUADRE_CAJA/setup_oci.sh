#!/usr/bin/env bash
set -euo pipefail

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
  rapidocr_onnxruntime \
  opencv-python-headless \
  pypdfium2

printf 'RapidOCR environment ready at %s\n' '/opt/rapidocr-venv'
printf 'Set PYTHON_BIN=%s for the backend process.\n' '/opt/rapidocr-venv/bin/python'
