import { query } from './base.repository.js';

export const createPago = async ({
  id_operacion,
  id_medio_pago,
  monto,
  referencia_bancaria = null,
  observacion = null,
  estado = 'REGISTRADO'
}, client = null) => {
  const executor = client ?? { query };

  const result = await executor.query(
    `INSERT INTO pago
      (
        id_operacion,
        id_medio_pago,
        monto,
        referencia_bancaria,
        observacion,
        estado
      )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       id_pago,
       id_operacion,
       id_medio_pago,
       monto,
       referencia_bancaria,
       observacion,
       estado,
       fecha_registro,
       fecha_modificacion`,
    [
      id_operacion,
      id_medio_pago,
      monto,
      referencia_bancaria,
      observacion,
      estado
    ]
  );

  return result.rows[0];
};

export const findPagoById = async (idPago) => {
  const result = await query(
    `SELECT
       p.id_pago,
       p.id_operacion,
       p.id_medio_pago,
       p.monto,
       p.referencia_bancaria,
       p.observacion,
       p.estado,
       p.fecha_registro,
       p.fecha_modificacion,
       m.nombre AS medio_pago
     FROM pago p
     INNER JOIN medio_pago m
       ON m.id_medio_pago = p.id_medio_pago
     WHERE p.id_pago = $1`,
    [idPago]
  );

  return result.rows[0] ?? null;
};

export const findPagosByOperacion = async (idOperacion) => {
  const result = await query(
    `SELECT
       p.id_pago,
       p.id_operacion,
       p.id_medio_pago,
       p.monto,
       p.referencia_bancaria,
       p.observacion,
       p.estado,
       p.fecha_registro,
       p.fecha_modificacion,
       m.nombre AS medio_pago
     FROM pago p
     INNER JOIN medio_pago m
       ON m.id_medio_pago = p.id_medio_pago
     WHERE p.id_operacion = $1
     ORDER BY p.id_pago`,
    [idOperacion]
  );

  return result.rows;
};

export const updatePago = async (idPago, {
  id_medio_pago,
  monto,
  referencia_bancaria,
  observacion,
  estado
}, client = null) => {
  const executor = client ?? { query };

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (id_medio_pago !== undefined) {
    fields.push(`id_medio_pago = $${paramIndex++}`);
    values.push(id_medio_pago);
  }

  if (monto !== undefined) {
    fields.push(`monto = $${paramIndex++}`);
    values.push(monto);
  }

  if (referencia_bancaria !== undefined) {
    fields.push(`referencia_bancaria = $${paramIndex++}`);
    values.push(referencia_bancaria);
  }

  if (observacion !== undefined) {
    fields.push(`observacion = $${paramIndex++}`);
    values.push(observacion);
  }

  if (estado !== undefined) {
    fields.push(`estado = $${paramIndex++}`);
    values.push(estado);
  }

  fields.push(`fecha_modificacion = CURRENT_TIMESTAMP`);
  values.push(idPago);

  const queryText = `
    UPDATE pago
    SET ${fields.join(', ')}
    WHERE id_pago = $${paramIndex}
    RETURNING
      id_pago,
      id_operacion,
      id_medio_pago,
      monto,
      referencia_bancaria,
      observacion,
      estado,
      fecha_registro,
      fecha_modificacion
  `;

  const result = await executor.query(queryText, values);
  return result.rows[0] ?? null;
};