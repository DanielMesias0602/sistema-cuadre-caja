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

// NUEVA FUNCIÓN: Buscar por fecha para evitar duplicados
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
    `SELECT id_cierre, turno, total_ingresos, total_no_efectivo, efectivo_esperado, total_salidas, efectivo_fisico, diferencia, estado
     FROM cierre_caja WHERE fecha = $1 ORDER BY turno ASC`, [fecha]
  );
  return result.rows;
};