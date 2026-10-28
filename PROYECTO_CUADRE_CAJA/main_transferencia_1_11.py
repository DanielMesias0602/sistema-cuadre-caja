import json
import re
import sys
from paddleocr import PaddleOCR

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
# DETECCION DE BANCO
# Prioridad:
#   1. Si es extracto bancario de la empresa (Detalle de movimiento
#      + Cuenta Corriente) -> BCP (formato BCP Peru)
#   2. Si NO es extracto -> usar logos/textos (YAPE, BBVA, BCP, etc)
# ============================================================
def es_extracto_bancario_empresa(lines):
    """
    Detecta si es un extracto bancario de la empresa (formato BCP Peru
    'Detalle de movimiento' + 'Cuenta Corriente').
    Los comprobantes del cliente (Yape, BBVA, BCP cliente) NUNCA dicen
    'Detalle de movimiento', por eso es seguro detectar con solo 2 condiciones.
    """
    full_text = ' '.join(lines).lower()
    tiene_detalle = 'detalle de movimiento' in full_text
    tiene_cuenta_corriente = 'cuenta corriente' in full_text
    return tiene_detalle and tiene_cuenta_corriente

def detect_bank(lines):
    # PRIMERO: si es extracto de la empresa, es del banco BCP
    if es_extracto_bancario_empresa(lines):
        return 'BCP'

    # SEGUNDO: si NO es extracto, usar logos/textos (Yape, BBVA, etc)
    full_text = ' '.join(lines).lower()

    if 'cuenta independencia bbva' in full_text: return 'BBVA'
    if 'bbva' in full_text: return 'BBVA'
    if 'yapeaste' in full_text: return 'YAPE'
    if 'bcp' in full_text: return 'BCP'
    if 'interbank' in full_text: return 'INTERBANK'
    if 'scotiabank' in full_text: return 'SCOTIABANK'
    if 'banbif' in full_text: return 'BANBIF'
    if 'plin' in full_text: return 'PLIN'

    if 'envío a contactos' in full_text or 'envio a contactos' in full_text: return 'BBVA'
    if 'cuentas de ahorro' in full_text and '**** 5010' in full_text: return 'BCP'
    if 'yape' in full_text: return 'YAPE'

    return None

def detect_bank_source(lines):
    """
    NUEVO: indica de donde salio el banco.
      - 'formato_extracto' : se infirio por el formato (Detalle de movimiento + Cuenta Corriente)
      - 'texto'            : se leyo directamente del texto (Yape, BBVA, BCP, etc)
      - None               : no se detecto
    """
    if es_extracto_bancario_empresa(lines):
        full_text = ' '.join(lines).lower()
        # Si el texto tambien dice BBVA/YAPE/INTERBANK, preferir el texto
        for bank in ['bbva', 'yape', 'interbank', 'scotiabank', 'banbif', 'plin']:
            if bank in full_text:
                return 'texto'
        return 'formato_extracto'

    if detect_bank(lines):
        return 'texto'
    return None

def detect_transfer_status(lines):
    full_text = ' '.join(lines).lower()
    if 'transferencia exitosa' in full_text or 'operación exitosa' in full_text or 'operacion exitosa' in full_text:
        return 'EXITOSA'
    if 'transferencia realizada' in full_text: return 'REALIZADA'
    if 'pago exitoso' in full_text or 'yapeaste' in full_text: return 'EXITOSA'
    return None

def extract_amount(lines):
    texto_completo = '\n'.join(lines)
    patrones = [
        r'Monto[\s\S]{0,30}?(?:S/\s*)?([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})',
        r'Importe[\s\S]{0,30}?(?:S/\s*)?([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})',
        r'Total[\s\S]{0,30}?(?:S/\s*)?([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})',
        r'S/\s*([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})',
        r's/\s*([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})',
        r'S/\s*([\d]{1,6})(?!\d)',
        r's/\s*([\d]{1,6})(?!\d)',
    ]
    for patron in patrones:
        match = re.search(patron, texto_completo, re.IGNORECASE)
        if match:
            amount = parse_money(match.group(1))
            if amount is not None:
                return amount, 'PEN'
    return None, None

# ============================================================
# FECHA DE OPERACION
# Acepta "Fecha de operación" o "Fecha y hora de operación"
# Acepta formatos: 19/10/2026 o 16/10/2026 - 06:45 PM (PE)
# ============================================================
def extract_operation_date(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'Fecha(?:\s+y\s+hora)?\s+de\s+operaci[oó]n\s*:?\s*[\r\n]*\s*(\d{2}/\d{2}/\d{4})',
        re.IGNORECASE
    )
    match = patron.search(texto_completo)
    if match:
        return match.group(1)
    return None

# ============================================================
# HORA DE OPERACION (NUEVA)
# Solo aplica si hay "Fecha y hora de operación: DD/MM/YYYY - HH:MM PM (PE)"
# ============================================================
def extract_operation_hour(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'Fecha\s+y\s+hora\s+de\s+operaci[oó]n\s*:?\s*[\r\n]*\s*\d{2}/\d{2}/\d{4}\s*[-–]?\s*(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)',
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
        'sep': '09', 'set': '09', 'oct': '10', 'nov': '11', 'dic': '12',
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'setiembre': '09', 'octubre': '10',
        'noviembre': '11', 'diciembre': '12'
    }
    texto_unido = ' '.join(lines)
    patron_ampm = re.compile(
        r'(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]{3,10})\.?\s+(?:de\s+)?(\d{4}).*?(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)',
        re.IGNORECASE
    )
    patron_24h = re.compile(
        r'(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]{3,10})\.?\s+(?:de\s+)?(\d{4})[,\s]*(\d{1,2}):(\d{2})\s*(?:h|hrs)',
        re.IGNORECASE
    )
    for patron in [patron_ampm, patron_24h]:
        match = patron.search(texto_unido)
        if match:
            month_name = match.group(2).lower()
            if month_name not in months: continue
            day = match.group(1).zfill(2)
            year = match.group(3)
            hour = int(match.group(4))
            minute = match.group(5)
            if patron == patron_ampm:
                period = match.group(6).lower()
                if period.startswith('p') and hour < 12: hour += 12
                if period.startswith('a') and hour == 12: hour = 0
            month = months[month_name]
            return (f'{day}/{month}/{year}', f'{hour:02d}:{minute}')
    return None, None

def extract_reference(lines):
    texto_completo = '\n'.join(lines)
    basura = ['seguro', 'mensaje', 'responder', 'compartir', 'descargar', 'salir', 'oncorespaldo', 'tarjetas']
    patrones_etiqueta_primero = [
        r'N[r]?o\.?\s*de\s*operaci[oó]n\s*:?\s*([A-Z0-9]{5,30})',
        r'N[uú]mero\s*de\s*operaci[oó]n\s*:?\s*([A-Z0-9]{5,30})',
        r'C[oó]digo\s*de\s*operaci[oó]n\s*:?\s*([A-Z0-9]{5,30})',
        r'Referencia\s*(?:bancaria)?\s*:?\s*([A-Z0-9]{5,30})',
    ]
    patrones_numero_primero = [
        r'([A-Z0-9]{5,30})\s*\n?\s*N[uú]mero\s*de\s*operaci[oó]n',
        r'([A-Z0-9]{5,30})\s*\n?\s*N[r]?o\.?\s*de\s*operaci[oó]n',
        r'([A-Z0-9]{5,30})\s*\n?\s*C[oó]digo\s*de\s*operaci[oó]n',
        r'([A-Z0-9]{5,30})\s*\n?\s*Referencia\s*(?:bancaria)?',
    ]
    for patron in patrones_etiqueta_primero + patrones_numero_primero:
        match = re.search(patron, texto_completo, re.IGNORECASE)
        if match:
            ref = match.group(1).strip()
            if ref.lower() not in basura and len(ref) >= 6:
                return ref
    for i, line in enumerate(lines):
        lower = line.lower()
        if 'operación' in lower or 'operacion' in lower or 'referencia' in lower:
            candidatos = []
            if i + 1 < len(lines): candidatos.append(lines[i + 1])
            if i > 0: candidatos.append(lines[i - 1])
            if i + 2 < len(lines): candidatos.append(lines[i + 2])
            if i > 1: candidatos.append(lines[i - 1])
            for p in candidatos:
                match = re.search(r'\b([A-Z0-9]{6,30})\b', p.upper())
                if match:
                    ref = match.group(1)
                    if ref.lower() not in basura and re.search(r'\d', ref):
                        return ref
    return None

# ============================================================
# DESTINATARIO
# Filtra "Envio a contactos" (sin tilde), "Contacto", "Destinatario"
# ============================================================
def extract_recipient(lines):
    ETIQUETAS_PARADA = [
        'cuenta de origen', 'cuenta independencia', 'tipo de operación', 'tipo de operacion',
        'número de operación', 'numero de operacion', 'comisión', 'comision',
        'entidad de destino', 'salir', 'importe enviado', 'importe',
        'monto', 'fecha', 'compartir', 'descargar', 'seguro',
        'oncorespaldo', 'tarjetas', 'cuenta corriente', 'cuentas de ahorro',
        'datos de la operación', 'datos de la operacion', 'datos del canal',
        'sucursal agencia', 'sucursal', 'tipo de canal', 'categoría del establecimiento',
        'categoria del establecimiento'
    ]

    def _normalizar(t):
        """Quita tildes, mojibake y caracteres raros para comparar de forma robusta"""
        t = t.lower()
        # Reemplazar mojibake comun (UTF-8 mal interpretado como Latin-1)
        t = t.replace('├¡', 'i').replace('├│', 'o').replace('├í', 'a')
        t = t.replace('├®', 'e').replace('├º', 'u').replace('├ñ', 'a')
        t = t.replace('├ë', 'e').replace('├ô', 'o')
        # Reemplazar tildes normales
        t = t.replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')
        t = t.replace('Á','a').replace('É','e').replace('Í','i').replace('Ó','o').replace('Ú','u')
        # Quitar caracteres no alfanumericos
        t = re.sub(r'[^a-z0-9 ]', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    def _es_etiqueta(t):
        t_norm = _normalizar(t)
        # Filtrar "envio a contactos" (cualquier variacion con/sin tildes o mojibake)
        if 'env' in t_norm and 'a contactos' in t_norm:
            return True
        # Filtrar etiquetas conocidas (comparando normalizadas)
        for et in ETIQUETAS_PARADA:
            if _normalizar(et) in t_norm:
                return True
        return False

    def _es_nombre_valido(t):
        if not re.search(r'[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}', t): return False
        if re.search(r'\d{2,}', t): return False
        if _es_etiqueta(t): return False
        return True

    for i, line in enumerate(lines):
        if 'enviado a' in line.lower():
            partes = []
            if i > 0:
                c = normalize_text(lines[i - 1])
                if c and _es_nombre_valido(c): partes.append(c)
            if i + 1 < len(lines):
                c = normalize_text(lines[i + 1])
                if c and _es_nombre_valido(c): partes.append(c)
            if partes: return ' '.join(partes)

    for i, line in enumerate(lines):
        if line.lower().startswith('contacto'):
            partes = []
            for j in range(i + 1, min(i + 10, len(lines))):
                c = normalize_text(lines[j])
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
            if len(partes) > 1 and partes[1].strip(): return partes[1].strip()
    return None

def extract_recipient_yape_fallback(lines):
    basura = ['compartir', 'descargar', 'código', 'codigo', 'datos', 'nro', 'destino',
              'más en yape', 'yapea', 'tus servicios', 'desde donde', 'estes',
              'código de seguridad', 'codigo de seguridad', 'datos de la transacción',
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
                if re.search(r'[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}', c):
                    partes.append(c)
            if partes: return ' '.join(partes)
    return None

def extract_destination_account(lines):
    # FIX: si es extracto bancario de la empresa, NO existe "cuenta destino" separada.
    # La unica cuenta visible es la de la empresa (cuenta_movimiento).
    if es_extracto_bancario_empresa(lines):
        return None

    for i, line in enumerate(lines):
        if '*' in line:
            numeros = re.findall(r'\d+', line)
            if not numeros and i + 1 < len(lines):
                s = normalize_text(lines[i + 1])
                if re.fullmatch(r'\d{3,10}', s):
                    return f"{normalize_text(line)} {s}"
            return normalize_text(line)
        if 'cuenta destino' in line.lower():
            if ':' in line:
                partes = line.split(':', 1)
                if len(partes) > 1 and partes[1].strip(): return partes[1].strip()
            if i + 1 < len(lines): return normalize_text(lines[i + 1])
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
        if 'cuenta de origen' in lower:
            match = re.search(r'\*+[\d\s-]+', line)
            if match: return match.group(0).strip()
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

# ============================================================
# DESCRIPCION
# Acepta "Descripción" o "Tipo de operación" (formatos B y C)
# Filtra referencias largas (ej: "72EC43CCCB74")
# ============================================================
def extract_description(lines):
    texto_completo = '\n'.join(lines)
    patron = re.compile(
        r'(?:Descripci[oó]n|Tipo\s+de\s+operaci[oó]n)\s*:?\s*[\r\n]*\s*([^\r\n]+)',
        re.IGNORECASE
    )
    match = patron.search(texto_completo)
    if match:
        valor = match.group(1).strip()
        if not valor or len(valor) < 3:
            return None
        if re.match(r'^(número|numero|fecha|sucursal|cuenta|datos)', valor, re.IGNORECASE):
            return None
        if re.fullmatch(r'[A-Z0-9]{6,30}', valor.upper()):
            return None
        # NUEVO: filtrar "envio a contactos" (con/sin tilde, con/sin mojibake)
        valor_norm = valor.lower()
        valor_norm = valor_norm.replace('├¡', 'i').replace('├│', 'o').replace('├í', 'a')
        valor_norm = valor_norm.replace('├®', 'e').replace('├º', 'u')
        valor_norm = valor_norm.replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')
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
        if 'entidad de destino' in line.lower():
            partes = re.split(r'entidad de destino\s*:?\s*', line, flags=re.IGNORECASE)
            if len(partes) > 1 and partes[1].strip(): return partes[1].strip()
    return None

# ============================================================
# NUEVO: EXTRACTOR ESPECÍFICO PARA CULQI
# ============================================================
def es_voucher_culqi(lines):
    full_text = ' '.join(lines).lower()
    return 'culqi' in full_text or 'venta id' in full_text

def extract_culqi_data(lines):
    texto_completo = '\n'.join(lines)
    data = {
        'tipo_evidencia': 'TRANSFERENCIA',
        'aplicacion_banco': 'CULQI',
        'estado_transferencia': 'EXITOSA',
        'monto': None,
        'moneda': 'PEN',
        'fecha_operacion': None,
        'hora_operacion': None,
        'referencia_bancaria': None,
        'destinatario': 'Distribuidora de Cerámica y Acabados',
        'requiere_revision': True,
        'requiere_confirmacion': True
    }

    # Monto: Total: S/ 72.50
    match_monto = re.search(r'Total\s*:?\s*S/\s*([\d.,]+)', texto_completo, re.IGNORECASE)
    if match_monto:
        data['monto'] = parse_money(match_monto.group(1))

    # Referencia: VENTA ID: 209138
    match_ref = re.search(r'VENTA\s*ID\s*:?\s*(\d+)', texto_completo, re.IGNORECASE)
    if match_ref:
        data['referencia_bancaria'] = match_ref.group(1)
        data['referencia_bancaria_normalizada'] = normalize_reference(match_ref.group(1))

    # Fecha y Hora: 27/10/26 07:54 PM
    match_fecha_hora = re.search(r'(\d{2}/\d{2}/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)', texto_completo)
    if match_fecha_hora:
        data['fecha_operacion'] = match_fecha_hora.group(1)
        data['hora_operacion'] = match_fecha_hora.group(2).upper()

    return data

# ============================================================
# PARSER PRINCIPAL
# ============================================================
def extract_transfer_data(lines):
    # NUEVO: Si detecta Culqi, usa su propio extractor
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

    recipient = extract_recipient(lines)
    if not recipient:
        recipient = extract_recipient_yape_fallback(lines)
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
        # FIX: solo copiar a cuenta_destino si NO es extracto bancario de la empresa
        # (en un extracto, la unica cuenta es la de la empresa y NO hay "destino")
        if not data['cuenta_destino'] and not es_extracto_bancario_empresa(lines):
            data['cuenta_destino'] = movement_account['numero']

    description = extract_description(lines)
    if description: data['descripcion'] = description

    branch = extract_branch(lines)
    if branch: data['sucursal_agencia'] = branch

    destination_entity = extract_destination_entity(lines)
    if destination_entity: data['entidad_destino'] = destination_entity

    return data

def run_ocr(image_path):
    print('Iniciando PaddleOCR...')
    print()
    ocr = PaddleOCR(lang='es', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)
    print(f'Procesando imagen: {image_path}')
    print()
    result = ocr.predict(image_path)
    texts, scores = [], []
    for res in result:
        data = res
        if hasattr(data, 'json'): data = data.json
        if isinstance(data, dict):
            payload = data.get('res', data)
            texts.extend(payload.get('rec_texts', []))
            scores.extend(payload.get('rec_scores', []))
    return texts, scores

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

def main():
    if len(sys.argv) < 2:
        print('Uso: python app/main_transferencia.py <ruta_imagen>')
        sys.exit(1)
    image_path = sys.argv[1]
    texts, scores = run_ocr(image_path)
    print('OCR ejecutado correctamente.')
    print()
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

if __name__ == '__main__':
    main()