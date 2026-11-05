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

export const updateComprobanteMonto = async (idComprobante, monto, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `UPDATE comprobante
     SET monto = $1
     WHERE id_comprobante = $2
     RETURNING id_comprobante, tipo_comprobante, serie, numero, fecha, monto,
       cliente, vendedor, hora, moneda, igv, op_gravada, items`,
    [monto, idComprobante]
  );

  return result.rows[0] ?? null;
};

export const updateComprobante = async (
  idComprobante,
  { tipo_comprobante, serie, numero, fecha, hora, cliente, vendedor }
) => {
  const result = await query(
    `UPDATE comprobante
     SET tipo_comprobante = $1,
         serie = $2,
         numero = $3,
         fecha = $4,
         hora = $5,
         cliente = $6,
         vendedor = $7
     WHERE id_comprobante = $8
     RETURNING id_comprobante, tipo_comprobante, serie, numero,
       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
       monto, cliente, vendedor,
       TO_CHAR(hora, 'HH24:MI:SS') AS hora,
       moneda, igv, op_gravada, items`,
    [tipo_comprobante, serie, numero, fecha, hora, cliente, vendedor, idComprobante]
  );

  return result.rows[0] ?? null;
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

// NUEVA FUNCIÓN: Buscar comprobante por tipo, serie y número para validación proactiva
export const findComprobanteByTipoSerieNumero = async (tipo_comprobante, serie, numero) => {
  const result = await query(
    `SELECT id_comprobante, tipo_comprobante, serie, numero, fecha, monto
     FROM comprobante
     WHERE UPPER(tipo_comprobante) = UPPER($1)
       AND UPPER(serie) = UPPER($2)
       AND numero = $3
     LIMIT 1`,
    [tipo_comprobante, serie, numero]
  );

  return result.rows[0] ?? null;
};