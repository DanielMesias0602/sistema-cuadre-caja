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
}) => {
  const result = await query(
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

export const findCierreCajaById = async (idCierre) => {
  const result = await query(
    `SELECT
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
       fecha_fin
     FROM cierre_caja
     WHERE id_cierre = $1`,
    [idCierre]
  );

  return result.rows[0] ?? null;
};

export const findCierresCaja = async () => {
  const result = await query(
    `SELECT
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
       fecha_fin
     FROM cierre_caja
     ORDER BY fecha DESC, id_cierre DESC`
  );

  return result.rows;
};