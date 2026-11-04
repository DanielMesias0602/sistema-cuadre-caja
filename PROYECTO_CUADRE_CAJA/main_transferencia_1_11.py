import json
import re
import sys
import unicodedata
from datetime import date as datetime_date
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
        print('Iniciando PaddleOCR (MODO RÁPIDO)...', flush=True)
        _ocr_instance = PaddleOCR(
            lang='es', 
            use_doc_orientation_classify=False, 
            use_doc_unwarping=False, 
            use_textline_orientation=False,
            det_limit_side_len=960,
            cpu_threads=8,
            enable_mkldnn=True
        )
    return _ocr_instance

def normalize_text(text):
    if text is None: return None
    return re.sub(r'\s+', ' ', str(text).strip())

def parse_money(text):
    if not text: return None
    match = re.search(r'(?:S/\s*)?([\d.,]+)', text, re.IGNORECASE)
    if not match: return None
    value = match.group(1)
    if ',' in value and '.' in value:
        if value.rfind('.') > value.rfind(','): value = value.replace(',', '')
        else:
            value = value.replace('.', '')
            value = value.replace(',', '.')
    elif ',' in value:
        decimals = value.split(',')[-1]
        if len(decimals) == 2: value = value.replace(',', '.')
        else: value = value.replace(',', '')
    try: return float(value)
    except ValueError: return None

def normalize_reference(reference):
    if not reference: return None
    value = re.sub(r'\D', '', str(reference))
    if not value: return None
    return value.lstrip('0') or '0'

# ============================================================
# DETECCION DE BANCO (ACTUALIZADO CON NUEVOS FORMATOS)
# ============================================================
def es_extracto_bancario_empresa(lines):
    full_text = ' '.join(lines).lower()
    tiene_detalle = 'detalle de movimiento' in full_text
    tiene_cuenta_corriente = 'cuenta corriente' in full_text
    return tiene_detalle and tiene_cuenta_corriente

def detect_bank(lines):
    if es_extracto_bancario_empresa(lines):
        return 'BCP'

    full_text = ' '.join(lines).lower()

    # PRIORIDAD ALTA: Banco de la Nación (porque a veces dice "Yape" en entidad destino)
    if 'banco de la nación' in full_text or 'banco de la nacion' in full_text or 'nro. transferencia' in full_text: 
        return 'BANCO_NACION'
        
    if 'caja ica' in full_text or 'transferencia interbancaria inmediata' in full_text: return 'INTERBANK'
    if 'cuenta independencia bbva' in full_text: return 'BBVA'
    if 'bbva' in full_text: return 'BBVA'
    if 'yapeaste' in full_text: return 'YAPE'
    if 'bcp' in full_text: return 'BCP'
    if 'interbank' in full_text: return 'INTERBANK'
    if 'scotiabank' in full_text: return 'SCOTIABANK'
    if 'banbif' in full_text: return 'BANBIF'
    if 'plin' in full_text: return 'PLIN'

    if 'envÐ“Ó¯o a contactos' in full_text or 'envio a contactos' in full_text: return 'BBVA'
    if 'cuentas de ahorro' in full_text and '**** 5010' in full_text: return 'BCP'
    if 'yape' in full_text: return 'YAPE'

    return None

def detect_bank_source(lines):
    if es_extracto_bancario_empresa(lines):
        full_text = ' '.join(lines).lower()
        for bank in ['bbva', 'yape', 'interbank', 'scotiabank', 'banbif', 'plin', 'caja ica']:
            if bank in full_text:
                return 'texto'
        return 'formato_extracto'

    if detect_bank(lines):
        return 'texto'
    return None

def detect_transfer_status(lines):
    full_text = ' '.join(lines).lower()
    if 'transferencia exitosa' in full_text or 'operaciÐ“Ñ–n exitosa' in full_text or 'operacion exitosa' in full_text: return 'EXITOSA'
    if 'realizada con éxito' in full_text or 'realizada con exito' in full_text: return 'EXITOSA'
    if 'transferencia realizada' in full_text: return 'REALIZADA'
    if 'pago exitoso' in full_text or 'yapeaste' in full_text or '¡pago exitoso!' in full_text: return 'EXITOSA'
    if 'operación exitosa' in full_text: return 'EXITOSA'
    return None

def extract_amount(lines):
    corregir_ceros_ocr = lambda texto: re.sub(
        r'(?<=\d)[Oo](?=\d|[.,]\d|\b)',
        '0',
        str(texto)
    )
    normalizar_linea = lambda texto: ''.join(
        caracter
        for caracter in unicodedata.normalize('NFD', texto.lower())
        if unicodedata.category(caracter) != 'Mn'
    )
    lineas_limpias = [corregir_ceros_ocr(linea) for linea in lines]
    lineas_normalizadas = [normalizar_linea(linea) for linea in lineas_limpias]
    texto_completo = '\n'.join(lineas_limpias)
    palabras_promocionales = (
        'impulsa', 'proyecto', 'credito', 'hasta', 'iracreditos',
        'tusproyecto'
    )
    indices_promocionales = [
        indice
        for indice, linea in enumerate(lineas_normalizadas)
        if any(palabra in linea for palabra in palabras_promocionales)
    ]
    etiquetas_secundarias = re.compile(
        r'\b(?:cuotas?|monto\s+aprox(?:imado)?|comision|'
        r'mas\s+en\s+yape|impulsa|proyecto|credito|hasta|'
        r'iracreditos|tusproyecto)\b',
        re.IGNORECASE
    )
    etiquetas_transaccion = (
        'yapeaste', 'importe enviado', 'transferiste', 'enviaste',
        'deposito', 'depositaste', 'monto'
    )
    patron_numero = (
        r'(?P<monto>\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|'
        r'\d+[.,]\d{2}|\d+)'
    )
    patron_prefijo = re.compile(
        r'(?<![A-Z])(?:PEN|[$S]\s*/?)\s*'
        + patron_numero
        + r'(?![\d/.,])',
        re.IGNORECASE
    )
    patron_decimal = re.compile(
        r'(?<![\d/.,])'
        r'(?P<monto>\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|'
        r'\d+[.,]\d{2})'
        r'(?![\d/.,])'
    )
    patron_fecha = re.compile(
        r'(?<!\d)\d{1,2}\s*[/.-]\s*\d{1,2}'
        r'(?:\s*[/.-]\s*\d{2,4})?(?!\d)'
    )

    def es_monto_secundario(indice, inicio):
        texto_actual_previo = lineas_normalizadas[indice][:inicio]
        coincidencia_secundaria = etiquetas_secundarias.search(texto_actual_previo)
        if coincidencia_secundaria:
            etiqueta_transaccion_despues = re.search(
                r'\b(?:yapeaste|importe\s+enviado|transferiste|enviaste|'
                r'deposito|depositaste|total|monto(?!\s+aprox))\b',
                texto_actual_previo[coincidencia_secundaria.end():]
            )
            if not etiqueta_transaccion_despues:
                return True

        inicio_contexto = max(0, indice - 2)
        for indice_previo in range(indice - 1, inicio_contexto - 1, -1):
            texto_previo = lineas_normalizadas[indice_previo]
            if not texto_previo.strip():
                continue
            if etiquetas_secundarias.search(texto_previo):
                contexto_posterior = ' '.join(
                    lineas_normalizadas[indice_previo + 1:indice + 1]
                )
                if not re.search(
                    r'\b(?:yapeaste|importe\s+enviado|transferiste|enviaste|'
                    r'deposito|depositaste|total|monto(?!\s+aprox))\b',
                    contexto_posterior
                ):
                    return True
                break
            if re.search(r'\d', texto_previo):
                break
        return False

    # Capa 1: conservar la prioridad de los montos identificados por moneda.
    candidatos_con_prefijo = []
    for indice, linea in enumerate(lineas_limpias):
        for match in patron_prefijo.finditer(linea):
            if es_monto_secundario(indice, match.start()):
                continue
            monto = parse_money(match.group('monto'))
            if monto is not None:
                contexto = ' '.join(
                    lineas_normalizadas[max(0, indice - 2):indice + 1]
                )
                candidatos_con_prefijo.append({
                    'monto': monto,
                    'yapeaste': 'yapeaste' in contexto,
                    'deposito': (
                        'deposito' in contexto or 'depositaste' in contexto
                    ),
                })

    candidato_yapeaste = next(
        (candidato for candidato in candidatos_con_prefijo if candidato['yapeaste']),
        None
    )
    if candidato_yapeaste:
        return candidato_yapeaste['monto'], 'PEN'

    candidato_deposito = next(
        (candidato for candidato in candidatos_con_prefijo if candidato['deposito']),
        None
    )
    if candidato_deposito:
        return candidato_deposito['monto'], 'PEN'

    if candidatos_con_prefijo:
        return candidatos_con_prefijo[0]['monto'], 'PEN'

    # Capa 2: preservar la selección contextual y los respaldos por etiqueta.
    candidatos_contextuales = []
    for indice, linea in enumerate(lineas_limpias):
        linea_normalizada = lineas_normalizadas[indice]
        fechas = [match.span() for match in patron_fecha.finditer(linea_normalizada)]
        for match in patron_decimal.finditer(linea):
            if any(
                inicio_fecha <= match.start() < fin_fecha
                or inicio_fecha < match.end() <= fin_fecha
                for inicio_fecha, fin_fecha in fechas
            ):
                continue
            if es_monto_secundario(indice, match.start()):
                continue

            monto = parse_money(match.group('monto'))
            if monto is None:
                continue

            contexto = ' '.join(
                lineas_normalizadas[max(0, indice - 2):indice + 1]
            )
            tiene_etiqueta_transaccion = any(
                etiqueta in contexto for etiqueta in etiquetas_transaccion
            )
            if re.search(r'\bmonto\b\s+aprox', contexto):
                tiene_etiqueta_transaccion = False

            candidatos_contextuales.append({
                'monto': monto,
                'transaccional': tiene_etiqueta_transaccion,
                'yapeaste': 'yapeaste' in contexto,
                'deposito': (
                    'deposito' in contexto or 'depositaste' in contexto
                ),
            })

    candidato_yapeaste = next(
        (candidato for candidato in candidatos_contextuales if candidato['yapeaste']),
        None
    )
    if candidato_yapeaste:
        return candidato_yapeaste['monto'], 'PEN'

    candidato_deposito = next(
        (candidato for candidato in candidatos_contextuales if candidato['deposito']),
        None
    )
    if candidato_deposito:
        return candidato_deposito['monto'], 'PEN'

    candidato_transaccion = next(
        (
            candidato for candidato in candidatos_contextuales
            if candidato['transaccional']
        ),
        None
    )
    if candidato_transaccion:
        return candidato_transaccion['monto'], 'PEN'

    # Mantener los patrones históricos de Monto, Importe y Total.
    patrones_etiquetados = (
        r'Monto[\s\S]{0,30}?(?:S/\s*)?'
        r'([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2}|[\d]+\.\d{2})',
        r'Importe[\s\S]{0,30}?(?:S/\s*)?'
        r'([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2}|[\d]+\.\d{2})',
        r'Total[\s\S]{0,30}?(?:S/\s*)?'
        r'([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2}|[\d]+\.\d{2})',
    )
    for patron in patrones_etiquetados:
        for match in re.finditer(patron, texto_completo, re.IGNORECASE):
            inicio_contexto = max(0, match.start() - 40)
            contexto = normalizar_linea(texto_completo[inicio_contexto:match.start()])
            monto_contexto = normalizar_linea(
                texto_completo[match.start():match.end()]
            )
            if etiquetas_secundarias.search(contexto) or etiquetas_secundarias.search(monto_contexto):
                continue
            monto = parse_money(match.group(1))
            if monto is not None:
                return monto, 'PEN'

    # Capa 3: elegir el mayor decimal que no sea fecha ni monto secundario.
    candidatos_decimales = []
    for indice, linea in enumerate(lineas_limpias):
        linea_normalizada = lineas_normalizadas[indice]
        fechas = [match.span() for match in patron_fecha.finditer(linea_normalizada)]
        siguiente_linea_promocional = next(
            (
                posicion for posicion in indices_promocionales
                if posicion >= indice
            ),
            None
        )
        tiene_etiqueta_importe = bool(
            re.search(
                r'\b(?:monto(?!\s+aprox)|importe|total|yapeaste|'
                r'importe\s+enviado|transferiste|enviaste|deposito|'
                r'depositaste)\b',
                linea_normalizada
            )
        )
        linea_promocional = (
            any(palabra in linea_normalizada for palabra in palabras_promocionales)
            or (
                siguiente_linea_promocional is not None
                and siguiente_linea_promocional - indice <= 1
                and not tiene_etiqueta_importe
            )
        )
        if linea_promocional:
            continue

        for match in patron_decimal.finditer(linea):
            if any(
                inicio_fecha <= match.start() < fin_fecha
                or inicio_fecha < match.end() <= fin_fecha
                for inicio_fecha, fin_fecha in fechas
            ):
                continue
            if es_monto_secundario(indice, match.start()):
                continue
            monto = parse_money(match.group('monto'))
            if monto is not None:
                candidatos_decimales.append(monto)

    if candidatos_decimales:
        return max(candidatos_decimales), 'PEN'

    # Conservar el respaldo histórico de moneda; solo aceptar enteros con divisa.
    patrones_monedas_legacy = (
        r'PEN\s*([\d]{1,6})(?![\d/.,])',
        r'[$S]\s*/?\s*([\d]{1,6})(?![\d/.,])',
    )
    for patron in patrones_monedas_legacy:
        match = re.search(patron, texto_completo, re.IGNORECASE)
        if match and not etiquetas_secundarias.search(
            normalizar_linea(texto_completo[max(0, match.start() - 40):match.start()])
        ):
            monto = parse_money(match.group(1))
            if monto is not None:
                return monto, 'PEN'

    return None, None

# ============================================================
# FECHAS Y HORAS (SIN CAMBIOS)
# ============================================================
def extract_operation_date(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'Fecha(?:\s+y\s+hora)?\s+de\s+operaci[oÐ“Ñ–]n\s*:?\s*[\r\n]*\s*(\d{2}/\d{2}/\d{4})',
        re.IGNORECASE
    )
    match = patron.search(texto_completo)
    if match: return match.group(1)
    return None

def extract_operation_hour(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'Fecha\s+y\s+hora\s+de\s+operaci[oÐ“Ñ–]n\s*:?\s*[\r\n]*\s*\d{2}/\d{2}/\d{4}\s*[-Ð²Ò–â€œ]?\s*(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)',
        re.IGNORECASE
    )
    match = patron.search(texto_completo)
    if match:
        hour = int(match.group(1))
        minute = match.group(2)
        period = match.group(3).lower()
        if period.startswith('p') and hour < 12: hour += 12
        if period.startswith('a') and hour == 12: hour = 0
        return f'{hour:02d}:{minute}'
    return None

def extract_client_datetime(lines):
    months = {
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'sept': '09', 'set': '09', 'oct': '10', 'nov': '11', 'dic': '12',
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'setiembre': '09', 'octubre': '10',
        'noviembre': '11', 'diciembre': '12'
    }
    texto_unido = ' '.join(str(line) for line in lines)

    texto_normalizado = unicodedata.normalize('NFD', texto_unido)
    texto_normalizado = ''.join(
        caracter for caracter in texto_normalizado
        if unicodedata.category(caracter) != 'Mn'
    ).lower()
    texto_normalizado = texto_normalizado.replace('0ctubre', 'octubre')

    meses_regex = '|'.join(
        re.escape(mes)
        for mes in sorted(months, key=len, reverse=True)
    )
    patron_fecha_numerica = re.compile(
        r'(?<!\d)(\d{1,2})/(\d{1,2})/(\d{4})'
    )
    patron_fecha_textual = re.compile(
        rf'(?<!\d)(\d{{1,2}})\s*(?:de\s*)?({meses_regex})\.?\s*(?:de\s*)?(\d{{4}})'
    )
    patron_hora = re.compile(
        r'(\d{1,2}):(\d{2})(?::(\d{2}))?\s*'
        r'(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?',
        re.IGNORECASE
    )
    etiqueta_fecha_operacion = re.compile(
        r'fecha\s+(?:de\s+)?operaci[o0]n\s*:?',
        re.IGNORECASE
    )
    meses_completos_regex = '|'.join(
        re.escape(mes)
        for mes in sorted(
            ('enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'setiembre', 'octubre',
             'noviembre', 'diciembre'),
            key=len,
            reverse=True
        )
    )
    patron_fecha_fragmentada = re.compile(
        rf'^(\d{{1,2}})(?:de)?({meses_completos_regex})(?:de)?(\d{{4}})?'
    )

    def extraer_hora(segmento):
        match_hora = patron_hora.search(segmento)
        if not match_hora:
            return None

        hora = int(match_hora.group(1))
        minuto = int(match_hora.group(2))
        segundos = match_hora.group(3)
        sufijo = (match_hora.group(4) or '').replace('.', '').replace(' ', '')
        if minuto > 59 or (segundos is not None and int(segundos) > 59):
            return None
        if sufijo:
            if hora < 1 or hora > 12:
                return None
            hora = (hora % 12) + (12 if sufijo.startswith('p') else 0)
        elif hora > 23:
            return None
        formato_hora = f'{hora:02d}:{minuto:02d}'
        if segundos is not None:
            formato_hora += f':{int(segundos):02d}'
        return formato_hora

    for indice, linea in enumerate(lines):
        linea_normalizada = unicodedata.normalize('NFD', str(linea))
        linea_normalizada = ''.join(
            caracter for caracter in linea_normalizada
            if unicodedata.category(caracter) != 'Mn'
        ).lower()
        etiqueta = etiqueta_fecha_operacion.search(linea_normalizada)
        if not etiqueta:
            continue

        fragmentos = [linea_normalizada[etiqueta.end():]]
        for siguiente in lines[indice + 1:indice + 4]:
            fragmento = unicodedata.normalize('NFD', str(siguiente))
            fragmento = ''.join(
                caracter for caracter in fragmento
                if unicodedata.category(caracter) != 'Mn'
            ).lower()
            if not re.fullmatch(r'[\d\s./-]+|[a-z\s.]+', fragmento):
                break
            if not fragmento.strip():
                continue
            fragmentos.append(fragmento)

        fecha_compacta = re.sub(r'[^a-z0-9]', '', ''.join(fragmentos))
        match_fecha = patron_fecha_fragmentada.match(fecha_compacta)
        if not match_fecha:
            continue

        dia = int(match_fecha.group(1))
        mes = int(months[match_fecha.group(2)])
        anio = int(match_fecha.group(3) or datetime_date.today().year)
        try:
            fecha = datetime_date(anio, mes, dia)
        except ValueError:
            continue
        return fecha.strftime('%d/%m/%Y'), extraer_hora(' '.join(fragmentos))

    fechas = []
    for patron, es_textual in (
        (patron_fecha_numerica, False),
        (patron_fecha_textual, True),
    ):
        for match in patron.finditer(texto_normalizado):
            if es_textual:
                dia_texto, mes_texto, anio_texto = match.groups()
                mes_numero = int(months[mes_texto])
            else:
                dia_texto, mes_texto, anio_texto = match.groups()
                mes_numero = int(mes_texto)

            dia = int(dia_texto)
            anio = int(anio_texto)
            try:
                datetime_date(anio, mes_numero, dia)
            except ValueError:
                continue
            fechas.append((
                match.start(),
                match.end(),
                f'{dia:02d}/{mes_numero:02d}/{anio}'
            ))

    for inicio, fin, fecha in sorted(fechas):
        hora = extraer_hora(texto_normalizado[fin:fin + 60])
        if not hora:
            hora = extraer_hora(texto_normalizado[fin:])
        return fecha, hora

    return None, None

# ============================================================
# REFERENCIA (ACTUALIZADO PARA INTERBANK Y BN)
# ============================================================
def extract_reference(lines):
    texto_completo = '\n'.join(lines)
    basura = {
        'seguro', 'mensaje', 'responder', 'compartir', 'descargar', 'salir',
        'oncorespaldo', 'tarjetas', 'inmediata', 'transferencia', 'yape'
    }
    tiempo_relativo = re.compile(
        r'hace\s*(?:(?:\d+|un|una|unos|unas)\s*)?'
        r'(?:minutos?|mins?|horas?|hrs?|d[ií]as?|dias?|'
        r'momentos?|segundos?|segs?)\b',
        re.IGNORECASE
    )
    numero_operacion = re.compile(
        r'\b(?:n[uú]mero|nro\.?|n[°º])\s*(?:de\s*)?operaci[oó6]n\b|'
        r'\boperaci[oó6]n\b',
        re.IGNORECASE
    )
    numero_referencia = re.compile(r'(?<!\d)(\d(?:[\s.-]*\d){5,15})(?!\d)')
    etiqueta = re.compile(
        r'(?:n[uú]mero|numero|nro\.?|n[°º])\s*(?:de\s*)?'
        r'(?:operaci[oó6]n|movimiento|transferencia)|'
        r'c[oó]digo\s*(?:de\s*)?operaci[oó]n|'
        r'referencia(?:\s*bancaria)?',
        re.IGNORECASE
    )
    token = re.compile(r'(?<![A-Z0-9])([A-Z0-9-]{4,30})(?![A-Z0-9])', re.IGNORECASE)
    fecha_textual = re.compile(
        r'\d{1,2}\s*(?:de\s*)?(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|'
        r'abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|'
        r'sep(?:tiembre)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|'
        r'dic(?:iembre)?)\.?\s*\d{4}',
        re.IGNORECASE
    )
    fecha_numerica = re.compile(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}')

    def candidato_valido(value, longitud_minima=6):
        value = value.strip().strip('.,:;')
        compactado = re.sub(r'[^A-Z0-9]', '', value.upper())
        valor_normalizado = value.lower().replace('0ctubre', 'octubre')
        if tiempo_relativo.search(value):
            return None
        if len(compactado) < longitud_minima or len(compactado) > 30:
            return None
        if compactado.lower() in basura or not re.search(r'\d', compactado):
            return None
        if fecha_textual.search(valor_normalizado) or fecha_numerica.search(value):
            return None
        return value

    def normalizar_numero_operacion(value):
        digitos = re.sub(r'\D', '', value)
        while len(digitos) > 8 and digitos.startswith('0'):
            digitos = digitos[1:]
        return digitos

    lineas = [str(line) for line in lines]

    for indice, linea in enumerate(lineas):
        for match_operacion in numero_operacion.finditer(linea):
            fragmentos = []
            texto_despues_etiqueta = linea[match_operacion.end():]
            coincidencia_inline = re.match(
                r'^\s*[:.-]?\s*((?:\d[\s.-]*){6,16})',
                texto_despues_etiqueta
            )
            if coincidencia_inline:
                fragmentos.append(coincidencia_inline.group(1))

            for siguiente in lineas[indice + 1:indice + 5]:
                valor = siguiente.strip()
                if not re.fullmatch(r'[\d\s.-]+', valor) or not re.search(r'\d', valor):
                    break
                fragmentos.append(valor)

            digitos_fragmentados = ''.join(
                ''.join(re.findall(r'\d', fragmento))
                for fragmento in fragmentos
            )
            if 8 <= len(digitos_fragmentados) <= 16:
                return normalizar_numero_operacion(digitos_fragmentados)

            candidatos = [texto_despues_etiqueta]
            candidatos.extend(lineas[indice + 1:indice + 3])
            candidatos.append(linea[:match_operacion.start()])
            for valor in candidatos:
                match_numero = numero_referencia.search(valor)
                if match_numero:
                    return normalizar_numero_operacion(match_numero.group(1))

    for tipo_etiqueta in ('transferencia', 'movimiento', 'operacion', 'referencia', 'codigo'):
        for indice, linea in enumerate(lineas):
            match_etiqueta = etiqueta.search(linea)
            if not match_etiqueta:
                continue
            etiqueta_detectada = match_etiqueta.group(0).lower()
            if tipo_etiqueta == 'operacion' and 'operaci' not in etiqueta_detectada:
                continue
            if tipo_etiqueta == 'codigo' and 'código' not in etiqueta_detectada and 'codigo' not in etiqueta_detectada:
                continue
            if tipo_etiqueta == 'referencia' and 'referencia' not in etiqueta_detectada:
                continue
            if tipo_etiqueta in ('transferencia', 'movimiento') and tipo_etiqueta not in etiqueta_detectada:
                continue

            candidatos = [linea[match_etiqueta.end():]]
            candidatos.extend(lineas[indice + 1:indice + 3])
            candidatos.extend(reversed(lineas[max(0, indice - 2):indice]))
            longitud_minima = 4 if tipo_etiqueta == 'movimiento' else 6
            for valor in candidatos:
                match_token = token.search(valor)
                if match_token:
                    referencia = candidato_valido(match_token.group(1), longitud_minima)
                    if referencia:
                        return referencia

    for linea in lineas:
        linea_normalizada = linea.lower().replace('0ctubre', 'octubre')
        if fecha_textual.search(linea_normalizada) or fecha_numerica.search(linea):
            continue
        for match_token in token.finditer(linea):
            referencia = candidato_valido(match_token.group(1))
            if referencia:
                return referencia
    return None

# ============================================================
# DESTINATARIO (NUEVAS FUNCIONES PARA NUEVOS FORMATOS)
# ============================================================
def extract_recipient_interbank(lines):
    def compactar_etiqueta(value):
        normalizado = unicodedata.normalize('NFD', str(value))
        sin_acentos = ''.join(
            caracter for caracter in normalizado
            if unicodedata.category(caracter) != 'Mn'
        )
        return re.sub(r'[^a-z0-9]', '', sin_acentos.lower())

    etiquetas_parada = ('monedaymonto', 'comision', 'itf', 'cci')
    for indice, linea in enumerate(lines):
        match = re.search(r'beneficiario\s*(?:\(s\))?\s*:?\s*(.*)', str(linea), re.IGNORECASE)
        if not match:
            continue

        partes = []
        valor_inicial = normalize_text(match.group(1))
        if valor_inicial:
            partes.append(valor_inicial)

        for siguiente in lines[indice + 1:indice + 8]:
            valor = normalize_text(siguiente)
            compactado = compactar_etiqueta(valor)
            if any(compactado.startswith(etiqueta) for etiqueta in etiquetas_parada):
                break
            if valor:
                partes.append(valor)

        destinatario = limpiar_destinatario('\n'.join(partes))
        if destinatario:
            return destinatario
    return None

def extract_recipient_bcp(lines):
    etiquetas_inicio = re.compile(r'(?:enviado\s*a|destinatario)\s*:?', re.IGNORECASE)
    etiquetas_parada = (
        'cuenta', 'desde', 'moneda', 'nro. celular', 'entidad', 'cci',
        'comision', 'fecha', 'tipo de transferencia', 'numero de operacion',
        'nro. de operacion'
    )

    for indice, linea in enumerate(lines):
        match = etiquetas_inicio.search(str(linea))
        if not match:
            continue

        partes = []
        valor_inicial = str(linea)[match.end():].strip()
        if valor_inicial:
            partes.append(valor_inicial)

        for siguiente in lines[indice + 1:indice + 8]:
            valor = normalize_text(siguiente)
            compactado = re.sub(r'[^a-z0-9]', '', valor.lower())
            if any(etiqueta.replace(' ', '') in compactado for etiqueta in etiquetas_parada):
                break
            if re.fullmatch(r'[\s*#.-]*\d[\d\s*#.-]*', valor):
                break
            if re.search(r'\d{4,}', valor):
                break
            if re.search(r'[a-zA-Z]{2,}', valor):
                partes.append(valor)

        destinatario = limpiar_destinatario(' '.join(partes))
        if destinatario:
            return destinatario
    return None

def extract_recipient_plin(lines):
    texto_completo = '\n'.join(lines)
    match = re.search(r'Enviado a:\s*([\s\S]+?)(?=Comisi[oó]n|Fecha|C[oó]digo|$)', texto_completo, re.IGNORECASE)
    if match:
        return normalize_text(match.group(1))
    return None

def limpiar_destinatario(value):
    if not value:
        return None

    etiquetas_parada = re.compile(
        r'\b(?:tipo\s+de\s+operaci[oó0]n[Tt]?|transferencia|transferi\w*|terceros|'
        r'cuenta\s+de(?:\s+(?:origen|destino))?|comisi[oó]n|itf|motivo|'
        r'n[uú]mero\s+de\s+operaci[oó0]n|nro\.?\s*(?:de\s*)?operaci[oó0]n|'
        r'n[°º]\s*(?:de\s*)?operaci[oó0]n|fecha)\b',
        re.IGNORECASE
    )

    lineas_validas = []
    for linea in str(value).splitlines():
        linea = normalize_text(linea)
        if not linea:
            continue

        linea = re.sub(
            r'^\s*(?:enviado\s+a|destinatario|beneficiario(?:\(s\))?)\s*:?\s*',
            '',
            linea,
            flags=re.IGNORECASE
        ).strip()
        if not linea:
            continue

        etiqueta = etiquetas_parada.search(linea)
        if etiqueta:
            linea = linea[:etiqueta.start()].strip(' \t:;|-')
        if not linea:
            continue

        normalizada = unicodedata.normalize('NFD', linea)
        normalizada = ''.join(
            caracter for caracter in normalizada
            if unicodedata.category(caracter) != 'Mn'
        ).lower()
        if re.search(r'\b(moneda|soles|desde|cuenta)\b', normalizada):
            continue
        if re.fullmatch(
            r'(?:bcp|bbva|interbank|scotiabank|banbif|plin|yape|'
            r'banco de la nacion)',
            normalizada
        ):
            continue
        if not re.search(r'[a-z]', normalizada):
            continue
        if len(linea) > 80:
            linea = linea[:80].rsplit(' ', 1)[0].strip()
            if not linea:
                continue
        lineas_validas.append(linea)

    resultado = normalize_text(' '.join(lineas_validas))
    return resultado or None

def extract_recipient_banco_nacion(lines):
    for i, line in enumerate(lines):
        if 'beneficiario:' in line.lower():
            match = re.search(r'Beneficiario:\s*(.+)', line, re.IGNORECASE)
            partes = []
            if match: partes.append(match.group(1).strip())
            for j in range(i + 1, min(i + 4, len(lines))):
                if re.search(r'cuenta origen|comisión|monto|banco de la|nro', lines[j].lower()): break
                partes.append(lines[j].strip())
            return normalize_text(' '.join(partes))
    return None

def extract_recipient_generic(lines):
    """Fallback universal para cualquier formato nuevo que pueda aparecer."""
    texto_completo = '\n'.join(lines)
    etiquetas = [
        r'Beneficiario(?:\(s\))?\s*:?\s*([\s\S]+?)(?=Nro|Cuenta|Moneda|Comisi[oó]n|$)',
        r'Destinatario\s*:?\s*([\s\S]+?)(?=Nro|Cuenta|Entidad|Comisi[oó]n|$)',
        r'Enviado a\s*:?\s*([\s\S]+?)(?=Comisi[oó]n|Fecha|C[oó]digo|$)',
        r'Para\s*:?\s*([\s\S]+?)(?=Comisi[oó]n|Fecha|C[oó]digo|$)',
        r'A nombre de\s*:?\s*([\s\S]+?)(?=Nro|Cuenta|Comisi[oó]n|$)'
    ]
    for patron in etiquetas:
        match = re.search(patron, texto_completo, re.IGNORECASE)
        if match:
            val = normalize_text(match.group(1))
            if val and len(val) > 3:
                return val
    return None

def extract_recipient(lines):
    ETIQUETAS_PARADA = [
        'cuenta de origen', 'cuenta independencia', 'tipo de operaciÐ“Ñ–n', 'tipo de operacion',
        'nÐ“Ó™mero de operaciÐ“Ñ–n', 'numero de operacion', 'comisiÐ“Ñ–n', 'comision',
        'entidad de destino', 'salir', 'importe enviado', 'importe',
        'monto', 'fecha', 'compartir', 'descargar', 'seguro',
        'oncorespaldo', 'tarjetas', 'cuenta corriente', 'cuentas de ahorro',
        'datos de la operaciÐ“Ñ–n', 'datos de la operacion', 'datos del canal',
        'sucursal agencia', 'sucursal', 'tipo de canal', 'categorÐ“Ó¯a del establecimiento',
        'categoria del establecimiento'
    ]

    def _normalizar(t):
        t = t.lower()
        t = t.replace('Ð²â€Ò£Ð’ÐŽ', 'i').replace('Ð²â€Ò£Ð²â€Ó®', 'o').replace('Ð²â€Ò£Ð“Ó¯', 'a')
        t = t.replace('Ð²â€Ò£Ð’Â®', 'e').replace('Ð²â€Ò£Ð’Ó™', 'u').replace('Ð²â€Ò£Ð“Ò±', 'a')
        t = t.replace('Ð²â€Ò£Ð“Â«', 'e').replace('Ð²â€Ò£Ð“Ò™', 'o')
        t = t.replace('Ð“ÐŽ','a').replace('Ð“Â©','e').replace('Ð“Ó¯','i').replace('Ð“Ñ–','o').replace('Ð“Ó™','u')
        t = t.replace('Ð“Ò’','a').replace('Ð“Ò¯','e').replace('Ð“Òš','i').replace('Ð“â€œ','o').replace('Ð“Ò¡','u')
        t = re.sub(r'[^a-z0-9 ]', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    def _es_etiqueta(t):
        t_norm = _normalizar(t)
        if 'env' in t_norm and 'a contactos' in t_norm:
            return True
        for et in ETIQUETAS_PARADA:
            if _normalizar(et) in t_norm:
                return True
        return False

    def _es_nombre_valido(t):
        if not re.search(r'[A-Za-zÐ“Ò’Ð“Ò¯Ð“ÒšÐ“â€œÐ“Ò¡Ð“ÐŽÐ“Â©Ð“Ó¯Ð“Ñ–Ð“Ó™Ð“â€˜Ð“Ò±]{3,}', t): return False
        if re.search(r'\d{2,}', t): return False
        if _es_etiqueta(t): return False
        return True

    etiqueta_cuenta_destino = re.compile(
        r'\bcuenta\s+(?:de\s+)?destino\b\s*:?',
        re.IGNORECASE
    )
    etiquetas_fin_destinatario = re.compile(
        r'\b(?:motivo|tipo\s+de\s+operaci[oó0]n|transferencia|'
        r'n[uú]mero\s+de\s+operaci[oó0]n|nro\.?\s*(?:de\s*)?operaci[oó0]n|'
        r'fecha(?:\s+de\s+operaci[oó0]n)?|comisi[oó]n|itf|bbva)\b|'
        r'(?:^|\s)-',
        re.IGNORECASE
    )

    for indice, linea in enumerate(lines):
        etiqueta = etiqueta_cuenta_destino.search(str(linea))
        if not etiqueta:
            continue

        fragmentos = []
        linea_inicial = str(linea)[etiqueta.end():].strip()
        siguientes = ([linea_inicial] if linea_inicial else []) + [
            str(siguiente) for siguiente in lines[indice + 1:indice + 12]
        ]
        for fragmento in siguientes:
            fragmento = normalize_text(fragmento)
            if not fragmento:
                continue

            fin = etiquetas_fin_destinatario.search(fragmento)
            if fin:
                fragmento = fragmento[:fin.start()].strip(' \t:;,.|-')
                if fragmento:
                    fragmentos.append(fragmento)
                break
            if re.fullmatch(r'[-\s]*\d[\d\s.-]*', fragmento):
                break
            fragmentos.append(fragmento)

        tokens_nombre = []
        for fragmento in fragmentos:
            tokens = fragmento.split()
            for posicion, token_nombre in enumerate(tokens):
                if (
                    posicion == 0
                    and tokens_nombre
                    and token_nombre[:1].islower()
                ):
                    tokens_nombre[-1] += token_nombre
                else:
                    tokens_nombre.append(token_nombre)

        candidato = ' '.join(tokens_nombre)
        candidato = re.sub(
            r'(?<=[a-záéíóúñ])(?=[A-ZÁÉÍÓÚÑ])',
            ' ',
            candidato
        )
        candidato = re.sub(r'\bSAC\b', 'S.A.C.', candidato, flags=re.IGNORECASE)
        candidato = limpiar_destinatario(candidato)
        if candidato:
            return candidato

    for line in lines:
        candidato = limpiar_destinatario(line)
        if not candidato:
            continue
        normalizado = unicodedata.normalize('NFD', candidato)
        normalizado = ''.join(
            caracter for caracter in normalizado
            if unicodedata.category(caracter) != 'Mn'
        ).lower()
        if re.search(r'\b(distribuidora|ceramica|acabados)\b', normalizado):
            return candidato

    for i, line in enumerate(lines):
        if 'enviado a' in line.lower():
            partes = []
            if i > 0:
                c = limpiar_destinatario(lines[i - 1])
                if c and _es_nombre_valido(c): partes.append(c)
            if i + 1 < len(lines):
                c = limpiar_destinatario(lines[i + 1])
                if c and _es_nombre_valido(c): partes.append(c)
            if partes: return ' '.join(partes)

    for i, line in enumerate(lines):
        if line.lower().startswith('contacto'):
            partes = []
            for j in range(i + 1, min(i + 10, len(lines))):
                c = limpiar_destinatario(lines[j])
                if not c: continue
                if partes and _es_etiqueta(c): break
                if _es_etiqueta(c): continue
                if _es_nombre_valido(c):
                    partes.append(c)
                    if len(partes) >= 3: break
            if partes: return ' '.join(partes)

    for i, line in enumerate(lines):
        if 'destinatario' in line.lower() and ':' in line:
            partes = line.split(':', 1)
            if len(partes) > 1:
                candidato = limpiar_destinatario(partes[1])
                if candidato and _es_nombre_valido(candidato):
                    return candidato
    return None

def extract_recipient_yape_fallback(lines):
    basura = ['compartir', 'descargar', 'cÐ“Ñ–digo', 'codigo', 'datos', 'nro', 'destino',
              'mÐ“ÐŽs en yape', 'yapea', 'tus servicios', 'desde donde', 'estes',
              'cÐ“Ñ–digo de seguridad', 'codigo de seguridad', 'datos de la transacciÐ“Ñ–n',
              'datos de la transaccion']
    for i, line in enumerate(lines):
        if re.search(r'^S/\s*[\d.,]+$', line, re.IGNORECASE):
            partes = []
            for j in range(i + 1, min(i + 6, len(lines))):
                c = normalize_text(lines[j])
                if not c: continue
                if re.search(r'\d{1,2}\s+[a-z]{3,}\.?\s+\d{4}', c, re.IGNORECASE): break
                if re.search(r'\d{2}:\d{2}', c): break
                if any(b in c.lower() for b in basura): break
                if re.search(r'[A-Za-zÐ“Ò’Ð“Ò¯Ð“ÒšÐ“â€œÐ“Ò¡Ð“ÐŽÐ“Â©Ð“Ó¯Ð“Ñ–Ð“Ó™Ð“â€˜Ð“Ò±]{3,}', c):
                    partes.append(c)
            if partes: return ' '.join(partes)
    return None

def extract_destination_account(lines):
    if es_extracto_bancario_empresa(lines): return None

    for i, line in enumerate(lines):
        if not re.search(r'\bcci\s*destino\b', str(line), re.IGNORECASE):
            continue

        candidatos = [str(line)[re.search(r'\bcci\s*destino\b', str(line), re.IGNORECASE).end():]]
        candidatos.extend(str(siguiente) for siguiente in lines[i + 1:i + 3])
        for candidato in candidatos:
            numeros = re.sub(r'\D', '', candidato)
            match = re.search(r'\d{10,24}', numeros)
            if match:
                return match.group(0)

    for i, line in enumerate(lines):
        if re.search(r'\bcuenta\s+destino\b', str(line), re.IGNORECASE):
            match = re.search(r'\bcuenta\s+destino\b\s*:?\s*(.*)', str(line), re.IGNORECASE)
            candidatos = [match.group(1)] if match else []
            candidatos.extend(str(siguiente) for siguiente in lines[i + 1:i + 2])
            for candidato in candidatos:
                valor = normalize_text(candidato)
                if valor:
                    return valor

    for i, line in enumerate(lines):
        if '*' in line:
            numeros = re.findall(r'\d+', line)
            if not numeros and i + 1 < len(lines):
                s = normalize_text(lines[i + 1])
                if re.fullmatch(r'\d{3,10}', s):
                    return f"{normalize_text(line)} {s}"
            return normalize_text(line)
    return None

def extract_displayed_currency(lines):
    for i, line in enumerate(lines):
        if line.lower() == 'moneda' and i + 1 < len(lines):
            c = normalize_text(lines[i + 1])
            if c: return c
    return None

def extract_origin_account(lines):
    for i, line in enumerate(lines):
        lower = line.lower()
        if lower == 'desde':
            if i > 0:
                c = normalize_text(lines[i - 1])
                if '*' in c: return c
            if i + 1 < len(lines):
                c = normalize_text(lines[i + 1])
                if '*' in c: return c
        if 'cuenta de origen' in lower or 'cuenta origen' in lower:
            match = re.search(r'(?::\s*)([\d\-]+)', line)
            if match: return match.group(1).strip()
            if i + 1 < len(lines):
                c = normalize_text(lines[i + 1])
                if '*' in c: return c
    return None

def extract_origin_account_type(lines):
    for i, line in enumerate(lines):
        lower = line.lower()
        if lower in ('cuentas de ahorro', 'cuenta de ahorro', 'cuenta corriente'):
            return normalize_text(line)
    return None

def extract_message(lines):
    for i, line in enumerate(lines):
        if line.lower() == 'mensaje' and i + 1 < len(lines):
            c = normalize_text(lines[i + 1])
            if c and c.lower() != 'responder': return c
    return None

def extract_movement_account(lines):
    for i, line in enumerate(lines):
        if line.lower() == 'cuenta corriente' and i + 1 < len(lines):
            c = normalize_text(lines[i + 1])
            if '*' in c: return {'tipo': 'Cuenta Corriente', 'numero': c}
    return None

def extract_description(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'(?:Descripci[oÐ“Ñ–]n|Tipo\s+de\s+operaci[oÐ“Ñ–]n)\s*:?\s*[\r\n]*\s*([^\r\n]+)',
        re.IGNORECASE
    )
    match = patron.search(texto_completo)
    if match:
        valor = match.group(1).strip()
        if not valor or len(valor) < 3:
            return None
        if re.match(r'^(nÐ“Ó™mero|numero|fecha|sucursal|cuenta|datos)', valor, re.IGNORECASE):
            return None
        if re.fullmatch(r'[A-Z0-9]{6,30}', valor.upper()):
            return None
        valor_norm = valor.lower()
        valor_norm = valor_norm.replace('Ð²â€Ò£Ð’ÐŽ', 'i').replace('Ð²â€Ò£Ð²â€Ó®', 'o').replace('Ð²â€Ò£Ð“Ó¯', 'a')
        valor_norm = valor_norm.replace('Ð²â€Ò£Ð’Â®', 'e').replace('Ð²â€Ò£Ð’Ó™', 'u')
        valor_norm = valor_norm.replace('Ð“ÐŽ','a').replace('Ð“Â©','e').replace('Ð“Ó¯','i').replace('Ð“Ñ–','o').replace('Ð“Ó™','u')
        if 'env' in valor_norm and 'a contactos' in valor_norm:
            return None
        return valor
    return None

def extract_branch(lines):
    for i, line in enumerate(lines):
        if 'sucursal agencia' in line.lower() and i + 1 < len(lines):
            c = normalize_text(lines[i + 1])
            match = re.search(r'\b\d{1,10}\b', c)
            if match: return match.group(0)
    return None

def extract_destination_entity(lines):
    for i, line in enumerate(lines):
        if 'entidad de destino' in line.lower() or 'entidad destino' in line.lower():
            partes = re.split(r'entidad (?:de )?destino\s*:?\s*', line, flags=re.IGNORECASE)
            if len(partes) > 1 and partes[1].strip(): return partes[1].strip()
    return None

def es_voucher_culqi(lines):
    full_text = ' '.join(lines).lower()
    return 'culqi' in full_text or 'venta id' in full_text

def extract_culqi_datetime(lines):
    texto_completo = ' '.join(str(line) for line in lines)
    sufijo_hora = r'(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?'
    patrones_pegados = (
        re.compile(
            rf'(?<!\d)(\d{{1,2}})/(\d{{1,2}})/(\d{{4}})'
            rf'(\d{{1,2}}):(\d{{2}})(?::(\d{{2}}))?\s*{sufijo_hora}',
            re.IGNORECASE
        ),
        re.compile(
            rf'(?<!\d)(\d{{1,2}})/(\d{{1,2}})/(\d{{2}})'
            rf'(\d{{1,2}}):(\d{{2}})(?::(\d{{2}}))?\s*{sufijo_hora}',
            re.IGNORECASE
        ),
    )

    for patron in patrones_pegados:
        match = patron.search(texto_completo)
        if not match:
            continue

        dia, mes, anio, hora, minuto, segundos, sufijo = match.groups()
        anio = int(anio)
        if len(match.group(3)) == 2:
            anio += 2000
        try:
            fecha = datetime_date(anio, int(mes), int(dia))
        except ValueError:
            continue

        hora = int(hora)
        minuto = int(minuto)
        if hora > 23 or minuto > 59 or (segundos is not None and int(segundos) > 59):
            continue

        hora_formateada = f'{hora:02d}:{minuto:02d}'
        if segundos is not None:
            hora_formateada += f':{int(segundos):02d}'
        if sufijo:
            sufijo = sufijo.replace('.', '').replace(' ', '').upper()
            hora_formateada += f' {sufijo}'
        return fecha.strftime('%d/%m/%Y'), hora_formateada

    patron_separado = re.compile(
        rf'(?<!\d)(\d{{1,2}})/(\d{{1,2}})/(\d{{2,4}})\s+'
        rf'(\d{{1,2}}):(\d{{2}})(?::(\d{{2}}))?\s*{sufijo_hora}',
        re.IGNORECASE
    )
    match = patron_separado.search(texto_completo)
    if not match:
        return None, None

    dia, mes, anio, hora, minuto, segundos, sufijo = match.groups()
    anio = int(anio)
    if len(match.group(3)) == 2:
        anio += 2000
    try:
        fecha = datetime_date(anio, int(mes), int(dia))
    except ValueError:
        return None, None

    hora = int(hora)
    minuto = int(minuto)
    if hora > 23 or minuto > 59 or (segundos is not None and int(segundos) > 59):
        return None, None

    hora_formateada = f'{hora:02d}:{minuto:02d}'
    if segundos is not None:
        hora_formateada += f':{int(segundos):02d}'
    if sufijo:
        sufijo = sufijo.replace('.', '').replace(' ', '').upper()
        hora_formateada += f' {sufijo}'
    return fecha.strftime('%d/%m/%Y'), hora_formateada

def extract_culqi_data(lines):
    texto_completo = '\n'.join(lines)
    data = {
        'tipo_evidencia': 'TRANSFERENCIA',
        'aplicacion_banco': 'CULQI',
        'estado_transferencia': 'EXITOSA',
        'monto': None, 'moneda': 'PEN',
        'fecha_operacion': None, 'hora_operacion': None,
        'referencia_bancaria': None,
        'destinatario': 'Distribuidora de CerÐ“ÐŽmica y Acabados',
        'requiere_revision': True, 'requiere_confirmacion': True
    }

    patron_etiqueta_total = re.compile(
        r'^\s*Tota[l1i]\b(?:\s*:\s*|\s+|$)(.*)$',
        re.IGNORECASE
    )
    patron_monto_total = re.compile(
        r'^\s*(?:S\s*/\s*:?\s*)?'
        r'([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})(?!\d)',
        re.IGNORECASE
    )
    for indice, linea in enumerate(lines):
        etiqueta_total = patron_etiqueta_total.match(str(linea))
        if not etiqueta_total:
            continue

        texto_monto = etiqueta_total.group(1)
        match_monto = patron_monto_total.match(texto_monto)
        if not match_monto and not texto_monto.strip() and indice + 1 < len(lines):
            match_monto = patron_monto_total.match(str(lines[indice + 1]))
        if match_monto:
            data['monto'] = parse_money(match_monto.group(1))
            if data['monto'] is not None:
                break

    match_ref = re.search(r'VENTA\s*ID\s*:?\s*(\d+)', texto_completo, re.IGNORECASE)
    if match_ref:
        data['referencia_bancaria'] = match_ref.group(1)
        data['referencia_bancaria_normalizada'] = normalize_reference(match_ref.group(1))

    fecha, hora = extract_culqi_datetime(lines)
    if fecha: data['fecha_operacion'] = fecha
    if hora: data['hora_operacion'] = hora
    return data

def extract_transfer_data(lines):
    if es_voucher_culqi(lines):
        return extract_culqi_data(lines)

    data = {
        'tipo_evidencia': 'TRANSFERENCIA',
        'aplicacion_banco': detect_bank(lines),
        'banco_detectado_por': detect_bank_source(lines),
        'estado_transferencia': detect_transfer_status(lines),
        'monto': None, 'moneda': None,
        'fecha_operacion': None, 'hora_operacion': None,
        'destinatario': None, 'cuenta_destino': None,
        'tipo_cuenta_origen': None, 'cuenta_origen': None,
        'referencia_bancaria': None, 'descripcion': None,
        'sucursal_agencia': None, 'mensaje': None,
        'cuenta_movimiento': None,
        'entidad_destino': None,
        'requiere_revision': True, 'requiere_confirmacion': True
    }

    monto, moneda = extract_amount(lines)
    if monto is not None: data['monto'] = monto
    if moneda is not None: data['moneda'] = moneda

    fecha_cliente, hora_cliente = extract_client_datetime(lines)
    if fecha_cliente: data['fecha_operacion'] = fecha_cliente
    if hora_cliente: data['hora_operacion'] = hora_cliente

    fecha_movimiento = extract_operation_date(lines)
    if fecha_movimiento: data['fecha_operacion'] = fecha_movimiento

    hora_movimiento = extract_operation_hour(lines)
    if hora_movimiento and not data['hora_operacion']:
        data['hora_operacion'] = hora_movimiento

    reference = extract_reference(lines)
    if reference:
        data['referencia_bancaria'] = reference
        data['referencia_bancaria_normalizada'] = normalize_reference(reference)

    # === LÓGICA DE EXTRACCIÓN DE DESTINATARIO MULTI-BANCO ===
    banco = data['aplicacion_banco']
    recipient = None

    if banco == 'INTERBANK':
        recipient = limpiar_destinatario(extract_recipient_interbank(lines))
    elif banco == 'BCP':
        recipient = limpiar_destinatario(extract_recipient_bcp(lines))
    elif banco == 'PLIN':
        recipient = limpiar_destinatario(extract_recipient_plin(lines))
    elif banco == 'BANCO_NACION':
        recipient = limpiar_destinatario(extract_recipient_banco_nacion(lines))

    # Fallbacks si el banco no lo detectó o falló su extractor específico
    if not recipient: recipient = limpiar_destinatario(extract_recipient_bcp(lines))
    if not recipient: recipient = limpiar_destinatario(extract_recipient(lines))
    if not recipient: recipient = limpiar_destinatario(extract_recipient_generic(lines))
    if not recipient: recipient = limpiar_destinatario(extract_recipient_yape_fallback(lines))

    if recipient: data['destinatario'] = recipient

    destination_account = extract_destination_account(lines)
    if destination_account: data['cuenta_destino'] = destination_account

    displayed_currency = extract_displayed_currency(lines)
    if displayed_currency: data['moneda_mostrada'] = displayed_currency

    origin_account = extract_origin_account(lines)
    if origin_account: data['cuenta_origen'] = origin_account

    origin_account_type = extract_origin_account_type(lines)
    if origin_account_type: data['tipo_cuenta_origen'] = origin_account_type

    message = extract_message(lines)
    if message: data['mensaje'] = message

    movement_account = extract_movement_account(lines)
    if movement_account:
        data['cuenta_movimiento'] = movement_account
        if not data['cuenta_destino'] and not es_extracto_bancario_empresa(lines):
            data['cuenta_destino'] = movement_account['numero']

    description = extract_description(lines)
    if description: data['descripcion'] = description

    branch = extract_branch(lines)
    if branch: data['sucursal_agencia'] = branch

    destination_entity = extract_destination_entity(lines)
    if destination_entity: data['entidad_destino'] = destination_entity

    return data

def print_field(label, value):
    if value is None or (isinstance(value, str) and not value.strip()): return
    print(f'{label}: {value}')

def print_extracted_data(data):
    print('=== DATOS REALMENTE EXTRAÍDOS ===')
    print()
    print_field('Tipo de evidencia', data.get('tipo_evidencia'))
    print_field('Aplicación / banco', data.get('aplicacion_banco'))
    print_field('Banco detectado por', data.get('banco_detectado_por'))
    print_field('Estado de transferencia', data.get('estado_transferencia'))
    if data.get('monto') is not None: print_field('Monto', f"S/ {data['monto']:.2f}")
    print_field('Moneda', data.get('moneda'))
    print_field('Fecha de operación', data.get('fecha_operacion'))
    print_field('Hora de operación', data.get('hora_operacion'))
    print_field('Destinatario', data.get('destinatario'))
    print_field('Entidad destino', data.get('entidad_destino'))
    print_field('Cuenta destino', data.get('cuenta_destino'))
    print_field('Moneda mostrada', data.get('moneda_mostrada'))
    print_field('Tipo de cuenta origen', data.get('tipo_cuenta_origen'))
    print_field('Cuenta origen', data.get('cuenta_origen'))
    cuenta_movimiento = data.get('cuenta_movimiento')
    if cuenta_movimiento:
        print_field('Tipo de cuenta', cuenta_movimiento.get('tipo'))
        print_field('Cuenta', cuenta_movimiento.get('numero'))
    print_field('Número de operación', data.get('referencia_bancaria'))
    print_field('Referencia normalizada', data.get('referencia_bancaria_normalizada'))
    print_field('Descripción', data.get('descripcion'))
    print_field('Sucursal / agencia', data.get('sucursal_agencia'))
    print_field('Mensaje', data.get('mensaje'))
    print()
    print('=== CONTROL DEL OCR ===')
    print_field('Requiere revisión', data.get('requiere_revision'))
    print_field('Requiere confirmación', data.get('requiere_confirmacion'))

# ============================================================
# NUEVO: FUNCION EXPORTABLE PARA FLASK
# ============================================================
def procesar_archivo(image_path):
    ocr = get_ocr()
    print(f'Procesando imagen: {image_path}\n')
    result = ocr.predict(image_path)
    texts, scores = [], []
    for res in result:
        data = res
        if hasattr(data, 'json'): data = data.json
        if isinstance(data, dict):
            payload = data.get('res', data)
            texts.extend(payload.get('rec_texts', []))
            scores.extend(payload.get('rec_scores', []))
            
    print('OCR ejecutado correctamente.\n')
    print('=== TEXTO DETECTADO ===')
    for text, score in zip(texts, scores):
        clean_text = normalize_text(text)
        if not clean_text: continue
        print(f'[{score:.2f}] {clean_text}')
        
    lines = [normalize_text(text) for text in texts if normalize_text(text)]
    data = extract_transfer_data(lines)
    
    print()
    print_extracted_data(data)
    print()
    print('DATOS EXTRAIDOS:')
    print(json.dumps(data, ensure_ascii=False, default=str))
    print()
    print('=== FIN OCR TRANSFERENCIA ===')

def main():
    if len(sys.argv) < 2:
        print('Uso: python app/main_transferencia.py <ruta_imagen>')
        sys.exit(1)
    procesar_archivo(sys.argv[1])

if __name__ == '__main__':
    main()