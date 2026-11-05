import json
import re
import sys

from paddleocr import PaddleOCR

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ============================================================
# NUEVO: SINGLETON PADDLE OCR (Mantiene el modelo en RAM)
# ============================================================
_ocr_instance = None

def get_ocr():
    global _ocr_instance
    if _ocr_instance is None:
        print("Iniciando PaddleOCR (MODO RÁPIDO)...", flush=True)
        _ocr_instance = PaddleOCR(
            lang="es",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            det_limit_side_len=960,
            cpu_threads=8,
            enable_mkldnn=True
        )
    return _ocr_instance

# ============================================================
# UTILIDADES
# ============================================================

def buscar_patron(texto_completo, patron, grupo=1):
    coincidencia = re.search(
        patron,
        texto_completo,
        flags=re.IGNORECASE
    )

    if not coincidencia:
        return None

    return coincidencia.group(grupo).strip()


def normalizar_monto(valor):
    if valor is None:
        return None

    valor = str(valor).strip()

    valor = valor.replace("S/.", "")
    valor = valor.replace("S/", "")
    valor = valor.replace("S0/", "")
    valor = valor.replace(" ", "")

    # 1,472.00
    if "," in valor and "." in valor:

        # Si el punto aparece despues de la coma,
        # asumimos formato internacional: 1,472.00
        if valor.rfind(".") > valor.rfind(","):
            valor = valor.replace(",", "")

        # 1.472,00
        else:
            valor = valor.replace(".", "")
            valor = valor.replace(",", ".")

    # 1472,00
    elif "," in valor:
        valor = valor.replace(",", ".")

    try:
        return float(valor)

    except ValueError:
        return None


def es_numero(valor):
    if not valor:
        return False

    return re.fullmatch(
        r"\d+(?:[.,]\d+)?",
        valor.strip()
    ) is not None


def es_monto_decimal(valor):
    """
    Reconoce:

    30.00
    1472.00
    1,472.00
    1.472,00
    """

    if not valor:
        return False

    valor = valor.strip()

    patrones = [
        # 30.00
        r"\d+\.\d{2}",

        # 1,472.00
        r"\d{1,3}(?:,\d{3})+\.\d{2}",

        # 1.472,00
        r"\d{1,3}(?:\.\d{3})+,\d{2}",

        # 1472,00
        r"\d+,\d{2}"
    ]

    return any(
        re.fullmatch(patron, valor)
        for patron in patrones
    )


def limpiar_texto(texto):
    return re.sub(
        r"\s+",
        " ",
        texto.strip()
    )


def es_linea_administrativa(texto):

    if not texto:
        return False

    patrones = [
        r"^OP\.?\s*GRAVADA",
        r"^I\.?\s*G\.?\s*V\.?",
        r"^TOTAL",
        r"^SUB\s*-?\s*TOTAL",
        r"^EFECTIVO",
        r"^FORMA\s+DE\s+PAGO",
        r"^SON\s*:",
        r"^RUC",
        r"^R\.U\.C\.",
        r"^RUC/PASAPORTE",
        r"^NOMBRE\s*:",
        r"^DIRECCION\s*:",
        r"^VENDEDOR",
        r"^CLIENTE\s*:",
        r"^CONSULTAS",
        r"^PEDIDOS",
        r"^PUNTO\s+DE\s+VENTA",
        r"^DNI/OTROS",
        r"^MUCHAS\s+GRACIAS",
        r"^UNA\s+VEZ",
        r"^REPRESENTACION",
        r"^ESTA\s+PUEDE",
        r"^HTTP",
        r"^HTTPS",
        r"^DESCUENTO",
        r"^DSCTO",
        r"^ANTICIPO",
        r"^SALDO",
        r"^VUELTO",
        r"^CAMBIO",
        r"^REDONDEO",
        r"^GRACIAS\s+POR"
    ]

    return any(
        re.search(
            patron,
            texto,
            flags=re.IGNORECASE
        )
        for patron in patrones
    )


def es_unidad(texto):
    """
    Detecta lineas que son solo una unidad de medida con su cantidad.

    Ej: '120CAJAS', '2 UND', '50 KG', '10 PZAS'
    """

    if not texto:
        return False

    return re.fullmatch(
        r"\d+\s*"
        r"(?:CAJAS?|UND?|UNID|PZAS?|PZA|PIEZAS?|KG|GR|GRS|MT|MTS|M2|M3|LT|LTS|ML|PULG|PIES?)",
        texto.strip(),
        flags=re.IGNORECASE
    ) is not None


# ============================================================
# ESTRATEGIA 1: TODO EN UNA LINEA
# ============================================================

def _estrategia_producto_compacto(lineas, inicio_busqueda):
    """
    Formato:
      <cantidad> <descripcion> <precio> <total>     (todo en una linea)

    Ej: "2 CEMENTO SOL 18.50 37.00"
    """

    productos = []

    patron_producto_completo = re.compile(
        r"^\s*"
        r"(\d+(?:[.,]\d+)?)"
        r"\s+"
        r"(.+?)"
        r"\s+"
        r"(\d{1,3}(?:,\d{3})*\.\d{2})"
        r"\s+"
        r"(\d{1,3}(?:,\d{3})*\.\d{2})"
        r"\s*$",
        flags=re.IGNORECASE
    )

    for linea in lineas[inicio_busqueda:]:

        coincidencia = patron_producto_completo.match(linea)

        if not coincidencia:
            continue

        cantidad = normalizar_monto(coincidencia.group(1))
        descripcion = coincidencia.group(2).strip()
        precio_unitario = normalizar_monto(coincidencia.group(3))
        total_producto = normalizar_monto(coincidencia.group(4))

        if (
            descripcion
            and cantidad is not None
            and precio_unitario is not None
            and total_producto is not None
        ):
            productos.append({
                "descripcion": descripcion,
                "cantidad": cantidad,
                "precio_unitario": precio_unitario,
                "total": total_producto
            })

    return productos


# ============================================================
# ESTRATEGIA 2: CANTIDAD SOLA + DESCRIPCION + PRECIO + TOTAL
# ============================================================

def _estrategia_cantidad_sola(lineas, inicio_busqueda):
    """
    Formato:
      <cantidad>           (linea sola)
      <descripcion>
      <precio>
      <total>
      <descripcion restante opcional>

    Ej:
      2
      CEMENTO SOL
      18.50
      37.00
    """

    productos = []
    indice = inicio_busqueda

    while indice < len(lineas):

        linea = lineas[indice]

        if not re.fullmatch(r"\d+(?:[.,]\d+)?", linea):
            indice += 1
            continue

        cantidad = normalizar_monto(linea)

        if cantidad is None:
            indice += 1
            continue

        if cantidad <= 0 or cantidad > 10000:
            indice += 1
            continue

        descripcion_partes = []
        precio_unitario = None
        total_producto = None

        siguiente = indice + 1

        while siguiente < len(lineas):

            candidato = lineas[siguiente]

            if not candidato:
                siguiente += 1
                continue

            if es_linea_administrativa(candidato):
                break

            if es_monto_decimal(candidato):

                valor = normalizar_monto(candidato)

                if precio_unitario is None:
                    precio_unitario = valor
                    siguiente += 1
                    continue

                if total_producto is None:
                    total_producto = valor
                    siguiente += 1
                    continue

            if not es_numero(candidato):
                descripcion_partes.append(candidato)

            siguiente += 1

            if (
                precio_unitario is not None
                and total_producto is not None
                and siguiente < len(lineas)
            ):
                proximo = lineas[siguiente]

                if re.fullmatch(r"\d+(?:[.,]\d+)?", proximo):
                    break

                # --- NUEVO: Detectar inicio de nuevo producto ---
                # Si la proxima linea empieza con cantidad decimal y texto (ej. "10.08 WPY...")
                # significa que es un nuevo producto. Cortamos aqui para no fusionarlos.
                if re.match(r"^\s*\d+(?:[.,]\d+)?\s+[A-Za-z]{3,}", proximo):
                    break

                if es_linea_administrativa(proximo):
                    break

        descripcion = limpiar_texto(" ".join(descripcion_partes))

        if (
            descripcion
            and precio_unitario is not None
            and total_producto is not None
        ):
            productos.append({
                "descripcion": descripcion,
                "cantidad": cantidad,
                "precio_unitario": precio_unitario,
                "total": total_producto
            })

            indice = siguiente
            continue

        indice += 1

    return productos


# ============================================================
# ESTRATEGIA 3: CANTIDAD + DESCRIPCION EN MISMA LINEA
# ============================================================

def _estrategia_linea_cantidad_descripcion(lineas, inicio_busqueda):
    """
    Formato (caso BE03-00002937):

      <cantidad> <descripcion>      (misma linea)
      <precio unitario>
      <total>
      [<unidad>]

    Ej:
      61.92 LPY66024 FLOOR TILE
      36.81
      2,279.00
      120CAJAS
    """

    productos = []
    indice = inicio_busqueda

    # Cantidad + texto libre en la misma linea.
    # La descripcion debe contener al menos una letra
    # (para no confundir con lineas solo numericas).
    patron_inicio = re.compile(
        r"^\s*(\d+(?:[.,]\d+)?)\s+(.+?)\s*$",
        flags=re.IGNORECASE
    )

    # Patron para detectar una linea administrativa "real":
    # debe tener ":" o un monto con decimales. Las palabras
    # sueltas del encabezado ("TOTAL", "PRECIO", "DESCRIPCION")
    # NO son administrativas reales.
    patron_admin_real = re.compile(
        r":\s*\d|\d+[.,]\d+",
        flags=re.IGNORECASE
    )

    while indice < len(lineas):

        linea = lineas[indice]

        coincidencia = patron_inicio.match(linea)

        if not coincidencia:

            # Solo terminar si es una linea administrativa REAL
            # (pie de boleta con montos). Las palabras sueltas del
            # encabezado no rompen el bucle.
            if (
                es_linea_administrativa(linea)
                and patron_admin_real.search(linea)
            ):
                break

            indice += 1
            continue

        cantidad = normalizar_monto(coincidencia.group(1))
        descripcion_base = coincidencia.group(2).strip()

        # Validaciones para evitar falsos positivos
        if cantidad is None or cantidad <= 0 or cantidad > 10000:
            indice += 1
            continue

        if not descripcion_base or len(descripcion_base) < 3:
            indice += 1
            continue

        # Debe tener al menos una letra
        if not re.search(r"[A-Za-z]", descripcion_base):
            indice += 1
            continue

        # Si es unidad disfrazada (ej. "120CAJAS"), no es descripcion
        if es_unidad(linea):
            indice += 1
            continue

        precio_unitario = None
        total_producto = None

        siguiente = indice + 1
        intentos = 0

        while siguiente < len(lineas) and intentos < 6:

            intentos += 1
            candidato = lineas[siguiente]

            if not candidato:
                siguiente += 1
                continue

            if (
                es_linea_administrativa(candidato)
                and patron_admin_real.search(candidato)
            ):
                break

            if es_monto_decimal(candidato):

                valor = normalizar_monto(candidato)

                if precio_unitario is None:
                    precio_unitario = valor
                    siguiente += 1
                    continue

                if total_producto is None:
                    total_producto = valor
                    siguiente += 1
                    break

            # Si es unidad, la ignoramos pero seguimos buscando
            if es_unidad(candidato):
                siguiente += 1
                continue

            # Si aparece una linea con cantidad+descripcion,
            # es el siguiente producto. Cortamos aqui.
            if patron_inicio.match(candidato):
                break

            # Otro texto: lo anexamos a la descripcion
            if (
                not es_numero(candidato)
                and re.search(r"[A-Za-z]", candidato)
                and len(candidato) >= 3
                and not es_unidad(candidato)
            ):
                descripcion_base = f"{descripcion_base} {candidato}"

            siguiente += 1

        if precio_unitario is not None:

            if total_producto is None:
                total_producto = round(
                    cantidad * precio_unitario,
                    2
                )

            productos.append({
                "descripcion": limpiar_texto(descripcion_base),
                "cantidad": cantidad,
                "precio_unitario": precio_unitario,
                "total": total_producto
            })

        indice = siguiente

    return productos

# ============================================================
# ORQUESTADOR: BUCLE UNIFICADO (FIX APLICADO AQUÍ)
# ============================================================

def extraer_productos(textos):
    lineas = [
        limpiar_texto(texto)
        for texto in textos
        if limpiar_texto(texto)
    ]

    # Buscar inicio del detalle
    inicio_busqueda = 0
    for indice, linea in enumerate(lineas):
        if re.search(r"\bCANT\.?\b", linea, flags=re.IGNORECASE):
            inicio_busqueda = indice + 1
            break

    productos = []
    i = inicio_busqueda

    while i < len(lineas):
        linea = lineas[i]
        if not linea:
            i += 1
            continue

        # Si es una línea administrativa real, terminamos
        if es_linea_administrativa(linea) and re.search(r":\s*\d|\d+[.,]\d+", linea):
            break

        cantidad = None
        desc_partes = []

        # 1. Detectar cantidad sola o cantidad + descripción
        match_solo = re.fullmatch(r"(\d+(?:[.,]\d+)?)", linea)
        match_comb = re.match(r"^\s*(\d+(?:[.,]\d+)?)\s+(.+)$", linea)
        match_cantidad_final = re.match(r"^(.+?)\s+(\d+(?:[.,]\d+)?)$", linea)

        if match_solo:
            cantidad = normalizar_monto(match_solo.group(1))
            i += 1
            # Leer descripción
            while i < len(lineas):
                cand = lineas[i]
                if not cand:
                    i += 1
                    continue
                if es_monto_decimal(cand) or es_linea_administrativa(cand):
                    break
                if re.match(r"^\s*\d+(?:[.,]\d+)?\s+[A-Za-z]", cand):
                    break  # Es inicio del siguiente producto
                if not es_numero(cand) and not es_unidad(cand):
                    desc_partes.append(cand)
                i += 1

        elif (
            match_comb
            and re.search(r"[A-Za-z]", match_comb.group(2))
            and not es_unidad(linea)
        ):
            cantidad = normalizar_monto(match_comb.group(1))
            desc_partes.append(match_comb.group(2))
            i += 1
        elif (
            match_cantidad_final
            and re.search(r"[A-Za-z]", match_cantidad_final.group(1))
            and not es_linea_administrativa(linea)
        ):
            cantidad = normalizar_monto(match_cantidad_final.group(2))
            descripcion_inicial = match_cantidad_final.group(1).strip()
            if cantidad is not None and 0 < cantidad <= 10000:
                desc_partes.append(descripcion_inicial)
                i += 1
            else:
                cantidad = None

        # 2. Si detectamos cantidad, buscar precio y total
        if cantidad is not None:
            precio = None
            total = None

            while i < len(lineas):
                cand = lineas[i]
                if not cand:
                    i += 1
                    continue
                if es_linea_administrativa(cand):
                    break

                if es_monto_decimal(cand):
                    val = normalizar_monto(cand)
                    if precio is None:
                        precio = val
                        i += 1
                        continue
                    if total is None:
                        total = val
                        i += 1
                        continue

                if es_unidad(cand):
                    i += 1
                    continue

                if re.match(r"^\s*\d+(?:[.,]\d+)?\s+[A-Za-z]", cand):
                    break  # Es inicio del siguiente producto

                if not es_numero(cand) and not es_unidad(cand) and not es_linea_administrativa(cand):
                    if precio is not None and total is not None:
                        match_nueva_cantidad = re.match(
                            r"^(.+?)\s+(\d+(?:[.,]\d+)?)$",
                            cand
                        )
                        if match_nueva_cantidad:
                            texto_siguiente = match_nueva_cantidad.group(1).strip()
                            cantidad_siguiente = normalizar_monto(match_nueva_cantidad.group(2))
                            if (
                                re.search(r"[A-Za-z]", texto_siguiente)
                                and cantidad_siguiente is not None
                                and 0 < cantidad_siguiente <= 10000
                            ):
                                break
                    desc_partes.append(cand)
                i += 1

            if precio is not None and total is not None:
                if len(desc_partes) > 0:
                    productos.append({
                        "descripcion": limpiar_texto(" ".join(desc_partes)),
                        "cantidad": cantidad,
                        "precio_unitario": precio,
                        "total": total
                    })
        else:
            i += 1

    return productos


# ============================================================
# HELPERS DE EXTRACCION TOLERANTE (NUEVOS)
# ============================================================

def extraer_monto_tolerante(texto, etiqueta):
    """
    Busca la etiqueta y captura el primer monto con 2 decimales que aparezca
    en los siguientes 30 caracteres. Tolera ruido como 'G', saltos de linea, etc.
    """
    regex = re.compile(
        etiqueta + r"[\s\S]{0,30}?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})",
        flags=re.IGNORECASE
    )
    coincidencia = regex.search(texto)
    if coincidencia:
        return normalizar_monto(coincidencia.group(1))
    return None


def extraer_total_explicito(texto):
    patron = re.compile(
        r"(?im)^[ \t]*TOTAL\b[ \t]*"
        r"(?:(?:S[ \t]*[/|][ \t]*:?)|:)?[ \t]*"
        r"(?:S[ \t]*[/|][ \t]*:?[ \t]*)?"
        r"(?:\r?\n[ \t]*(?:S[ \t]*[/|][ \t]*:?[ \t]*)?)?"
        r"(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)"
    )
    coincidencia = patron.search(texto)
    if coincidencia:
        return normalizar_monto(coincidencia.group(1))
    return None


def extraer_totales_desordenados(texto):
    lineas = _texto_comprobante_sin_json(texto).splitlines()
    patron_etiqueta = re.compile(
        r"\bOP\.?\s*GRAVADA(?=\s|S|:|$)|"
        r"\bI\.?\s*G\.?\s*V\.?(?=\s|S|:|$)|"
        r"\bTOTAL(?=\s|S|:|$)",
        re.IGNORECASE
    )
    indices_etiquetas = [
        indice
        for indice, linea in enumerate(lineas)
        if patron_etiqueta.search(linea)
    ]
    if not indices_etiquetas:
        return None

    texto_etiquetas = "\n".join(lineas)
    if not re.search(
        r"\bOP\.?\s*GRAVADA(?=\s|S|:|$)",
        texto_etiquetas,
        re.IGNORECASE
    ):
        return None
    if not re.search(
        r"\bI\.?\s*G\.?\s*V\.?(?=\s|S|:|$)",
        texto_etiquetas,
        re.IGNORECASE
    ):
        return None
    if not re.search(r"\bTOTAL(?=\s|S|:|$)", texto_etiquetas, re.IGNORECASE):
        return None

    inicio = min(indices_etiquetas)
    fin = min(len(lineas), max(indices_etiquetas) + 6)
    patron_monto = re.compile(
        r"(?<![\d/])\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)"
    )
    montos = [
        normalizar_monto(coincidencia.group(0))
        for linea in lineas[inicio:fin]
        for coincidencia in patron_monto.finditer(linea)
    ]
    if len(montos) != 3 or any(monto is None for monto in montos):
        return None

    op_gravada_candidata, igv_candidato, total_candidato = sorted(montos)
    if abs((op_gravada_candidata + igv_candidato) - total_candidato) > 0.10:
        return None

    igv_calculado = round(op_gravada_candidata * 0.18, 2)
    if abs(igv_candidato - igv_calculado) > 0.10:
        op_gravada_candidata, igv_candidato = igv_candidato, op_gravada_candidata
        igv_calculado = round(op_gravada_candidata * 0.18, 2)
        if abs(igv_candidato - igv_calculado) > 0.10:
            return None

    return op_gravada_candidata, igv_candidato, total_candidato


def extraer_totales_matematicos(texto):
    lineas = _texto_comprobante_sin_json(texto).splitlines()
    patron_total = re.compile(
        r"\bTOTAL(?=\s|S|:|$)",
        re.IGNORECASE
    )
    indices_total = [
        indice
        for indice, linea in enumerate(lineas)
        if patron_total.search(linea)
    ]
    if not indices_total:
        return None

    indice_total = indices_total[-1]
    lineas_totales = lineas[indice_total:indice_total + 6]
    patron_monto = re.compile(
        r"(?<![\d/])\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)"
    )
    montos = [
        normalizar_monto(coincidencia.group(0))
        for linea in lineas_totales
        for coincidencia in patron_monto.finditer(linea)
    ]
    montos = [monto for monto in montos if monto is not None and monto > 0]
    if not montos:
        return None

    total = max(montos)
    igv = round(total - (total / 1.18), 2)
    op_gravada = round(total - igv, 2)
    return op_gravada, igv, total


def validar_totales_comprobante(resultado):
    op_gravada = resultado.get("op_gravada")
    igv = resultado.get("igv")
    total = resultado.get("total")

    if total is None:
        if op_gravada is not None and igv is not None:
            if round(op_gravada, 2) == round(igv, 2) and op_gravada > 0:
                resultado["igv"] = round(op_gravada * 0.18, 2)
                resultado["total"] = round(op_gravada + resultado["igv"], 2)
            else:
                resultado["total"] = round(op_gravada + igv, 2)
        return resultado

    if op_gravada is not None and igv is not None:
        montos_iguales = round(op_gravada, 2) == round(igv, 2)
        suma_coincide = abs((op_gravada + igv) - total) <= 0.10

        if suma_coincide and not montos_iguales:
            return resultado

        igv_calculado = round(total - op_gravada, 2)
        if igv_calculado >= 0:
            resultado["igv"] = igv_calculado
            return resultado

        op_gravada_calculada = round(total - igv, 2)
        if op_gravada_calculada >= 0:
            resultado["op_gravada"] = op_gravada_calculada
            return resultado

    elif op_gravada is not None:
        igv_calculado = round(total - op_gravada, 2)
        if igv_calculado >= 0:
            resultado["igv"] = igv_calculado
            return resultado

    elif igv is not None:
        op_gravada_calculada = round(total - igv, 2)
        if op_gravada_calculada >= 0:
            resultado["op_gravada"] = op_gravada_calculada
            return resultado

    resultado["igv"] = round(total * 0.18 / 1.18, 2)
    resultado["op_gravada"] = round(total - resultado["igv"], 2)
    return resultado


def corregir_nombres_espanoles(nombre):
    if not nombre:
        return nombre

    correcciones = {
        "PENA": "PEÑA",
        "MUNOZ": "MUÑOZ",
        "CANAS": "CAÑAS",
        "NINO": "NIÑO",
    }

    def corregir_token(coincidencia):
        token = coincidencia.group(0)
        corregido = correcciones[token.upper()]
        if token.isupper():
            return corregido
        if token.islower():
            return corregido.lower()
        return corregido[0] + corregido[1:].lower()

    patron = re.compile(
        r"\b(?:PENA|MUNOZ|CANAS|NINO)\b",
        flags=re.IGNORECASE
    )
    return patron.sub(corregir_token, str(nombre))


def reconstruir_espacios_nombre(nombre):
    if not nombre:
        return nombre

    texto = str(nombre).strip()
    if not texto or re.search(r"\s", texto):
        return nombre

    vocabulario = {
        "ALEXANDRA", "ALEXIS", "ALFREDO", "ANA", "ANDREA", "ANGEL",
        "ANTONIO", "CARMEN", "CARLOS", "CYNTHIA", "DAVID",
        "EDWIN", "ELENA", "EMILIO", "FERNANDA", "FRANCESCA", "FRANCISCO",
        "GABRIEL", "GLORIA", "IRENE", "JAVIER", "JESUS", "JOSE", "JUAN",
        "JULIA", "LAURA", "LIZ", "LORENA", "LUIS", "MANUEL", "MARIA",
        "MARTIN", "MIGUEL", "NATALY", "PEDRO", "ROSA", "SANDRA", "THALIA",
        "ZENON", "AYBAR", "CAÑAS", "CASTRO", "DIAZ", "FERNANDEZ", "FLORES",
        "GARCIA", "GONZALES", "GONZALEZ", "LOZA", "MARTINEZ", "MEDINA",
        "MENDOZA", "MUÑOZ", "PAREDES", "PENA", "PEÑA", "PEREZ", "RAMIREZ",
        "REBATA", "REBATTA", "ROJAS", "SALAZAR", "SANCHEZ", "SENISSE",
        "SILVA", "SORIA", "SORIANO", "TORRES", "VALENCIA", "VARGAS",
        "VASQUEZ", "VEGA",
    }

    normalizado = texto.upper()
    mejores = [None] * (len(normalizado) + 1)
    mejores[0] = []

    for inicio in range(len(normalizado)):
        if mejores[inicio] is None:
            continue
        for fin in range(inicio + 2, min(len(normalizado), inicio + 16) + 1):
            palabra = normalizado[inicio:fin]
            if palabra not in vocabulario:
                continue
            candidato = mejores[inicio] + [palabra]
            actual = mejores[fin]
            if actual is None or len(candidato) < len(actual):
                mejores[fin] = candidato

    partes = mejores[-1]
    if not partes or len(partes) < 2:
        return nombre

    def conservar_formato(palabra):
        if texto.isupper():
            return palabra
        if texto.islower():
            return palabra.lower()
        return palabra.capitalize()

    return " ".join(conservar_formato(palabra) for palabra in partes)


def _texto_comprobante_sin_json(texto_completo):
    texto = str(texto_completo or "").split("DATOS EXTRAIDOS:", 1)[0]
    lineas_limpias = []

    for linea in texto.splitlines():
        linea = re.sub(r"^\s*\[\s*\d+(?:[.,]\d+)?\s*\]\s*", "", linea)
        cortes = [
            posicion
            for caracter in ('{', '}', '"', '[', ']')
            if (posicion := linea.find(caracter)) >= 0
        ]
        match_null = re.search(r"\bnull\b", linea, flags=re.IGNORECASE)
        if match_null:
            cortes.append(match_null.start())
        if cortes:
            linea = linea[:min(cortes)]
        lineas_limpias.append(linea.rstrip())

    return "\n".join(lineas_limpias)


def extraer_cliente(texto_completo):
    """
    Busca CLIENTE o NOMBRE y limita la captura al nombre, sin incorporar
    descripciones, direcciones ni campos posteriores.
    """
    patron_fin_nombre = re.compile(
        r"\b(?:REPRESENTACI[ÓO]N|DIRECCI[ÓO]N|RUC|DNI|VENDEDOR|PEDIDOS|"
        r"PUNTO\s+DE\s+VENTA)\b|"
        r"(?<!\S)(?:AV|JR|CAL|OTR)\.|https?\b\S*|www\.\S*",
        flags=re.IGNORECASE
    )
    etiquetas_parada = re.compile(
        r"^(?:REPRESENTACI[ÓO]N|DIRECCI[ÓO]N|DNI|RUC|TOTAL|SUBTOTAL|IGV|OP\.?|"
        r"EFECTIVO|VENDEDOR(?:\s*\(\s*A\s*\))?|PEDIDOS|PUNTO\s+DE\s+VENTA|"
        r"AV\.|JR\.|CAL\.|OTR\.|HTTPS?://|WWW\.|TIPO|SERIE|N[ÚU]MERO|FECHA|HORA|"
        r"TEL[ÉE]FONO|CORREO|MONEDA|FORMA\s+DE\s+PAGO)\b",
        flags=re.IGNORECASE
    )
    texto_ocr = _texto_comprobante_sin_json(texto_completo)
    lineas = [linea.strip() for linea in texto_ocr.splitlines()]

    def limpiar_valor(valor):
        coincidencia_fin = patron_fin_nombre.search(valor)
        if coincidencia_fin:
            valor = valor[:coincidencia_fin.start()]
        valor = re.split(
            r"\b(?:null|undefined|productos|tipo_comprobante)\b",
            valor,
            maxsplit=1,
            flags=re.IGNORECASE
        )[0]
        valor = re.split(
            r"\s*(?=(?:DIRECCI[ÓO]N|DNI|RUC|TOTAL|SUBTOTAL|IGV|OP\.?|"
            r"EFECTIVO|VENDEDOR|TIPO|SERIE|N[ÚU]MERO|FECHA|HORA|"
            r"TEL[ÉE]FONO|CORREO|MONEDA|FORMA\s+DE\s+PAGO)\b)",
            valor,
            maxsplit=1,
            flags=re.IGNORECASE
        )[0]
        valor = re.sub(r"[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ\s.&/-]", "", valor)
        valor = re.sub(r"\s+", " ", valor).strip(" :-")
        if len(valor) > 60:
            puntos = [coincidencia.start() for coincidencia in re.finditer(r"\.", valor)]
            palabras_clave = [
                coincidencia.start()
                for coincidencia in patron_fin_nombre.finditer(valor)
            ]
            cortes = puntos + palabras_clave
            valor = valor[:min(cortes)] if cortes else valor[:60]
            valor = valor[:60].rstrip()
        return valor

    def normalizar_nombre(valor):
        nombre = corregir_nombres_espanoles(
            reconstruir_espacios_nombre(valor)
        )
        return nombre[:60].rstrip() if len(nombre) > 60 else nombre

    for indice, linea in enumerate(lineas):
        match = re.match(
            r"^\s*(?:CLIENTE|NOMBRE)\b\s*:?\s*([^\r\n]{0,160})$",
            linea,
            re.IGNORECASE
        )
        if not match:
            continue

        partes = []
        valor_inicial = limpiar_valor(match.group(1))
        if valor_inicial:
            partes.append(valor_inicial)
        else:
            siguiente_indice = indice + 1
            while siguiente_indice < len(lineas) and not lineas[siguiente_indice]:
                siguiente_indice += 1
            if siguiente_indice < len(lineas):
                siguiente = lineas[siguiente_indice]
                if not etiquetas_parada.match(siguiente):
                    candidato = limpiar_valor(siguiente)
                    if candidato and not re.search(r"\d{2,}", candidato):
                        partes.append(candidato)
                        siguiente_indice += 1
                        if siguiente_indice < len(lineas):
                            sufijo = limpiar_valor(lineas[siguiente_indice])
                            if re.fullmatch(
                                r"(?:S\.?\s*A\.?\s*C\.?|E\.?\s*I\.?\s*R\.?\s*L\.?|S\.?\s*A\.?)",
                                sufijo,
                                flags=re.IGNORECASE
                            ):
                                partes.append(sufijo)

        nombre = re.sub(r"\s+", " ", " ".join(partes)).strip()
        if len(nombre) >= 4:
            return normalizar_nombre(nombre)

    PALABRAS_RUIDO = [
        'representacion', 'impresa', 'comprobante', 'electronico',
        'documento', 'consulta', 'gracias', 'pedidos', 'aceptan',
        'cambios', 'devoluciones', 'punto de venta', 'detalle de productos',
        'forma de pago', 'total', 'subtotal', 'direccion', 'ruc', 'dni',
        'otros', 'fecha', 'hora', 'vendedor', 'tipo', 'serie', 'numero',
        'null', 'undefined', 'true', 'false', 'none'
    ]

    lineas = [l.strip() for l in texto_ocr.split('\n') if l.strip()]

    for i, linea in enumerate(lineas):
        linea_upper = linea.upper()
        if 'CLIENTE' in linea_upper or 'NOMBRE' in linea_upper:
            # Compatibilidad con etiquetas OCR embebidas en una línea.
            if ':' in linea:
                partes = linea.split(':', 1)
                if len(partes) > 1:
                    valor = limpiar_valor(partes[1])
                    if len(valor) >= 4 and re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]{4,}", valor):
                        if not any(p in valor.lower() for p in PALABRAS_RUIDO):
                            return normalizar_nombre(valor)

            # Compatibilidad con OCR que pone el valor en la línea siguiente.
            for j in range(i + 1, min(i + 2, len(lineas))):
                linea_j = lineas[j]
                linea_j_upper = linea_j.upper()
                linea_j_lower = linea_j.lower()

                # Si llegamos a otra etiqueta, parar
                if re.match(r"^(DIRECCION|DNI|RUC|TOTAL|IGV|OP\.|EFECTIVO|VENDEDOR|TIPO|SERIE|NUMERO)", linea_j_upper):
                    break

                # Filtrar ruido
                if any(p == linea_j_lower for p in PALABRAS_RUIDO):
                    continue
                if len(linea_j) < 4:
                    continue
                if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]{4,}", linea_j):
                    continue
                if re.search(r"\d{2,}", linea_j):
                    continue

                # Limpiar y retornar
                limpio = limpiar_valor(linea_j)
                if len(limpio) >= 4:
                    return normalizar_nombre(limpio)

    return None


def extraer_vendedor(texto_completo):
    texto_ocr = _texto_comprobante_sin_json(texto_completo)
    lineas = [linea.strip() for linea in texto_ocr.splitlines()]
    etiquetas_parada = re.compile(
        r"^(?:CLIENTE|NOMBRE|RUC|DNI|DIRECCI[ÓO]N|FECHA|HORA|"
        r"TIPO|SERIE|N[ÚU]MERO|OP\.?|IGV|TOTAL|EFECTIVO)\b",
        flags=re.IGNORECASE
    )

    for indice, linea in enumerate(lineas):
        match = re.match(
            r"^\s*VENDEDOR\s*(?:\(\s*A\s*\)|A)?\s*:?\s*([^\r\n]{0,160})$",
            linea,
            flags=re.IGNORECASE
        )
        if not match:
            continue

        valor = match.group(1).strip()
        if not valor:
            for siguiente in lineas[indice + 1:indice + 3]:
                if etiquetas_parada.match(siguiente):
                    break
                if siguiente:
                    valor = siguiente
                    break

        valor = re.split(
            r"\s*(?=(?:CLIENTE|NOMBRE|RUC|DNI|DIRECCI[ÓO]N|FECHA|HORA|"
            r"TIPO|SERIE|N[ÚU]MERO|OP\.?|IGV|TOTAL|EFECTIVO)\b)",
            valor,
            maxsplit=1,
            flags=re.IGNORECASE
        )[0]
        valor = re.sub(r"^[\s,:;*]+|[\s,:;*]+$", "", valor)
        valor = limpiar_texto(valor)
        if valor and re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}", valor):
            return corregir_nombres_espanoles(
                reconstruir_espacios_nombre(valor)
            )

    return None


def extraer_serie_numero(texto_completo):
    """
    Tolera N°, No, Nº, y formatos con/sin guion.
    """
    texto_ocr = _texto_comprobante_sin_json(texto_completo)
    patrones = [
        r"(?<![A-Z0-9])N?((?:FE|BE)\d{2,4})\s*[- ]\s*(\d{6,})(?!\d)",
        r"N[o°º]?\s*([A-Z]{2}\d{2,4})\s*-\s*(\d{6,})",
        r"N[o°º]?\s*([A-Z]{2}\d{2,4})\s+(\d{6,})",
        r"([A-Z]{2}\d{2,4})-(\d{6,})",
    ]
    for patron in patrones:
        coincidencia = re.search(patron, texto_ocr, flags=re.IGNORECASE)
        if coincidencia:
            return coincidencia.group(1).upper(), coincidencia.group(2)
    return None, None


# ============================================================
# EXTRACCION DEL COMPROBANTE
# ============================================================

def extraer_datos_comprobante(textos):

    texto_completo = "\n".join(textos)

    resultado = {
        "tipo_comprobante": None,
        "serie": None,
        "numero": None,
        "fecha": None,
        "hora": None,
        "vendedor": None,
        "cliente": None,
        "productos": [],
        "igv": None,
        "op_gravada": None,
        "efectivo": None,
        "total": None,
        "moneda": "PEN",
        "requiere_revision": True,
        "requiere_confirmacion": True
    }

    # ========================================================
    # TIPO
    # ========================================================

    texto_tipo = _texto_comprobante_sin_json(texto_completo).upper().translate(str.maketrans({
        "Á": "A",
        "É": "E",
        "Í": "I",
        "Ó": "O",
        "Ú": "U",
        "Ü": "U",
    }))
    tipo_normalizado = re.sub(r"[^A-Z]", "", texto_tipo)
    if "FACTURA" in tipo_normalizado:
        resultado["tipo_comprobante"] = "FACTURA"

    elif "BOLETA" in tipo_normalizado:
        resultado["tipo_comprobante"] = "BOLETA"

    # ========================================================
    # SERIE Y NUMERO (tolerante)
    # ========================================================

    serie, numero = extraer_serie_numero(texto_completo)
    if serie:
        resultado["serie"] = serie
    if numero:
        resultado["numero"] = numero

    # ========================================================
    # FECHA (tolerante a multilineas)
    # ========================================================

    fecha = buscar_patron(
        texto_completo,
        r"FECHA\s*DE\s*EMISI[ÓO]N[\s\S]{0,80}?(\d{2}/\d{2}/\d{4})"
    )

    if fecha:
        resultado["fecha"] = fecha

    # ========================================================
    # HORA
    # ========================================================

    coincidencia_hora = re.search(
        r"(?<!\d)(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?!\d)",
        _texto_comprobante_sin_json(texto_completo)
    )
    hora = coincidencia_hora.group(0) if coincidencia_hora else None

    if hora:
        resultado["hora"] = hora

    # ========================================================
    # VENDEDOR
    # ========================================================

    vendedor = extraer_vendedor(texto_completo)

    if vendedor:
        vendedor = corregir_nombres_espanoles(
            reconstruir_espacios_nombre(limpiar_texto(vendedor))
        )
        if vendedor:
            resultado["vendedor"] = vendedor

    # ========================================================
    # CLIENTE (nuevo - tolerante)
    # ========================================================

    cliente = extraer_cliente(texto_completo)
    if cliente:
        resultado["cliente"] = cliente

    # ========================================================
    # IGV (tolerante a ruido)
    # ========================================================

    igv = extraer_monto_tolerante(
        texto_completo,
        r"I\.?\s*G\.?\s*V\.?\s*S[/|]\s*:?"
    )

    if igv is not None:
        resultado["igv"] = igv

    # ========================================================
    # OP. GRAVADA (nuevo)
    # ========================================================

    op_gravada = extraer_monto_tolerante(
        texto_completo,
        r"OP\.?\s*GRAVADA\s*S[/|]\s*:?"
    )

    if op_gravada is not None:
        resultado["op_gravada"] = op_gravada

    # ========================================================
    # TOTAL (tolerante)
    # ========================================================

    total = extraer_total_explicito(texto_completo)

    if total is None:
        total = extraer_monto_tolerante(
            texto_completo,
            r"TOTAL\s*S[/|]\s*:?"
        )

    if total is not None:
        resultado["total"] = total

    # ========================================================
    # EFECTIVO (tolerante)
    # ========================================================

    efectivo = extraer_monto_tolerante(
        texto_completo,
        r"EFECTIVO\s*S[/|]\s*:?"
    )

    if efectivo is not None:
        resultado["efectivo"] = efectivo

    totales_desordenados = extraer_totales_desordenados(texto_completo)
    if totales_desordenados is not None:
        (
            resultado["op_gravada"],
            resultado["igv"],
            resultado["total"],
        ) = totales_desordenados

    totales_matematicos = extraer_totales_matematicos(texto_completo)
    if totales_matematicos is not None:
        (
            resultado["op_gravada"],
            resultado["igv"],
            resultado["total"],
        ) = totales_matematicos

    op_gravada_final = resultado["op_gravada"]
    igv_final = resultado["igv"]
    total_final = resultado["total"]
    if op_gravada_final is not None and igv_final is not None:
        total_calculado = round(op_gravada_final + igv_final, 2)
        if total_final is None or total_final < total_calculado:
            resultado["total"] = total_calculado

    # ========================================================
    # VALIDACION MATEMATICA DE TOTALES
    # ========================================================

    validar_totales_comprobante(resultado)

    # ========================================================
    # PRODUCTOS (orquesta las 3 estrategias)
    # ========================================================

    resultado["productos"] = []

    lineas = [str(linea) for linea in textos if linea]
    texto_fallback = " ".join(lineas)

    if not resultado["fecha"]:
        texto_encabezado_fecha = " ".join(
            str(linea) for linea in textos[:15] if linea
        )
        coincidencia_fecha = re.search(
            r"(\d{2}[/-]\d{2}[/-]\d{4})",
            texto_encabezado_fecha,
        )
        if coincidencia_fecha:
            resultado["fecha"] = coincidencia_fecha.group(1).strip()
            print(f"FALLBACK FECHA APLICADO: {resultado['fecha']}")
        else:
            coincidencia_fecha = re.search(
                r"(\d{2})[/-](\d{2})[/-](\d{2,4})",
                texto_encabezado_fecha,
            )
            if coincidencia_fecha:
                dia, mes, anio = coincidencia_fecha.groups()
                if len(anio) == 2:
                    anio = f"20{anio}"
                resultado["fecha"] = f"{dia}/{mes}/{anio}".strip()
                print(f"FALLBACK FECHA APLICADO: {resultado['fecha']}")

    if not resultado["hora"]:
        coincidencia_hora = re.search(
            r"(\d{2}:\d{2}(?::\d{2})?)",
            texto_fallback,
        )
        if coincidencia_hora:
            resultado["hora"] = coincidencia_hora.group(1).strip()

    return resultado


# ============================================================
# MOSTRAR RESULTADOS
# ============================================================

def mostrar_resultado(datos):

    print()
    print("=== DATOS DEL COMPROBANTE ===")

    print(f"Tipo: {datos['tipo_comprobante']}")
    print(f"Serie: {datos['serie']}")
    print(f"Número: {datos['numero']}")
    print(f"Fecha: {datos['fecha']}")
    print(f"Hora: {datos['hora']}")
    print(f"Vendedor: {datos['vendedor']}")
    print(f"Cliente: {datos['cliente']}")

    print()
    print("=== DETALLE DE PRODUCTOS ===")

    if not datos["productos"]:
        print("No se detectaron productos estructurados.")
    else:
        for indice, producto in enumerate(datos["productos"], start=1):
            print(f"Producto {indice}")
            print(f"Descripción: {producto['descripcion']}")
            print(f"Cantidad: {producto['cantidad']}")
            print(f"Precio unitario: S/ {producto['precio_unitario']:.2f}")
            print(f"Total: S/ {producto['total']:.2f}")
            print()

    print("=== TOTALES ===")

    if datos["op_gravada"] is not None:
        print(f"Op. Gravada: S/ {datos['op_gravada']:.2f}")
    else:
        print("Op. Gravada: None")

    if datos["igv"] is not None:
        print(f"IGV: S/ {datos['igv']:.2f}")
    else:
        print("IGV: None")

    if datos["efectivo"] is not None:
        print(f"Efectivo: S/ {datos['efectivo']:.2f}")
    else:
        print("Efectivo: None")

    if datos["total"] is not None:
        print(f"Total: S/ {datos['total']:.2f}")
    else:
        print("Total: None")

    print(f"Moneda: {datos['moneda']}")

    print()
    print("=== ESTADO DE EXTRACCIÓN ===")
    print(f"Requiere revisión: {datos['requiere_revision']}")
    print(f"Requiere confirmación: {datos['requiere_confirmacion']}")


# ============================================================
# NUEVO: FUNCION EXPORTABLE PARA FLASK
# ============================================================
def procesar_archivo(image_path):
    ocr = get_ocr()
    print(f"Procesando imagen: {image_path}")

    results = ocr.predict(image_path)

    textos = []
    puntajes = []

    for result in results:
        data = result.json["res"]
        textos.extend(data.get("rec_texts", []))
        puntajes.extend(data.get("rec_scores", []))

    print("OCR ejecutado correctamente.")

    # ========================================================
    # TEXTO DETECTADO
    # ========================================================

    print()
    print("=== TEXTO DETECTADO ===")

    for texto, puntaje in zip(textos, puntajes):
        print(f"[{puntaje:.2f}] {texto}")

    # ========================================================
    # EXTRACCION ESTRUCTURADA
    # ========================================================

    datos = extraer_datos_comprobante(textos)
    mostrar_resultado(datos)

    # JSON final para que el Node.js lo capture
    print()
    print("DATOS EXTRAIDOS:")
    print(json.dumps(datos, ensure_ascii=False, default=str))

    print()
    print("=== FIN OCR ===")


# ============================================================
# MAIN ORIGINAL
# ============================================================

def main():

    if len(sys.argv) != 2:
        print("Uso: python app/main.py <ruta_imagen>")
        raise SystemExit(1)

    image_path = sys.argv[1]

    print("Iniciando PaddleOCR...")

    ocr = PaddleOCR(
        lang="es",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False
    )

    print(f"Procesando imagen: {image_path}")

    results = ocr.predict(image_path)

    textos = []
    puntajes = []

    for result in results:
        data = result.json["res"]
        textos.extend(data.get("rec_texts", []))
        puntajes.extend(data.get("rec_scores", []))

    print("OCR ejecutado correctamente.")

    # ========================================================
    # TEXTO DETECTADO
    # ========================================================

    print()
    print("=== TEXTO DETECTADO ===")

    for texto, puntaje in zip(textos, puntajes):
        print(f"[{puntaje:.2f}] {texto}")

    # ========================================================
    # EXTRACCION ESTRUCTURADA
    # ========================================================

    datos = extraer_datos_comprobante(textos)
    mostrar_resultado(datos)

    # JSON final para que el Node.js lo capture
    print()
    print("DATOS EXTRAIDOS:")
    print(json.dumps(datos, ensure_ascii=False, default=str))

    print()
    print("=== FIN OCR ===")


if __name__ == "__main__":
    main()