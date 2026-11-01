// ============================================================
// PARSER V20 - parsearEvidencia devuelve JSON del Python sin renombrar
// ============================================================

const limpiarTexto = (texto) => String(texto || '').replace(/\[\d+\.\d+\]/g, '').replace(/\r/g, '');
const redondear = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const extraerJsonDelPython = (stdout) => {
  const marcador = 'DATOS EXTRAIDOS:';
  const idx = stdout.indexOf(marcador);
  if (idx === -1) return null;
  const despues = stdout.substring(idx + marcador.length).trim();
  const inicio = despues.indexOf('{');
  if (inicio === -1) return null;
  let profundidad = 0, fin = -1;
  for (let i = inicio; i < despues.length; i++) {
    if (despues[i] === '{') profundidad++;
    else if (despues[i] === '}') {
      profundidad--;
      if (profundidad === 0) { fin = i; break; }
    }
  }
  if (fin === -1) return null;
  try { return JSON.parse(despues.substring(inicio, fin + 1)); } catch (e) { return null; }
};

const quitarBloqueJson = (texto) => {
  const idx = texto.indexOf('DATOS EXTRAIDOS:');
  if (idx === -1) return texto;
  const antes = texto.substring(0, idx);
  const despues = texto.substring(idx);
  const inicio = despues.indexOf('{');
  if (inicio === -1) return antes;
  let profundidad = 0, fin = -1;
  for (let i = inicio; i < despues.length; i++) {
    if (despues[i] === '{') profundidad++;
    else if (despues[i] === '}') {
      profundidad--;
      if (profundidad === 0) { fin = i; break; }
    }
  }
  if (fin === -1) return antes;
  return antes + despues.substring(fin + 1);
};

const normalizarFechaEvidencia = (valor) => {
  if (!valor || /^(none|null|undefined)$/i.test(String(valor).trim())) return null;
  const texto = String(valor).trim().toLowerCase();
  const fechaNumerica = texto.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (fechaNumerica) {
    const [, dia, mes, anio] = fechaNumerica;
    if (Number(dia) < 1 || Number(dia) > 31 || Number(mes) < 1 || Number(mes) > 12) return null;
    const anioNormalizado = anio.length === 2 ? `20${anio}` : anio;
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anioNormalizado}`;
  }

  const fechaMesTexto = texto.match(
    /\b(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)\.?\s+(?:de\s+)?(\d{4})\b/i
  );
  if (!fechaMesTexto) return null;

  const mesTexto = fechaMesTexto[2]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 3);
  const meses = {
    ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
    jul: '07', ago: '08', sep: '09', set: '09', oct: '10', nov: '11', dic: '12',
  };
  const mes = meses[mesTexto];
  const dia = Number(fechaMesTexto[1]);
  if (!mes || dia < 1 || dia > 31) return null;
  return `${String(dia).padStart(2, '0')}/${mes}/${fechaMesTexto[3]}`;
};

const normalizarHoraEvidencia = (valor) => {
  if (!valor || /^(none|null|undefined)$/i.test(String(valor).trim())) return null;
  const texto = String(valor)
    .trim()
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ');
  const match = texto.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\s*m|p\s*m|am|pm)?\b/i);
  if (!match) return null;

  let horas = Number(match[1]);
  const minutos = Number(match[2]);
  const sufijo = match[4]?.replace(/\s/g, '').toLowerCase();
  if (horas > 23 || minutos > 59) return null;
  if (sufijo) {
    if (horas < 1 || horas > 12) return null;
    horas = (horas % 12) + (sufijo.startsWith('p') ? 12 : 0);
  }
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
};

const extraerFechaHoraEvidenciaTexto = (stdout) => {
  const textoOCR = limpiarTexto(quitarBloqueJson(String(stdout || '')));
  const lineas = textoOCR.split('\n');
  let fecha = null;
  let hora = null;

  for (const linea of lineas) {
    if (!fecha) fecha = normalizarFechaEvidencia(linea);
    if (!hora) hora = normalizarHoraEvidencia(linea);
    if (fecha && hora) break;
  }

  return { fecha, hora };
};

const extraerReferenciaEvidenciaTexto = (stdout) => {
  const textoOCR = limpiarTexto(quitarBloqueJson(String(stdout || '')));
  const match = textoOCR.match(
    /\b(?:nro\.?\s*(?:de\s*)?|n[uú]mero\s*(?:de\s*)?|c[oó]digo\s*(?:de\s*)?)operaci[oó]n\s*:?\s*([a-z0-9-]{6,})/i
  );
  return match?.[1] || null;
};

const extraerSeccion = (texto, nombre) => {
  const regex = new RegExp(`===\\s*${nombre}\\s*===([\\s\\S]*?)(?====|$)`, 'i');
  const match = texto.match(regex);
  return match ? match[1].trim() : '';
};

const extraerCampo = (texto, etiqueta) => {
  if (!texto) return null;
  const regex = new RegExp(`${etiqueta}\\s*:\\s*([^\\n]+)`, 'i');
  const match = texto.match(regex);
  if (!match) return null;
  const valor = match[1].trim();
  if (valor === 'None' || valor === 'null' || valor === '' || valor === 'undefined') return null;
  return valor;
};

const extraerMonto = (texto, etiqueta) => {
  if (!texto) return null;
  const regex = new RegExp(`${etiqueta}\\s*:\\s*S\\/\\s*([\\d.,]+)`, 'i');
  const match = texto.match(regex);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(num) ? null : redondear(num);
};

const reparsearSerieNumero = (texto) => {
  const textoLimpio = quitarBloqueJson(texto);
  const patrones = [
    /\b([A-Z]{2,4}\d{0,4})-(\d{6,})\b/,
    /\b([A-Z]{2,4}\d{0,4})\s*-\s*(\d{6,})\b/,
    /([A-Z]{2,4}\d{0,4})-(\d{6,})/,
    /N[°º]?\s*([A-Z]{2,4}\d{0,4})\s+(\d{6,})/i,
  ];
  for (const re of patrones) {
    const m = textoLimpio.match(re);
    if (m) return { serie: m[1], numero: m[2] };
  }
  const soloNumero = textoLimpio.match(/N[°º]?\s*(\d{6,})/i);
  if (soloNumero) return { serie: null, numero: soloNumero[1] };
  return null;
};

const reparsearMonto = (texto, op_gravada, igv) => {
  if (op_gravada !== null && igv !== null) return redondear(op_gravada + igv);
  const textoLimpio = quitarBloqueJson(texto)
    .replace(/\d{2}\/\d{2}\/\d{4}/g, ' ')
    .replace(/\d{2}:\d{2}(?::\d{2})?/g, ' ')
    .replace(/\b\d{8,}\b/g, ' ');
  const montos = [];
  const regexM = /\b(\d{1,3}(?:[,.]\d{3})*[,.]\d{2})\b/g;
  let m;
  while ((m = regexM.exec(textoLimpio)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n > 0) montos.push(n);
  }
  if (montos.length > 0) return redondear(Math.max(...montos));
  return null;
};

const reparsearCliente = (texto) => {
  const textoLimpio = quitarBloqueJson(texto);
  const lineas = textoLimpio.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const palabrasRuido = ['representacion', 'impresa', 'comprobante', 'electronico', 'documento', 'consulta', 'gracias', 'pedidos', 'aceptan', 'cambios', 'devoluciones', 'punto de venta', 'detalle de productos', 'forma de pago', 'total', 'subtotal', 'direccion', 'ruc', 'dni', 'otros', 'fecha', 'hora', 'vendedor', 'tipo', 'serie', 'numero', 'null', 'undefined', 'true', 'false', 'none'];
  for (let i = 0; i < lineas.length; i++) {
    const lineaUpper = lineas[i].toUpperCase();
    if (lineaUpper.includes('CLIENTE') || lineaUpper.includes('NOMBRE')) {
      const partes = lineas[i].split(':');
      if (partes.length >= 2) {
        const valor = partes.slice(1).join(':').trim();
        const valorLower = valor.toLowerCase();
        if (valor.length >= 4 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{4,}/.test(valor) && !palabrasRuido.some(p => valorLower === p) && !/^["'{}[\]]/.test(valor)) return valor;
      }
      for (let j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
        const linea = lineas[j].trim();
        const lineaUpperJ = linea.toUpperCase();
        const lineaLowerJ = linea.toLowerCase();
        if (lineaUpperJ.match(/^(DIRECCION|DNI|RUC|TOTAL|IGV|OP\.|EFECTIVO|VENDEDOR|TIPO|SERIE|NUMERO)/)) break;
        if (palabrasRuido.some(p => lineaLowerJ === p)) continue;
        if (linea.length < 4) continue;
        if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]{4,}/.test(linea)) continue;
        if (/\d{2,}/.test(linea)) continue;
        if (/^["'{}[\]]/.test(linea)) continue;
        return linea.replace(/[^a-zA-ZÁÉÍÓÚáéíóúÑñ\s.]/g, '').trim();
      }
    }
  }
  return null;
};

const reparsearFecha = (texto) => {
  const textoLimpio = quitarBloqueJson(texto);
  const match = textoLimpio.match(/(\d{2}\/\d{2}\/\d{4})/);
  return match ? match[1] : null;
};

const reparsearOpGravada = (texto) => {
  const textoLimpio = quitarBloqueJson(texto);
  const limpio = textoLimpio.replace(/\d{2}\/\d{2}\/\d{4}/g, ' ').replace(/\d{2}:\d{2}(?::\d{2})?/g, ' ').replace(/\b\d{8,}\b/g, ' ');
  const regex = /OP\.?\s*GRAVADA\s*S\/\s*:?\s*([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})/i;
  const match = limpio.match(regex);
  if (match) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return redondear(num);
  }
  const montos = [];
  const regexM = /\b(\d{1,3}(?:[,.]\d{3})*[,.]\d{2})\b/g;
  let m;
  while ((m = regexM.exec(limpio)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n > 0) montos.push(n);
  }
  for (const a of montos) {
    for (const b of montos) {
      for (const c of montos) {
        if (a === b || b === c || a === c) continue;
        if (Math.abs((a + b) - c) < 0.05 && c > Math.max(a, b)) {
          const pctA = (a / c) * 100;
          if (pctA >= 79 && pctA <= 85) return redondear(a);
          if (pctA >= 15 && pctA <= 21) return redondear(b);
        }
      }
    }
  }
  return null;
};

const parsearItemsDeSeccion = (seccion) => {
  if (!seccion) return [];
  const bloques = seccion.split(/Producto\s+\d+/i).filter(b => b.trim().length > 0);
  return bloques.map(bloque => ({
    descripcion: bloque.match(/Descripci[oó]n:\s*(.+)/i)?.[1]?.trim() || null,
    cantidad: parseFloat(bloque.match(/Cantidad:\s*([\d.,]+)/i)?.[1]?.replace(',', '.') || 0) || null,
    precio_unitario: parseFloat(bloque.match(/Precio\s+unitario:\s*S\/\s*([\d.,]+)/i)?.[1]?.replace(',', '.') || 0) || null,
    total: parseFloat(bloque.match(/Total:\s*S\/\s*([\d.,]+)/i)?.[1]?.replace(',', '.') || 0) || null
  })).filter(i => i.descripcion);
};

// ============================================================
// COMPROBANTE
// ============================================================
export const parsearComprobante = (stdout) => {
  const texto = limpiarTexto(stdout);
  const jsonPython = extraerJsonDelPython(stdout);
  
  const seccionDatos = extraerSeccion(texto, 'DATOS DEL COMPROBANTE');
  const seccionTotales = extraerSeccion(texto, 'TOTALES');
  const seccionProductos = extraerSeccion(texto, 'DETALLE DE PRODUCTOS');
  
  const cliente = reparsearCliente(texto);
  const op_gravada = reparsearOpGravada(texto);
  const fecha = reparsearFecha(texto);
  const items = parsearItemsDeSeccion(seccionProductos);
  
  let serie = extraerCampo(seccionDatos, 'Serie') || jsonPython?.serie || null;
  let numero = extraerCampo(seccionDatos, 'N[uú]mero') || jsonPython?.numero || null;
  if (!serie || !numero) {
    const encontrado = reparsearSerieNumero(texto);
    if (encontrado) {
      if (!serie) serie = encontrado.serie;
      if (!numero) numero = encontrado.numero;
    }
  }
  
  const igv = extraerMonto(seccionTotales, 'IGV') || (jsonPython?.igv ? redondear(jsonPython.igv) : null);
  
  let monto = extraerMonto(seccionTotales, 'Total');
  if (monto === null) monto = reparsearMonto(texto, op_gravada, igv);
  if (monto === null) monto = jsonPython?.monto ? redondear(jsonPython.monto) : null;
  
  return {
    tipo_comprobante: extraerCampo(seccionDatos, 'Tipo') || jsonPython?.tipo_comprobante || null,
    serie, numero,
    fecha: fecha || extraerCampo(seccionDatos, 'Fecha') || null,
    hora: extraerCampo(seccionDatos, 'Hora') || jsonPython?.hora || null,
    vendedor: extraerCampo(seccionDatos, 'Vendedor') || jsonPython?.vendedor || null,
    cliente: cliente || jsonPython?.cliente || null,
    monto, igv,
    efectivo: extraerMonto(seccionTotales, 'Efectivo') || (jsonPython?.efectivo ? redondear(jsonPython.efectivo) : null),
    moneda: extraerCampo(seccionTotales, 'Moneda') || jsonPython?.moneda || 'PEN',
    op_gravada: op_gravada || (jsonPython?.op_gravada ? redondear(jsonPython.op_gravada) : null),
    items: items.length > 0 ? items : (jsonPython?.items || []),
    valido: true
  };
};

// ============================================================
// EVIDENCIA — SIN RENOMBRAR CAMPOS
// Devuelve el JSON del Python TAL CUAL, con los nombres originales
// (aplicacion_banco, referencia_bancaria, fecha_operacion, hora_operacion, etc.)
// ============================================================
export const parsearEvidencia = (stdout) => {
  const jsonPython = extraerJsonDelPython(stdout);
  const fechaHoraTexto = extraerFechaHoraEvidenciaTexto(stdout);
  const referenciaTexto = extraerReferenciaEvidenciaTexto(stdout);

  if (jsonPython) {
    const referencia = jsonPython.referencia_bancaria || jsonPython.numero_operacion ||
      jsonPython.nro_operacion || referenciaTexto;
    return {
      ...jsonPython,
      referencia_bancaria: referencia,
      nro_operacion: jsonPython.nro_operacion || referencia,
      fecha_operacion:
        normalizarFechaEvidencia(jsonPython.fecha_operacion || jsonPython.fecha) ||
        fechaHoraTexto.fecha,
      hora_operacion:
        normalizarHoraEvidencia(jsonPython.hora_operacion || jsonPython.hora) ||
        fechaHoraTexto.hora,
      valido: true,
    };
  }

  const texto = limpiarTexto(stdout);
  let monto = null;
  const matchS = texto.match(/S\/\s*([\d.,]+)/);
  if (matchS) monto = redondear(parseFloat(matchS[1].replace(/,/g, '')));
  
  return {
    monto,
    aplicacion_banco: null,
    referencia_bancaria: referenciaTexto,
    nro_operacion: referenciaTexto,
    fecha_operacion: fechaHoraTexto.fecha,
    hora_operacion: fechaHoraTexto.hora,
    destinatario: null,
    valido: false
  };
};