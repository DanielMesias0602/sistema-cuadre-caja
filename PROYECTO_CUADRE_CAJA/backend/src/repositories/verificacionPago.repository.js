import { query } from './base.repository.js';

export const createVerificacionPago = async ({
  id_pago,
  id_evidencia_cliente = null,
  id_evidencia_empresa = null,
  id_usuario,
  monto_comparado = null,
  fecha_comparada = null,
  referencia_bancaria_comparada = null,
  estado_verificacion,
  observacion = null
}) => {
  const result = await query(
    `INSERT INTO verificacion_pago
      (
        id_pago,
        id_evidencia_cliente,
        id_evidencia_empresa,
        id_usuario,
        monto_comparado,
        fecha_comparada,
        referencia_bancaria_comparada,
        estado_verificacion,
        observacion
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING
       id_verificacion,
       id_pago,
       id_evidencia_cliente,
       id_evidencia_empresa,
       id_usuario,
       monto_comparado,
       fecha_comparada,
       referencia_bancaria_comparada,
       estado_verificacion,
       observacion,
       fecha_verificacion`,
    [
      id_pago,
      id_evidencia_cliente,
      id_evidencia_empresa,
      id_usuario,
      monto_comparado,
      fecha_comparada,
      referencia_bancaria_comparada,
      estado_verificacion,
      observacion
    ]
  );

  return result.rows[0];
};

export const findVerificacionPagoById = async (idVerificacion) => {
  const result = await query(
    `SELECT
       id_verificacion,
       id_pago,
       id_evidencia_cliente,
       id_evidencia_empresa,
       id_usuario,
       monto_comparado,
       fecha_comparada,
       referencia_bancaria_comparada,
       estado_verificacion,
       observacion,
       fecha_verificacion
     FROM verificacion_pago
     WHERE id_verificacion = $1`,
    [idVerificacion]
  );

  return result.rows[0] ?? null;
};

export const findVerificacionesByPago = async (idPago) => {
  const result = await query(
    `SELECT
       id_verificacion,
       id_pago,
       id_evidencia_cliente,
       id_evidencia_empresa,
       id_usuario,
       monto_comparado,
       fecha_comparada,
       referencia_bancaria_comparada,
       estado_verificacion,
       observacion,
       fecha_verificacion
     FROM verificacion_pago
     WHERE id_pago = $1
     ORDER BY id_verificacion`,
    [idPago]
  );

  return result.rows;
};