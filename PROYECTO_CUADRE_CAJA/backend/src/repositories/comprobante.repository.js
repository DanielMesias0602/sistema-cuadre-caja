import { query } from './base.repository.js';

export const createComprobante = async ({
  tipo_comprobante,
  serie,
  numero,
  fecha,
  monto,
  cliente = null,
  vendedor = null,
  hora = null,
  moneda = 'PEN',
  igv = null,
  op_gravada = null,
  items = null
}, client = null) => {
  const executor = client ?? { query };
  
  // Validación para PostgreSQL: Si items es un objeto/array, lo convertimos a string JSON.
  // Si ya es un string, lo dejamos pasar.
  const itemsToSave = items ? (typeof items === 'string' ? items : JSON.stringify(items)) : null;

  const result = await executor.query(
    `INSERT INTO comprobante 
       (tipo_comprobante, serie, numero, fecha, monto, cliente, vendedor, hora, moneda, igv, op_gravada, items) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
     RETURNING id_comprobante, tipo_comprobante, serie, numero, fecha, monto, cliente, vendedor, hora, moneda, igv, op_gravada, items`,
    [tipo_comprobante, serie, numero, fecha, monto, cliente, vendedor, hora, moneda, igv, op_gravada, itemsToSave]
  );

  return result.rows[0];
};

export const findComprobanteById = async (idComprobante) => {
  const result = await query(
    `SELECT
       id_comprobante,
       tipo_comprobante,
       serie,
       numero,
       fecha,
       monto,
       cliente,
       vendedor,
       hora,
       moneda,
       igv,
       op_gravada,
       items
     FROM comprobante
     WHERE id_comprobante = $1`,
    [idComprobante]
  );

  return result.rows[0] ?? null;
};

export const findAllComprobantes = async () => {
  const result = await query(
    `SELECT
       id_comprobante,
       tipo_comprobante,
       serie,
       numero,
       fecha,
       monto,
       cliente,
       vendedor,
       hora,
       moneda,
       igv,
       op_gravada,
       items
     FROM comprobante
     ORDER BY id_comprobante DESC`
  );

  return result.rows;
};