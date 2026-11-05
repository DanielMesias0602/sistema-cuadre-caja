import ast
import json
import sys
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

import cv2
from rapidocr_onnxruntime import RapidOCR

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


_ocr_instance = None
_project_root = Path(__file__).resolve().parent.parent
_transferencia_types = {
    "TRANSFERENCIA",
    "TRANSFERENCIA_BCP",
    "TRANSFERENCIA_BBVA",
    "TRANSFERENCIA_INTERBANK",
    "TRANSFERENCIA_SCOTIABANK",
    "TRANSFERENCIA_BANBIF",
    "YAPE",
    "PLIN",
}


def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        _ocr_instance = RapidOCR(
            use_cls=False,
            det_model_path=None,
            det_limit_side_len=1600,
            det_limit_type="max",
            det_unclip_ratio=2.0,
            det_thresh=0.2,
            det_box_thresh=0.35,
        )
    return _ocr_instance


def load_extraction_functions(filename):
    source_path = _project_root / filename
    source = source_path.read_text(encoding="utf-8-sig")
    parsed = ast.parse(source, filename=str(source_path))
    extraction_nodes = []

    for node in parsed.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            modules = (
                [alias.name.split(".")[0] for alias in node.names]
                if isinstance(node, ast.Import)
                else [(node.module or "").split(".")[0]]
            )
            if "paddleocr" not in modules:
                extraction_nodes.append(node)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name not in {"get_ocr", "procesar_archivo", "main"}:
                extraction_nodes.append(node)

    module = ast.Module(body=extraction_nodes, type_ignores=[])
    ast.fix_missing_locations(module)
    namespace = {"__name__": f"_{source_path.stem}_extraction"}
    exec(compile(module, str(source_path), "exec"), namespace)
    return namespace


def _normalizar_resultado_ocr(result):
    if isinstance(result, tuple) and len(result) == 2:
        result = result[0]
    return result or []


def _enderezar_comprobante(imagen):
    alto, ancho = imagen.shape[:2]
    matriz = cv2.getRotationMatrix2D((ancho / 2, alto / 2), -1, 1)
    return cv2.warpAffine(
        imagen,
        matriz,
        (ancho, alto),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _extraer_texto(engine, image_path, tipo_evidencia=None):
    extension = Path(image_path).suffix.lower()
    resultados = []

    if extension == ".pdf":
        import pypdfium2

        documento = pypdfium2.PdfDocument(image_path)
        try:
            for indice in range(len(documento)):
                pagina = documento[indice]
                bitmap = pagina.render(scale=2)
                try:
                    resultados.extend(
                        _normalizar_resultado_ocr(engine(bitmap.to_numpy()))
                    )
                finally:
                    bitmap.close()
                    pagina.close()
        finally:
            documento.close()
    else:
        entrada_ocr = image_path
        es_comprobante = (
            tipo_evidencia is not None
            and str(tipo_evidencia).strip().upper() == "COMPROBANTE"
        )
        if es_comprobante:
            imagen = cv2.imread(str(image_path))
            if imagen is None:
                raise ValueError(
                    f"No se pudo cargar la imagen del comprobante: {image_path}"
                )
            entrada_ocr = _enderezar_comprobante(imagen)
        resultados = _normalizar_resultado_ocr(engine(entrada_ocr))

    textos = []
    puntajes = []

    def agregar_textos(resultados_ocr):
        for elemento in resultados_ocr:
            if not isinstance(elemento, (list, tuple)) or len(elemento) < 3:
                continue
            texto = str(elemento[1]).strip()
            if not texto:
                continue
            textos.append(texto)
            puntajes.append(float(elemento[2]))

    agregar_textos(resultados)

    return textos, puntajes


def _imprimir_datos_comprobante(namespace, datos):
    salida = StringIO()
    with redirect_stdout(salida):
        namespace["mostrar_resultado"](datos)
    print(salida.getvalue(), end="")


def procesar_archivo(image_path, tipo_evidencia="COMPROBANTE"):
    engine = get_ocr()
    textos, puntajes = _extraer_texto(engine, image_path, tipo_evidencia)
    transferencia = tipo_evidencia.strip().upper() in _transferencia_types

    if transferencia:
        namespace = load_extraction_functions("main_transferencia_1_11.py")
        lineas = [
            namespace["normalize_text"](texto)
            for texto in textos
            if namespace["normalize_text"](texto)
        ]
        datos = namespace["extract_transfer_data"](lineas)
    else:
        namespace = load_extraction_functions("main_ocr_1_7.py")
        datos = namespace["extraer_datos_comprobante"](textos)

    print()
    print("=== TEXTO DETECTADO ===")
    for texto, puntaje in zip(textos, puntajes):
        print(f"[{puntaje:.2f}] {texto}")

    if transferencia:
        namespace["print_extracted_data"](datos)
    else:
        _imprimir_datos_comprobante(namespace, datos)

    print()
    print("DATOS EXTRAIDOS:")
    print(json.dumps(datos, ensure_ascii=False, default=str))


def main():
    if len(sys.argv) not in (2, 3):
        print(
            "Uso: python3 ocr-service/rapid_ocr_service.py "
            "<ruta_imagen> [tipo_evidencia]",
            file=sys.stderr,
        )
        raise SystemExit(2)

    image_path = sys.argv[1]
    tipo_evidencia = sys.argv[2] if len(sys.argv) == 3 else "COMPROBANTE"
    procesar_archivo(image_path, tipo_evidencia)


if __name__ == "__main__":
    main()
