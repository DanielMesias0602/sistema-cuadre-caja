import { query } from './base.repository.js';

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
      (
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
      )
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING
       id_cierre,
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
       fecha_fin`,
    [
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
    ]
  );

  return result.rows[0];
};

export const findParticipantesCierre = async (idCierre) => {
  const result = await query(
    `SELECT 
       u.id_usuario, 
       u.nombres || ' ' || u.apellidos AS nombre_completo,
       MIN(o.fecha_registro) AS primera_operacion,
       MAX(o.fecha_registro) AS ultima_operacion,
       COUNT(o.id_operacion) AS total_operaciones
     FROM operacion o
     JOIN usuario u ON u.id_usuario = o.id_usuario
     WHERE o.id_cierre = $1
     GROUP BY u.id_usuario, u.nombres, u.apellidos
     ORDER BY primera_operacion ASC`,
    [idCierre]
  );
  return result.rows;
};

export const findCierreCajaById = async (idCierre) => {
  const result = await query(
    `SELECT
       c.id_cierre,
       c.id_usuario_responsable,
       TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
       c.turno,
       c.total_ingresos,
       c.total_no_efectivo,
       c.efectivo_esperado,
       c.total_salidas,
       c.efectivo_despues_salidas,
       c.efectivo_fisico,
       c.diferencia,
       c.estado,
       c.fecha_fin,
       u.nombres || ' ' || u.apellidos AS responsable
     FROM cierre_caja c
     INNER JOIN usuario u ON u.id_usuario = c.id_usuario_responsable
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
       c.id_cierre,
       c.id_usuario_responsable,
       TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha,
       c.turno,
       c.total_ingresos,
       c.total_no_efectivo,
       c.efectivo_esperado,
       c.total_salidas,
       c.efectivo_despues_salidas,
       c.efectivo_fisico,
       c.diferencia,
       c.estado,
       c.fecha_fin,
       u.nombres || ' ' || u.apellidos AS responsable
     FROM cierre_caja c
     INNER JOIN usuario u ON u.id_usuario = c.id_usuario_responsable
     ORDER BY c.fecha DESC, c.id_cierre DESC`
  );

  return result.rows;
};

export const getTotalesParaCierre = async (fecha, turno) => {
  const result = await query(
    `SELECT
       COALESCE(SUM(p.monto), 0) as total_ingresos,
       COALESCE(SUM(CASE WHEN mp.es_efectivo = FALSE THEN p.monto ELSE 0 END), 0) as total_no_efectivo
     FROM operacion o
     JOIN pago p ON p.id_operacion = o.id_operacion
     JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
     WHERE o.fecha = $1
       AND o.id_cierre IS NULL
       AND (
         (UPPER($2) = 'MAÑANA' AND (o.fecha_registro AT TIME ZONE 'America/Lima')::time <= '14:00:00'::time)
         OR
         (UPPER($2) = 'TARDE' AND (o.fecha_registro AT TIME ZONE 'America/Lima')::time > '14:00:00'::time AND (o.fecha_registro AT TIME ZONE 'America/Lima')::time <= '20:00:00'::time)
       )`,
    [fecha, turno]
  );
  return result.rows[0];
};