import logging
import os
import sys
import tempfile
from pathlib import Path
from contextlib import redirect_stdout
import io

from flask import Flask, jsonify, request

# Importamos las funciones de los scripts
import main_ocr_1_7
import main_transferencia_1_11

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

TIPOS_TRANSFERENCIA = {
    "TRANSFERENCIA", "TRANSFERENCIA_BCP", "TRANSFERENCIA_BBVA", 
    "TRANSFERENCIA_INTERBANK", "TRANSFERENCIA_SCOTIABANK", 
    "TRANSFERENCIA_BANBIF", "YAPE", "PLIN",
}
EXTENSIONES_POR_MIME = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
}
SCRIPTS = {
    "COMPROBANTE": "ocr-cuadre-caja:1.7",
    "TRANSFERENCIA": "ocr-cuadre-caja:1.11",
}

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/ocr")
def procesar_ocr():
    archivo = request.files.get("archivo")
    if archivo is None:
        return jsonify({"error": "No se proporcionó ningún archivo"}), 400

    extension = EXTENSIONES_POR_MIME.get(archivo.mimetype)
    if extension is None:
        return jsonify({"error": "Tipo de archivo no permitido"}), 400

    tipo = str(request.form.get("tipo", "COMPROBANTE")).strip().upper()
    categoria = "TRANSFERENCIA" if tipo in TIPOS_TRANSFERENCIA else "COMPROBANTE"
    build = SCRIPTS[categoria]
    ruta_temporal = None

    try:
        with tempfile.NamedTemporaryFile(
            prefix="evidencia-", suffix=extension, dir="/tmp", delete=False
        ) as temporal:
            ruta_temporal = temporal.name
            archivo.save(temporal)

        # REDIRIGIMOS EL STDOUT PARA CAPTURAR LOS PRINTS DE LOS SCRIPTS
        f = io.StringIO()
        try:
            with redirect_stdout(f):
                if categoria == "TRANSFERENCIA":
                    main_transferencia_1_11.procesar_archivo(ruta_temporal)
                else:
                    main_ocr_1_7.procesar_archivo(ruta_temporal)
        except Exception as e:
            app.logger.exception("Error en la ejecución del OCR")
            return jsonify({"error": f"Error procesando OCR: {str(e)}"}), 500

        salida_ocr = f.getvalue()

        return jsonify({
            "salida_ocr": salida_ocr,
            "build": build,
        })
    except OSError:
        app.logger.exception("No se pudo crear el archivo temporal")
        return jsonify({"error": "No se pudo procesar el archivo"}), 500
    finally:
        if ruta_temporal and os.path.exists(ruta_temporal):
            try:
                os.remove(ruta_temporal)
            except OSError:
                pass

@app.errorhandler(413)
def archivo_demasiado_grande(_error):
    return jsonify({"error": "El archivo supera el límite de 10 MB"}), 413

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)