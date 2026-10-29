export const normalizarTurnoCaja = (turno) => {
  const normalizado = String(turno || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (normalizado === 'MANANA' || normalizado === 'TARDE') return normalizado;
  return null;
};

export const obtenerEtiquetaTurno = (turno) => {
  const normalizado = normalizarTurnoCaja(turno);
  if (normalizado === 'MANANA') return 'Mañana';
  if (normalizado === 'TARDE') return 'Tarde';
  return null;
};

export const obtenerRangoTurno = (turno) => {
  const normalizado = normalizarTurnoCaja(turno);
  if (normalizado === 'MANANA') {
    return { inicio: '08:00:00', operadorInicio: '>=', fin: '14:00:00', operadorFin: '<' };
  }
  if (normalizado === 'TARDE') {
    // FLEXIBILIDAD DE NEGOCIO: Turno Tarde extendido
    return { inicio: '14:00:00', operadorInicio: '>=', fin: '23:59:59', operadorFin: '<=' };
  }
  return null;
};

export const construirAsociacionOperacionesSql = (turno) => {
  const rangoTurno = obtenerRangoTurno(turno);
  if (!rangoTurno) return null;

  return {
    sql: `UPDATE operacion o
       SET id_cierre = $1,
           fecha_modificacion = CURRENT_TIMESTAMP
       FROM comprobante c
       WHERE c.id_comprobante = o.id_comprobante
         AND o.fecha = $2::date
         AND o.id_cierre IS NULL
         AND o.estado != 'ANULADA'
         AND EXISTS (
           SELECT 1 FROM pago p
           WHERE p.id_operacion = o.id_operacion
             AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
         )
         AND COALESCE(c.hora, (o.fecha_registro AT TIME ZONE 'America/Lima')::time) ${rangoTurno.operadorInicio} $3::time
         AND COALESCE(c.hora, (o.fecha_registro AT TIME ZONE 'America/Lima')::time) ${rangoTurno.operadorFin} $4::time`,
    rangoTurno,
  };
};

export const normalizarHoraCaja = (hora) => {
  if (hora == null || String(hora).trim() === '') return null;
  const match = String(hora).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let horas = Number(match[1]);
  const minutos = Number(match[2]);
  const segundos = Number(match[3] || 0);
  const meridiano = match[4]?.toUpperCase();

  if (minutos > 59 || segundos > 59) return null;
  if (meridiano) {
    if (horas < 1 || horas > 12) return null;
    horas = (horas % 12) + (meridiano === 'PM' ? 12 : 0);
  } else if (horas > 23) {
    return null;
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
};

export const obtenerTurnoPorHora = (hora) => {
  const normalizada = normalizarHoraCaja(hora);
  if (!normalizada || normalizada < '08:00:00') return null;
  return normalizada < '14:00:00' ? 'MANANA' : 'TARDE';
};

export const validarHorarioRegistroOperacion = ({
  horaComprobante,
  horaActual,
}) => {
  const horaNormalizada = horaComprobante ? normalizarHoraCaja(horaComprobante) : normalizarHoraCaja(horaActual);
  if (!horaNormalizada) {
    return { statusCode: 400, message: 'La hora del comprobante no es válida' };
  }

  return { turno: obtenerTurnoPorHora(horaNormalizada), hora: horaNormalizada };
};
