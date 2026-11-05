import asyncio
import logging
import os
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

_ocr_service_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_ocr_service_dir))

from rapid_ocr_service import (  # noqa: E402
    _extraer_texto,
    get_ocr,
    load_extraction_functions,
)

_logger = logging.getLogger("ocr-worker")
_allowed_types = {
    "TRANSFERENCIA",
    "TRANSFERENCIA_BCP",
    "TRANSFERENCIA_BBVA",
    "TRANSFERENCIA_INTERBANK",
    "TRANSFERENCIA_SCOTIABANK",
    "TRANSFERENCIA_BANBIF",
    "YAPE",
    "PLIN",
}
_extension_by_mime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
_ocr_lock = asyncio.Lock()
_engine = None
_receipt_extractor = None
_transfer_extractor = None


@asynccontextmanager
async def lifespan(_app):
    global _engine, _receipt_extractor, _transfer_extractor

    _engine = await run_in_threadpool(get_ocr)
    _receipt_extractor = await run_in_threadpool(
        load_extraction_functions,
        "main_ocr_1_7.py",
    )
    _transfer_extractor = await run_in_threadpool(
        load_extraction_functions,
        "main_transferencia_1_11.py",
    )
    yield
    _engine = None
    _receipt_extractor = None
    _transfer_extractor = None


app = FastAPI(title="RapidOCR Worker", lifespan=lifespan)


def _process_file(image_path, tipo_evidencia, cantidad_depositos=1):
    if _engine is None or _receipt_extractor is None or _transfer_extractor is None:
        raise RuntimeError("El worker OCR no terminó de inicializarse")

    textos, puntajes = _extraer_texto(
        _engine,
        image_path,
        tipo_evidencia,
    )
    es_transferencia = tipo_evidencia in _allowed_types

    if es_transferencia:
        lineas = [
            _transfer_extractor["normalize_text"](texto)
            for texto in textos
            if _transfer_extractor["normalize_text"](texto)
        ]
        datos = _transfer_extractor["extract_transfer_data"](
            lineas,
            cantidad_depositos=cantidad_depositos,
        )
    else:
        datos = _receipt_extractor["extraer_datos_comprobante"](textos)

    lineas_ocr = [
        f"[{puntaje:.2f}] {texto}"
        for texto, puntaje in zip(textos, puntajes)
    ]
    texto_completo = "=== TEXTO DETECTADO ===\n" + "\n".join(lineas_ocr)

    return {
        "texto_completo": texto_completo,
        "datos_extraidos": datos,
    }


@app.post("/ocr")
async def procesar_ocr(
    archivo: UploadFile = File(...),
    tipo_evidencia: str = Form("COMPROBANTE"),
    cantidad_depositos: int = Form(1, ge=1),
):
    mime_type = archivo.content_type
    extension = _extension_by_mime.get(mime_type)
    if extension is None:
        raise HTTPException(status_code=400, detail="Tipo de archivo no compatible con OCR")

    tipo_normalizado = tipo_evidencia.strip().upper()
    if not tipo_normalizado:
        raise HTTPException(status_code=400, detail="tipo_evidencia es obligatorio")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix="rapidocr-",
            suffix=extension,
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            while fragmento := await archivo.read(1024 * 1024):
                temp_file.write(fragmento)

        async with _ocr_lock:
            return await run_in_threadpool(
                _process_file,
                str(temp_path),
                tipo_normalizado,
                cantidad_depositos,
            )
    except HTTPException:
        raise
    except Exception as error:
        _logger.exception("Falló el procesamiento OCR")
        raise HTTPException(
            status_code=500,
            detail="No se pudo procesar el archivo con RapidOCR",
        ) from error
    finally:
        await archivo.close()
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                _logger.exception("No se pudo eliminar el archivo temporal %s", temp_path)
