import { query } from './base.repository.js';
import { obtenerRangoTurno, normalizarTurnoCaja } from '../utils/turnoCaja.js';

const TOTALES_DINAMICOS_CIERRE_SQL = `
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
`;

export const createCierreCaja = async ({
  id_usuario_responsable,
  fecha,
  turno,
  total_ingresos,
  total_no_efectivo,
  efectivo_esperado,
  total_salidas,
  efectivo_despues_salidas,
  efectivo_fisico,
  diferencia,
  estado,
  fecha_fin
}, client = null) => {
  const executor = client ?? { query };

  const result = await executor.query(
    `INSERT INTO cierre_caja
      (id_usuario_responsable, fecha, turno, total_ingresos, total_no_efectivo, efectivo_esperado, total_salidas, efectivo_despues_salidas, efectivo_fisico, diferencia, estado, fecha_fin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id_cierre, id_usuario_responsable, fecha, turno, total_ingresos, total_no_efectivo, efectivo_esperado, total_salidas, efectivo_despues_salidas, efectivo_fisico, diferencia, estado, fecha_fin`,
    [id_usuario_responsable, fecha, turno, total_ingresos, total_no_efectivo, efectivo_esperado, total_salidas, efectivo_despues_salidas, efectivo_fisico, diferencia, estado, fecha_fin]
  );

  return result.rows[0];
};


export const findParticipantesCierre = async (idCierre) => {
  const result = await query(
    `WITH operaciones_usuario AS (
       SELECT
         o.id_usuario,
         u.nombres || ' ' || u.apellidos AS nombre_completo,
         MIN(o.fecha_registro) AS primera_operacion,
         MAX(o.fecha_registro) AS ultima_operacion,
         COUNT(o.id_operacion)::int AS total_operaciones,
         COALESCE(
           SUM(
             CASE
               WHEN COALESCE(o.estado, '') <> 'ANULADA'
               THEN o.monto
               ELSE 0
             END
           ),
           0
         ) AS total_ventas
       FROM operacion o
       JOIN usuario u ON u.id_usuario = o.id_usuario
       WHERE o.id_cierre = $1
       GROUP BY
         o.id_usuario,
         u.nombres,
         u.apellidos
     ),
     efectivo_usuario AS (
       SELECT
         o.id_usuario,
         COALESCE(SUM(p.monto), 0) AS efectivo_vendido
       FROM operacion o
       JOIN pago p ON p.id_operacion = o.id_operacion
       JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
       WHERE o.id_cierre = $1
         AND COALESCE(o.estado, '') <> 'ANULADA'
         AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
         AND mp.es_efectivo = TRUE
       GROUP BY o.id_usuario
     )
     SELECT
       ou.id_usuario,
       ou.nombre_completo,
       ou.primera_operacion,
       ou.ultima_operacion,
       ou.total_operaciones,
       ou.total_ventas,
       COALESCE(eu.efectivo_vendido, 0) AS efectivo_vendido
     FROM operaciones_usuario ou
     LEFT JOIN efectivo_usuario eu
       ON eu.id_usuario = ou.id_usuario
     ORDER BY ou.primera_operacion ASC`,
    [idCierre]
  );

  return result.rows;
};


export const findCierreCajaById = async (idCierre) => {
  const result = await query(
    `SELECT
       c.id_cierre, c.id_usuario_responsable, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
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
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN totales.total_ingresos - totales.total_no_efectivo - salidas.total_salidas
         ELSE c.efectivo_despues_salidas END AS efectivo_despues_salidas,
       c.efectivo_fisico, c.diferencia,
       c.estado, c.fecha_fin,
       u.nombres || ' ' || u.apellidos AS responsable
     FROM cierre_caja c
     INNER JOIN usuario u ON u.id_usuario = c.id_usuario_responsable
     ${TOTALES_DINAMICOS_CIERRE_SQL}
     WHERE c.id_cierre = $1`,
    [idCierre]
  );

  const cierre = result.rows[0];
  if (!cierre) return null;

  const participantes = await findParticipantesCierre(idCierre);
  return { ...cierre, participantes };
};

export const findCierresCaja = async () => {
  const result = await query(
    `SELECT
       c.id_cierre, c.id_usuario_responsable, TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
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
       CASE WHEN UPPER(COALESCE(c.estado, '')) = 'ABIERTO'
         THEN totales.total_ingresos - totales.total_no_efectivo - salidas.total_salidas
         ELSE c.efectivo_despues_salidas END AS efectivo_despues_salidas,
       c.efectivo_fisico, c.diferencia,
       c.estado, c.fecha_fin,
       u.nombres || ' ' || u.apellidos AS responsable
     FROM cierre_caja c
     INNER JOIN usuario u ON u.id_usuario = c.id_usuario_responsable
     ${TOTALES_DINAMICOS_CIERRE_SQL}
     ORDER BY c.fecha DESC, c.id_cierre DESC`
  );
  return result.rows;
};

export const getTotalesParaCierre = async (fecha, turno, client = null, id_cierre = null) => {
  const turnoNormalizado = normalizarTurnoCaja(turno);
  const rangoTurno = obtenerRangoTurno(turno);
  if (!turnoNormalizado || !rangoTurno) {
    throw new Error('El turno debe ser Mañana o Tarde');
  }

  const executor = client ?? { query };
  const result = await executor.query(
    `SELECT
       COALESCE(SUM(p.monto), 0) as total_ingresos,
       COALESCE(SUM(CASE WHEN mp.es_efectivo = FALSE THEN p.monto ELSE 0 END), 0) as total_no_efectivo
     FROM operacion o
     JOIN comprobante c ON c.id_comprobante = o.id_comprobante
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     WHERE o.fecha = $1
       AND (o.id_cierre IS NULL OR o.id_cierre = $4)
       AND o.estado != 'ANULADA'
       AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
       AND COALESCE(c.hora, (o.fecha_registro AT TIME ZONE 'America/Lima')::time) ${rangoTurno.operadorInicio} $2::time
       AND COALESCE(c.hora, (o.fecha_registro AT TIME ZONE 'America/Lima')::time) ${rangoTurno.operadorFin} $3::time`,
    [fecha, rangoTurno.inicio, rangoTurno.fin, id_cierre]
  );
  return result.rows[0];
};

export const getTotalSalidasParaCierre = async (id_cierre, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_salidas
     FROM salida_caja
     WHERE id_cierre = $1`,
    [id_cierre]
  );
  return Number(result.rows[0]?.total_salidas || 0);
};

export const contarOperacionesSinEvidenciaEmpresa = async (idCierre) => {
  const result = await query(
    `SELECT COUNT(DISTINCT o.id_operacion)::int AS total
     FROM operacion o
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     WHERE o.id_cierre = $1
       AND COALESCE(o.estado, '') <> 'ANULADA'
       AND COALESCE(p.estado, '') NOT IN ('ANULADO', 'ANULADA')
       AND mp.es_efectivo = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM evidencia e
         WHERE e.id_operacion = o.id_operacion
           AND e.tipo_evidencia = 'EMPRESA'
       )`,
    [idCierre]
  );

  return result.rows[0]?.total || 0;
};

// NUEVO: Función para actualizar solo el estado
export const updateEstadoCierre = async (idCierre, nuevoEstado) => {
  const result = await query(
    `UPDATE cierre_caja 
     SET estado = $1 
     WHERE id_cierre = $2 
     RETURNING id_cierre, estado`,
    [nuevoEstado, idCierre]
  );
  return result.rows[0] ?? null;
};