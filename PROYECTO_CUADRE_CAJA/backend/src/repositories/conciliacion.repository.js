import { query } from './base.repository.js';

export const createConciliacion = async ({
  id_usuario, fecha, diferencia_detectada, resultado, observacion = null
}, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `INSERT INTO conciliacion (id_usuario, fecha, diferencia_detectada, resultado, observacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_conciliacion, id_usuario, fecha, diferencia_detectada, resultado, observacion, fecha_registro`,
    [id_usuario, fecha, diferencia_detectada, resultado, observacion]
  );
  return result.rows[0];
};

export const findConciliacionById = async (idConciliacion) => {
  const result = await query(
    `SELECT id_conciliacion, id_usuario, fecha, diferencia_detectada,
            CASE
              WHEN UPPER(resultado) = 'CONCILIADO' THEN 'CONCILIADO'
              ELSE 'EN REVISIÓN'
            END AS resultado,
            observacion, fecha_registro
     FROM conciliacion WHERE id_conciliacion = $1`, [idConciliacion]
  );
  return result.rows[0] ?? null;
};

export const findConciliacionByFecha = async (fecha, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `SELECT id_conciliacion
     FROM conciliacion
     WHERE fecha = $1
     ORDER BY fecha_registro DESC, id_conciliacion DESC
     LIMIT 1`,
    [fecha]
  );
  return result.rows[0] ?? null;
};

export const ponerConciliacionEnRevision = async (idConciliacion, observacion) => {
  const result = await query(
    `UPDATE conciliacion
     SET resultado = 'EN REVISIÓN',
         observacion = $2
     WHERE id_conciliacion = $1
       AND UPPER(resultado) = 'CONCILIADO'
     RETURNING id_conciliacion, id_usuario, fecha, diferencia_detectada,
               resultado, observacion, fecha_registro`,
    [idConciliacion, observacion]
  );
  return result.rows[0] ?? null;
};

export const actualizarConciliacion = async (
  idConciliacion,
  { diferencia_detectada, resultado, observacion },
  client
) => {
  const result = await client.query(
    `UPDATE conciliacion
     SET diferencia_detectada = $2,
         resultado = $3,
         observacion = $4
     WHERE id_conciliacion = $1
     RETURNING id_conciliacion, id_usuario, fecha, diferencia_detectada,
               resultado, observacion, fecha_registro`,
    [idConciliacion, diferencia_detectada, resultado, observacion]
  );
  return result.rows[0] ?? null;
};

export const findAllConciliaciones = async () => {
  const result = await query(
    `SELECT
       c.id_conciliacion, c.id_usuario, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
       c.diferencia_detectada AS diferencia,
       CASE
         WHEN UPPER(c.resultado) = 'CONCILIADO' THEN 'CONCILIADO'
         ELSE 'EN REVISIÓN'
       END AS resultado,
       c.observacion, c.fecha_registro,
       u.nombres || ' ' || u.apellidos AS usuario,
       COALESCE(resumen.total_ingresos, 0) AS total_ingresos,
       COALESCE(resumen.total_efectivo, 0) AS total_efectivo,
       COALESCE(resumen.total_no_efectivo, 0) AS total_no_efectivo
     FROM conciliacion c
     LEFT JOIN usuario u ON u.id_usuario = c.id_usuario
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(SUM(cierres.total_ingresos), 0) AS total_ingresos,
         COALESCE(SUM(cierres.total_efectivo), 0) AS total_efectivo,
         COALESCE(SUM(cierres.total_no_efectivo), 0) AS total_no_efectivo
       FROM (
         SELECT
           CASE
             WHEN UPPER(COALESCE(cc.estado, '')) = 'ABIERTO'
               THEN totales.total_ingresos
             ELSE cc.total_ingresos
           END AS total_ingresos,
           CASE
             WHEN UPPER(COALESCE(cc.estado, '')) = 'ABIERTO'
               THEN totales.total_ingresos - totales.total_no_efectivo
             ELSE cc.efectivo_esperado
           END AS total_efectivo,
           CASE
             WHEN UPPER(COALESCE(cc.estado, '')) = 'ABIERTO'
               THEN totales.total_no_efectivo
             ELSE cc.total_no_efectivo
           END AS total_no_efectivo
         FROM cierre_caja cc
         LEFT JOIN LATERAL (
           SELECT
             COALESCE(SUM(p.monto), 0) AS total_ingresos,
             COALESCE(
               SUM(CASE
                 WHEN mp.es_efectivo = FALSE
                   OR LOWER(TRIM(mp.nombre)) IN ('vale', 'deposito', 'depósito')
                 THEN p.monto ELSE 0
               END),
               0
             ) AS total_no_efectivo
           FROM operacion o
           JOIN pago p ON p.id_operacion = o.id_operacion
           JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
           WHERE o.id_cierre = cc.id_cierre
             AND UPPER(COALESCE(cc.estado, '')) = 'ABIERTO'
             AND COALESCE(o.estado, '') <> 'ANULADA'
             AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
         ) totales ON TRUE
         WHERE cc.fecha = c.fecha
       ) cierres
     ) resumen ON TRUE
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
           SUM(CASE
             WHEN mp.es_efectivo = FALSE
               OR LOWER(TRIM(mp.nombre)) IN ('vale', 'deposito', 'depósito')
             THEN p.monto ELSE 0
           END),
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
       AND (
         mp.es_efectivo = FALSE
         OR LOWER(TRIM(mp.nombre)) IN ('vale', 'deposito', 'depósito')
       )
       AND NOT EXISTS (
         SELECT 1 FROM evidencia e
         WHERE e.id_operacion = o.id_operacion
           AND e.tipo_evidencia = 'EMPRESA'
       )`,
    [fecha]
  );
  return result.rows[0]?.total || 0;
};

export const findTodasOperacionesPorFecha = async (fecha) => {
  const result = await query(
    `SELECT
       o.id_operacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       CONCAT_WS(' ', c.tipo_comprobante, CONCAT_WS('-', c.serie, c.numero)) AS comprobante,
       c.cliente,
       o.monto,
       o.estado,
       medios_pago.medio_pago
     FROM operacion o
     JOIN comprobante c ON c.id_comprobante = o.id_comprobante
     LEFT JOIN LATERAL (
         SELECT CASE
           WHEN BOOL_OR(
             NOT (
               COALESCE(mp.es_efectivo, FALSE)
               OR LOWER(TRIM(mp.nombre)) = 'efectivo'
             )
             AND (
               COALESCE(p.observacion, '') ILIKE '%[VALE]%'
               OR LOWER(TRIM(mp.nombre)) = 'vale'
             )
           ) THEN 'Vale'
           ELSE STRING_AGG(DISTINCT mp.nombre, ', ' ORDER BY mp.nombre)
         END AS medio_pago
         FROM pago p
         JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
         WHERE p.id_operacion = o.id_operacion
     ) medios_pago ON TRUE
     WHERE o.fecha = $1
     ORDER BY o.id_operacion`,
    [fecha]
  );
  return result.rows;
};

// CONSULTA BLINDADA CON SUBCONSULTAS PARA EVITAR ERRORES DE JSON
export const findOperacionesConNumeros = async (fecha) => {
  const result = await query(
    `SELECT
       o.id_operacion,
       p.id_pago,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.monto AS monto_comprobante,
       COALESCE(
         NULLIF(BTRIM(e_cliente.datos_ocr->>'referencia_bancaria'), ''),
         NULLIF(BTRIM(e_cliente.datos_ocr->>'numero_operacion'), ''),
         NULLIF(BTRIM(e_cliente.datos_ocr->>'nro_operacion'), ''),
         p.referencia_bancaria
       ) AS num_operacion_pago,
       COALESCE(
         NULLIF(BTRIM(e_empresa.datos_ocr->>'referencia_bancaria'), ''),
         NULLIF(BTRIM(e_empresa.datos_ocr->>'numero_operacion'), ''),
         NULLIF(BTRIM(e_empresa.datos_ocr->>'nro_operacion'), '')
       ) AS num_operacion_empresa,
       NULLIF(BTRIM(e_empresa.datos_ocr->>'numero_operacion'), '')
         AS num_op_empresa_alt,
       CASE
         WHEN COALESCE(mp.es_efectivo, FALSE)
           OR LOWER(TRIM(mp.nombre)) = 'efectivo' THEN mp.nombre
         WHEN COALESCE(p.observacion, '') ILIKE '%[VALE]%'
           OR LOWER(TRIM(mp.nombre)) = 'vale' THEN 'Vale'
         ELSE mp.nombre
       END AS medio_pago
     FROM operacion o
     JOIN comprobante c ON c.id_comprobante = o.id_comprobante
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     LEFT JOIN LATERAL (
       SELECT vp.id_evidencia_cliente, vp.id_evidencia_empresa
       FROM verificacion_pago vp
       WHERE vp.id_pago = p.id_pago
       ORDER BY vp.id_verificacion DESC
       LIMIT 1
     ) vp ON TRUE
     LEFT JOIN evidencia e_cliente
       ON e_cliente.id_evidencia = vp.id_evidencia_cliente
       AND e_cliente.id_operacion = o.id_operacion
       AND e_cliente.tipo_evidencia = 'CLIENTE'
     LEFT JOIN evidencia e_empresa
       ON e_empresa.id_evidencia = vp.id_evidencia_empresa
       AND e_empresa.id_operacion = o.id_operacion
       AND e_empresa.tipo_evidencia = 'EMPRESA'
     WHERE o.fecha = $1
       AND o.estado != 'ANULADA'
       AND (
         mp.es_efectivo = FALSE
         OR LOWER(TRIM(mp.nombre)) IN ('vale', 'deposito', 'depósito')
       )`,
    [fecha]
  );
  return result.rows;
};