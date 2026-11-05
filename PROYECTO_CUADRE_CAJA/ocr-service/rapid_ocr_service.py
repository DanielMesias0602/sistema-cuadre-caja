import ast
import json
import re
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
            max_side_len=960,
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


def _recorte_linea_emision(imagen, resultados):
    alto, ancho = imagen.shape[:2]
    margen_y = max(4, round(alto * 0.0213))
    y_superior = round(alto * 0.3596)
    y_inferior = round(alto * 0.4065)

    anclas_cantidad = []
    anclas_comprobante = []
    for elemento in resultados:
        if not isinstance(elemento, (list, tuple)) or len(elemento) < 2:
            continue
        caja, texto = elemento[0], str(elemento[1]).upper()
        if not isinstance(caja, (list, tuple)):
            continue
        coordenadas_y = [
            punto[1]
            for punto in caja
            if isinstance(punto, (list, tuple))
            and len(punto) > 1
            and isinstance(punto[1], (int, float))
        ]
        if not coordenadas_y:
            continue

        y_minimo = min(coordenadas_y)
        y_maximo = max(coordenadas_y)
        if "CANT" in texto:
            anclas_cantidad.append(y_minimo)
        if re.search(r"\d{2,}[-–]\d{4,}", texto):
            anclas_comprobante.append((y_maximo, y_minimo))

    if anclas_cantidad and anclas_comprobante:
        y_cantidad = min(anclas_cantidad)
        comprobantes_anteriores = [
            y_maximo
            for y_maximo, _ in anclas_comprobante
            if y_maximo <= y_cantidad
        ]
        if comprobantes_anteriores:
            y_superior = round(max(comprobantes_anteriores) - margen_y)
            y_inferior = round(y_cantidad + margen_y + 1)

    y_superior = max(0, y_superior)
    y_inferior = min(alto, y_inferior)
    x_izquierdo = int(ancho * 0.19)
    x_derecho = round(ancho * 0.8454)
    recorte = imagen[y_superior:y_inferior, x_izquierdo:x_derecho]
    if recorte.size == 0:
        raise ValueError("El recorte de la zona de emisión está vacío.")

    alto_recorte, ancho_recorte = recorte.shape[:2]
    matriz = cv2.getRotationMatrix2D(
        (ancho_recorte / 2, alto_recorte / 2),
        -2,
        1,
    )
    return cv2.warpAffine(
        recorte,
        matriz,
        (ancho_recorte, alto_recorte),
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
        resultados = _normalizar_resultado_ocr(engine(image_path))

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

    es_comprobante = (
        tipo_evidencia is not None
        and str(tipo_evidencia).strip().upper() == "COMPROBANTE"
    )
    hay_fecha = any("FECHA" in texto.upper() for texto in textos)
    if es_comprobante and extension != ".pdf" and not hay_fecha:
        imagen = cv2.imread(str(image_path))
        if imagen is None:
            raise ValueError(
                f"No se pudo cargar la imagen para el segundo intento OCR: {image_path}"
            )

        alto = imagen.shape[0]
        inicio = int(alto * 0.10)
        fin = int(alto * 0.50)
        recorte = imagen[inicio:fin, :]
        if recorte.size == 0:
            raise ValueError("El recorte de la zona de emisión está vacío.")

        resultados_recorte = _normalizar_resultado_ocr(engine(recorte))
        agregar_textos(resultados_recorte)

        hay_fecha = any("FECHA" in texto.upper() for texto in textos)
        if not hay_fecha:
            recorte_emision = _recorte_linea_emision(imagen, resultados)
            resultados_emision = _normalizar_resultado_ocr(
                engine(recorte_emision)
            )
            agregar_textos(resultados_emision)

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
