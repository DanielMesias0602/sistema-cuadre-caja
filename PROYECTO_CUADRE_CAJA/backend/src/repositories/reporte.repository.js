import { query } from './base.repository.js';

const buildOperationFilters = (filters, startIndex = 1) => {
  const conditions = [];
  const params = [];
  let index = startIndex;

  if (filters.fecha_desde) {
    conditions.push(`o.fecha >= $${index++}`);
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    conditions.push(`o.fecha <= $${index++}`);
    params.push(filters.fecha_hasta);
  }

  if (filters.turno) {
    conditions.push(`cc.turno = $${index++}`);
    params.push(filters.turno);
  }

  if (filters.estado) {
    conditions.push(`o.estado = $${index++}`);
    params.push(filters.estado);
  }

  if (filters.id_medio_pago) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM pago pf
      WHERE pf.id_operacion = o.id_operacion
        AND pf.id_medio_pago = $${index++}
    )`);
    params.push(filters.id_medio_pago);
  }

  if (filters.comprobante) {
    conditions.push(`(
      c.serie ILIKE $${index}
      OR c.numero ILIKE $${index}
      OR CONCAT(c.serie, '-', c.numero) ILIKE $${index}
    )`);
    params.push(`%${filters.comprobante}%`);
    index++;
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join('\nAND ')}` : '',
    params
  };
};

const buildDateFilters = (filters, alias, startIndex = 1) => {
  const conditions = [];
  const params = [];
  let index = startIndex;

  if (filters.fecha_desde) {
    conditions.push(`${alias}.fecha >= $${index++}`);
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    conditions.push(`${alias}.fecha <= $${index++}`);
    params.push(filters.fecha_hasta);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join('\nAND ')}` : '',
    params
  };
};

export const findOperacionesReport = async (filters) => {
  const filter = buildOperationFilters(filters);

  const result = await query(
    `SELECT
       o.id_operacion,
       o.fecha::text AS fecha,
       o.id_cierre,
       cc.turno,
       o.id_usuario,
       CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
       c.id_comprobante,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.fecha::text AS fecha_comprobante,
       c.monto AS monto_comprobante,
       o.monto AS monto_operacion,
       o.estado AS estado_operacion,
       COALESCE(
         jsonb_agg(
           DISTINCT jsonb_build_object(
             'id_pago', p.id_pago,
             'id_medio_pago', mp.id_medio_pago,
             'medio_pago', mp.nombre,
             'es_efectivo', mp.es_efectivo,
             'monto', p.monto,
             'estado', p.estado,
             'referencia_bancaria', p.referencia_bancaria
           )
         ) FILTER (WHERE p.id_pago IS NOT NULL),
         '[]'::jsonb
       ) AS pagos,
       COUNT(DISTINCT e.id_evidencia)::INTEGER AS total_evidencias,
       COUNT(DISTINCT vp.id_verificacion)::INTEGER AS total_verificaciones,
       CASE WHEN a.id_anulacion IS NULL THEN FALSE ELSE TRUE END AS anulada,
       (SELECT COUNT(*) FROM nota_credito nc2 WHERE nc2.id_comprobante_original = o.id_comprobante)::INTEGER AS total_notas_credito,
       (SELECT COALESCE(SUM(nc2.monto), 0) FROM nota_credito nc2 WHERE nc2.id_comprobante_original = o.id_comprobante) AS total_notas_credito_monto
     FROM operacion o
     INNER JOIN comprobante c
       ON c.id_comprobante = o.id_comprobante
     INNER JOIN usuario u
       ON u.id_usuario = o.id_usuario
     LEFT JOIN cierre_caja cc
       ON cc.id_cierre = o.id_cierre
     LEFT JOIN pago p
       ON p.id_operacion = o.id_operacion
     LEFT JOIN medio_pago mp
       ON mp.id_medio_pago = p.id_medio_pago
     LEFT JOIN evidencia e
       ON e.id_operacion = o.id_operacion
     LEFT JOIN verificacion_pago vp
       ON vp.id_pago = p.id_pago
     LEFT JOIN anulacion a
       ON a.id_comprobante = o.id_comprobante
     ${filter.sql}
     GROUP BY
       o.id_operacion,
       o.fecha,
       o.id_cierre,
       cc.turno,
       o.id_usuario,
       u.nombres,
       u.apellidos,
       c.id_comprobante,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.fecha,
       c.monto,
       o.monto,
       o.estado,
       a.id_anulacion
     ORDER BY o.fecha DESC, o.id_operacion DESC`,
    filter.params
  );

  return result.rows;
};

export const findPagosPorMedioReport = async (filters) => {
  const filter = buildDateFilters(filters, 'o');

  const result = await query(
    `SELECT
       mp.id_medio_pago,
       mp.nombre AS medio_pago,
       mp.es_efectivo,
       COUNT(p.id_pago)::INTEGER AS cantidad_pagos,
       COUNT(DISTINCT p.id_operacion)::INTEGER AS cantidad_operaciones,
       COALESCE(SUM(p.monto), 0) AS total_monto
     FROM pago p
     INNER JOIN operacion o
       ON o.id_operacion = p.id_operacion
     INNER JOIN medio_pago mp
       ON mp.id_medio_pago = p.id_medio_pago
     ${filter.sql}
     GROUP BY mp.id_medio_pago, mp.nombre, mp.es_efectivo
     ORDER BY mp.nombre`,
    filter.params
  );

  return result.rows;
};

export const findCierresReport = async (filters) => {
  const filter = buildDateFilters(filters, 'cc');

  const result = await query(
    `SELECT
       cc.id_cierre,
       cc.fecha::text AS fecha,
       cc.turno,
       cc.id_usuario_responsable,
       CONCAT(u.nombres, ' ', u.apellidos) AS responsable,
       cc.total_ingresos,
       cc.total_no_efectivo,
       cc.efectivo_esperado,
       cc.total_salidas,
       cc.efectivo_despues_salidas,
       cc.efectivo_fisico,
       cc.diferencia,
       cc.estado,
       cc.fecha_fin
     FROM cierre_caja cc
     INNER JOIN usuario u
       ON u.id_usuario = cc.id_usuario_responsable
     ${filter.sql}
     ORDER BY cc.fecha DESC, cc.id_cierre DESC`,
    filter.params
  );

  return result.rows;
};

export const findDiferenciasReport = async (filters) => {
  const conditions = ['cc.diferencia <> 0'];
  const params = [];
  let index = 1;

  if (filters.fecha_desde) {
    conditions.push(`cc.fecha >= $${index++}`);
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    conditions.push(`cc.fecha <= $${index++}`);
    params.push(filters.fecha_hasta);
  }

  const whereSql = `WHERE ${conditions.join('\nAND ')}`;

  const result = await query(
    `SELECT
       cc.id_cierre,
       cc.fecha::text AS fecha,
       cc.turno,
       cc.efectivo_esperado,
       cc.total_salidas,
       cc.efectivo_despues_salidas,
       cc.efectivo_fisico,
       cc.diferencia,
       cc.estado,
       CONCAT(u.nombres, ' ', u.apellidos) AS responsable,
       COUNT(DISTINCT o.id_operacion)::INTEGER AS operaciones_del_cierre
     FROM cierre_caja cc
     INNER JOIN usuario u
       ON u.id_usuario = cc.id_usuario_responsable
     LEFT JOIN operacion o
       ON o.id_cierre = cc.id_cierre
     ${whereSql}
     GROUP BY
       cc.id_cierre,
       cc.fecha,
       cc.turno,
       cc.efectivo_esperado,
       cc.total_salidas,
       cc.efectivo_despues_salidas,
       cc.efectivo_fisico,
       cc.diferencia,
       cc.estado,
       u.nombres,
       u.apellidos
     ORDER BY cc.fecha DESC, cc.id_cierre DESC`,
    params
  );

  return result.rows;
};

export const findSalidasReport = async (filters) => {
  const filter = buildDateFilters(filters, 'sc');

  const result = await query(
    `SELECT
       sc.id_salida,
       sc.fecha::text AS fecha,
       sc.id_cierre,
       cc.turno,
       sc.id_tipo_salida,
       ts.nombre AS tipo_salida,
       sc.id_usuario,
       CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
       sc.id_comprobante,
       CASE
         WHEN sc.id_comprobante IS NULL THEN NULL
         ELSE CONCAT(c.tipo_comprobante, ' ', c.serie, '-', c.numero)
       END AS comprobante,
       sc.monto,
       sc.motivo,
       sc.observacion,
       sc.storage_key,
       sc.fecha_registro
     FROM salida_caja sc
     INNER JOIN cierre_caja cc
       ON cc.id_cierre = sc.id_cierre
     INNER JOIN tipo_salida ts
       ON ts.id_tipo_salida = sc.id_tipo_salida
     INNER JOIN usuario u
       ON u.id_usuario = sc.id_usuario
     LEFT JOIN comprobante c
       ON c.id_comprobante = sc.id_comprobante
     ${filter.sql}
     ORDER BY sc.fecha DESC, sc.id_salida DESC`,
    filter.params
  );

  return result.rows;
};

export const findEvidenciasVerificacionesReport = async (filters) => {
  const filter = buildOperationFilters(filters);

  const result = await query(
    `SELECT
       o.id_operacion,
       o.fecha::text AS fecha,
       cc.turno,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       p.id_pago,
       mp.nombre AS medio_pago,
       p.monto AS monto_pago,
       p.estado AS estado_pago,
       e.id_evidencia,
       e.tipo_evidencia,
       e.storage_key,
       e.fecha_evidencia::text AS fecha_evidencia,
       e.observacion AS observacion_evidencia,
       vp.id_verificacion,
       vp.estado_verificacion,
       vp.monto_comparado,
       vp.fecha_comparada::text AS fecha_comparada,
       vp.referencia_bancaria_comparada,
       vp.observacion AS observacion_verificacion
     FROM operacion o
     INNER JOIN comprobante c
       ON c.id_comprobante = o.id_comprobante
     LEFT JOIN cierre_caja cc
       ON cc.id_cierre = o.id_cierre
     LEFT JOIN pago p
       ON p.id_operacion = o.id_operacion
     LEFT JOIN medio_pago mp
       ON mp.id_medio_pago = p.id_medio_pago
     LEFT JOIN evidencia e
       ON e.id_operacion = o.id_operacion
     LEFT JOIN verificacion_pago vp
       ON vp.id_pago = p.id_pago
     ${filter.sql}
     ORDER BY o.fecha DESC, o.id_operacion DESC, p.id_pago, e.id_evidencia, vp.id_verificacion`,
    filter.params
  );

  return result.rows;
};

export const findConciliacionReport = async (filters) => {
  const dateFilter = buildDateFilters(filters, 'co');

  const conciliaciones = await query(
    `SELECT
       co.id_conciliacion,
       co.fecha::text AS fecha,
       co.id_usuario,
       CONCAT(u.nombres, ' ', u.apellidos) AS usuario,
       co.diferencia_detectada,
       co.resultado,
       co.observacion,
       co.fecha_registro
     FROM conciliacion co
     INNER JOIN usuario u
       ON u.id_usuario = co.id_usuario
     ${dateFilter.sql}
     ORDER BY co.fecha DESC, co.id_conciliacion DESC`,
    dateFilter.params
  );

  const detalles = await query(
    `SELECT
       dc.id_detalle,
       dc.id_conciliacion,
       dc.id_operacion,
       o.fecha::text AS fecha_operacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       o.monto,
       o.estado AS estado_operacion,
       cc.id_cierre,
       cc.turno,
       dc.resultado,
       dc.observacion
     FROM detalle_conciliacion dc
     INNER JOIN conciliacion co
       ON co.id_conciliacion = dc.id_conciliacion
     INNER JOIN operacion o
       ON o.id_operacion = dc.id_operacion
     INNER JOIN comprobante c
       ON c.id_comprobante = o.id_comprobante
     LEFT JOIN cierre_caja cc
       ON cc.id_cierre = o.id_cierre
     ${dateFilter.sql}
     ORDER BY dc.id_conciliacion DESC, dc.id_detalle`,
    dateFilter.params
  );

  // La conciliación es diaria y puede abarcar operaciones provenientes de
  // distintos cierres. Por eso NO se filtran los cierres por cc.fecha.
  // Se obtienen los cierres realmente involucrados mediante los detalles
  // de la conciliación.
  const cierres = await query(
    `SELECT DISTINCT
       cc.id_cierre,
       cc.fecha::text AS fecha,
       cc.turno,
       cc.id_usuario_responsable,
       CONCAT(u.nombres, ' ', u.apellidos) AS responsable,
       cc.total_ingresos,
       cc.total_no_efectivo,
       cc.efectivo_esperado,
       cc.total_salidas,
       cc.efectivo_despues_salidas,
       cc.efectivo_fisico,
       cc.diferencia,
       cc.estado,
       cc.fecha_fin
     FROM detalle_conciliacion dc
     INNER JOIN operacion o
       ON o.id_operacion = dc.id_operacion
     INNER JOIN cierre_caja cc
       ON cc.id_cierre = o.id_cierre
     INNER JOIN usuario u
       ON u.id_usuario = cc.id_usuario_responsable
     WHERE dc.id_conciliacion IN (
       SELECT co2.id_conciliacion
       FROM conciliacion co2
       ${dateFilter.sql.replaceAll('co.', 'co2.')}
     )
     ORDER BY fecha DESC, id_cierre DESC`,
    dateFilter.params
  );

  const operaciones = await findOperacionesReport(filters);
  const salidas = await findSalidasReport(filters);

  return {
    conciliaciones: conciliaciones.rows,
    detalles: detalles.rows,
    cierres: cierres.rows,
    operaciones,
    salidas
  };
};

export const findDashboardReport = async (filters) => {
  const dateFilter = buildDateFilters(filters, 'cc');
  const operationFilter = buildDateFilters(filters, 'o');

  const resumen = await query(
    `SELECT
       COUNT(*)::INTEGER AS cantidad_cierres,
       COALESCE(SUM(cc.total_ingresos), 0) AS total_ingresos,
       COALESCE(SUM(cc.total_no_efectivo), 0) AS total_no_efectivo,
       COALESCE(SUM(cc.efectivo_esperado), 0) AS efectivo_esperado,
       COALESCE(SUM(cc.total_salidas), 0) AS total_salidas,
       COALESCE(SUM(cc.efectivo_despues_salidas), 0) AS efectivo_despues_salidas,
       COALESCE(SUM(cc.efectivo_fisico), 0) AS efectivo_fisico,
       COALESCE(SUM(cc.diferencia), 0) AS diferencia_acumulada,
       COUNT(*) FILTER (WHERE cc.diferencia <> 0)::INTEGER AS cierres_con_diferencia
     FROM cierre_caja cc
     ${dateFilter.sql}`,
    dateFilter.params
  );

  const operaciones = await query(
    `SELECT
       COUNT(*)::INTEGER AS total_operaciones,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM pago p2 WHERE p2.id_operacion = o.id_operacion
       ))::INTEGER AS operaciones_con_pago,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM evidencia e2 WHERE e2.id_operacion = o.id_operacion
       ))::INTEGER AS operaciones_con_evidencia,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1
         FROM pago p3
         INNER JOIN verificacion_pago vp3 ON vp3.id_pago = p3.id_pago
         WHERE p3.id_operacion = o.id_operacion
       ))::INTEGER AS operaciones_con_verificacion,
       COUNT(*) FILTER (WHERE (
         SELECT COALESCE(SUM(p4.monto), 0)
         FROM pago p4
         WHERE p4.id_operacion = o.id_operacion
       ) = o.monto)::INTEGER AS operaciones_con_pagos_completos,
       COUNT(*) FILTER (WHERE o.fecha_modificacion IS NOT NULL)::INTEGER AS operaciones_modificadas
     FROM operacion o
     ${operationFilter.sql}`,
    operationFilter.params
  );

  const pagos = await query(
    `SELECT
       COUNT(p.id_pago)::INTEGER AS total_pagos,
       COUNT(p.id_pago) FILTER (WHERE p.fecha_modificacion IS NOT NULL)::INTEGER AS pagos_modificados,
       COUNT(vp.id_verificacion)::INTEGER AS total_verificaciones
     FROM pago p
     INNER JOIN operacion o
       ON o.id_operacion = p.id_operacion
     LEFT JOIN verificacion_pago vp
       ON vp.id_pago = p.id_pago
     ${operationFilter.sql}`,
    operationFilter.params
  );



  return {
    resumen: resumen.rows[0],
    operaciones: operaciones.rows[0],
    pagos: pagos.rows[0],
    indicadores_tiempo_cierre: {
      disponible: false,
      motivo: 'El modelo físico registra fecha y fecha_fin, pero no una hora de inicio del cierre.'
    }
  };
};
