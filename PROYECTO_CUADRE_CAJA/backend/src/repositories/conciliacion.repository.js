import { query } from './base.repository.js';

export const createConciliacion = async ({
  id_usuario, fecha, diferencia_detectada, resultado, observacion = null
}) => {
  const result = await query(
    `INSERT INTO conciliacion (id_usuario, fecha, diferencia_detectada, resultado, observacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_conciliacion, id_usuario, fecha, diferencia_detectada, resultado, observacion, fecha_registro`,
    [id_usuario, fecha, diferencia_detectada, resultado, observacion]
  );
  return result.rows[0];
};

export const findConciliacionById = async (idConciliacion) => {
  const result = await query(
    `SELECT id_conciliacion, id_usuario, fecha, diferencia_detectada, resultado, observacion, fecha_registro
     FROM conciliacion WHERE id_conciliacion = $1`, [idConciliacion]
  );
  return result.rows[0] ?? null;
};

export const findConciliacionByFecha = async (fecha) => {
  const result = await query(
    `SELECT id_conciliacion FROM conciliacion WHERE fecha = $1`, [fecha]
  );
  return result.rows[0] ?? null;
};

export const findAllConciliaciones = async () => {
  const result = await query(
    `SELECT
       c.id_conciliacion, c.id_usuario, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
       c.diferencia_detectada AS diferencia, c.resultado, c.observacion, c.fecha_registro,
       u.nombres || ' ' || u.apellidos AS usuario
     FROM conciliacion c
     LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
     ORDER BY c.fecha DESC, c.id_conciliacion DESC`
  );
  return result.rows;
};

export const findCierresByFecha = async (fecha) => {
  const result = await query(
    `SELECT
       c.id_cierre,
       c.turno,
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN totales.total_ingresos ELSE c.total_ingresos END AS total_ingresos,
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN totales.total_no_efectivo ELSE c.total_no_efectivo END AS total_no_efectivo,
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN totales.total_ingresos - totales.total_no_efectivo
         ELSE c.efectivo_esperado END AS efectivo_esperado,
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN salidas.total_salidas ELSE c.total_salidas END AS total_salidas,
       c.efectivo_fisico,
       c.diferencia,
       c.estado
     FROM cierre_caja c
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(SUM(p.monto), 0) AS total_ingresos,
         COALESCE(
           SUM(CASE WHEN mp.es_efectivo = FALSE THEN p.monto ELSE 0 END),
           0
         ) AS total_no_efectivo
       FROM operacion o
       JOIN pago p ON p.id_operacion = o.id_operacion
       JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
       WHERE o.id_cierre = c.id_cierre
         AND UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         AND COALESCE(o.estado, '') <> 'ANULADA'
         AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
     ) totales ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(sc.monto), 0) AS total_salidas
       FROM salida_caja sc
       WHERE sc.id_cierre = c.id_cierre
         AND UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
     ) salidas ON TRUE
     WHERE c.fecha = $1
     ORDER BY CASE
       WHEN TRANSLATE(UPPER(c.turno), 'ÑÁÉÍÓÚÜ', 'NAEIOUU') = 'MANANA' THEN 0
       ELSE 1
     END`,
    [fecha]
  );
  return result.rows;
};

export const contarOperacionesSinEvidenciaEmpresaPorFecha = async (fecha) => {
  const result = await query(
    `SELECT COUNT(DISTINCT o.id_operacion)::int AS total
     FROM operacion o
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     WHERE o.fecha = $1
       AND COALESCE(o.estado, '') <> 'ANULADA'
       AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
       AND mp.es_efectivo = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM evidencia e
         WHERE e.id_operacion = o.id_operacion
           AND e.tipo_evidencia = 'EMPRESA'
       )`,
    [fecha]
  );
  return result.rows[0]?.total || 0;
};

// CONSULTA BLINDADA CON SUBCONSULTAS PARA EVITAR ERRORES DE JSON
export const findOperacionesConNumeros = async (fecha) => {
  const result = await query(
    `SELECT
       o.id_operacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.monto AS monto_comprobante,
       p.referencia_bancaria AS num_operacion_pago,
       (
         SELECT (e.datos_ocr::jsonb->>'referencia_bancaria')
         FROM evidencia e
         WHERE e.id_operacion = o.id_operacion AND e.tipo_evidencia = 'EMPRESA'
         LIMIT 1
       ) AS num_operacion_empresa,
       (
         SELECT (e.datos_ocr::jsonb->>'numero_operacion')
         FROM evidencia e
         WHERE e.id_operacion = o.id_operacion AND e.tipo_evidencia = 'EMPRESA'
         LIMIT 1
       ) AS num_op_empresa_alt,
       mp.nombre AS medio_pago
     FROM operacion o
     JOIN comprobante c ON c.id_comprobante = o.id_comprobante
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     WHERE o.fecha = $1
       AND o.estado != 'ANULADA'
       AND mp.es_efectivo = FALSE`,
    [fecha]
  );
  return result.rows;
};