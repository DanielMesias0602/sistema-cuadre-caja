import { query } from './base.repository.js';

export const createOperacion = async ({
  id_comprobante,
  id_usuario,
  id_cierre = null,
  fecha,
  monto,
  estado,
  observacion = null
}, client = null) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `INSERT INTO operacion
       (id_usuario, id_cierre, id_comprobante, fecha, monto, estado, observacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_operacion, id_usuario, id_cierre, id_comprobante, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, monto, estado, observacion, fecha_registro`,
    [id_usuario, id_cierre, id_comprobante, fecha, monto, estado, observacion]
  );

  return result.rows[0];
};

export const updateOperacionMonto = async (
  idOperacion,
  monto,
  idUsuarioModificacion,
  client = null
) => {
  const executor = client ?? { query };
  const result = await executor.query(
    `UPDATE operacion
     SET monto = $1,
        fecha_modificacion = CURRENT_TIMESTAMP,
        id_usuario_modificacion = $2
     WHERE id_operacion = $3
     RETURNING id_operacion, id_usuario, id_cierre, id_comprobante,
       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, monto, estado, observacion,
       fecha_registro, fecha_modificacion, id_usuario_modificacion`,
    [monto, idUsuarioModificacion, idOperacion]
  );

  return result.rows[0] ?? null;
};

export const findOperacionById = async (idOperacion) => {
  const result = await query(
    `SELECT
       o.id_operacion,
       o.id_usuario,
       o.id_cierre,
       o.id_comprobante,
       TO_CHAR(o.fecha, 'YYYY-MM-DD') AS fecha,
       o.monto,
       o.estado,
       o.observacion,
       o.fecha_registro,
       o.fecha_modificacion,
       o.id_usuario_modificacion,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.cliente,
       c.vendedor,
       TO_CHAR(c.fecha, 'YYYY-MM-DD') AS fecha_comprobante,
       c.hora,
       c.moneda,
       c.igv,
       c.op_gravada,
       c.items,
       c.monto AS comprobante_monto,
       COALESCE(
         (
           SELECT jsonb_agg(
             jsonb_build_object(
               'id_pago', vp.id_pago,
               'id_evidencia_cliente', vp.id_evidencia_cliente,
               'id_evidencia_empresa', vp.id_evidencia_empresa,
               'estado_verificacion', vp.estado_verificacion
             )
           )
           FROM verificacion_pago vp
           JOIN pago p ON p.id_pago = vp.id_pago
           WHERE p.id_operacion = o.id_operacion
         ),
         '[]'::jsonb
       ) AS verificaciones
     FROM operacion o
     INNER JOIN comprobante c ON c.id_comprobante = o.id_comprobante
     WHERE o.id_operacion = $1`,
    [idOperacion]
  );

  return result.rows[0] ?? null;
};

export const findAllOperaciones = async () => {
  const result = await query(
    `SELECT
       o.id_operacion,
       o.id_usuario,
       o.id_cierre,
       o.id_comprobante,
       TO_CHAR(o.fecha, 'YYYY-MM-DD') AS fecha,
       o.monto,
       o.estado,
       o.observacion,
       o.fecha_registro,
       o.fecha_modificacion,
       o.id_usuario_modificacion,
       u.nombres,
       u.apellidos,
       c.tipo_comprobante,
       c.serie,
       c.numero,
       c.cliente,
       c.vendedor,
       c.hora,
       c.moneda,
       c.igv,
       c.op_gravada,
       c.items,
       -- Subconsulta independiente para pagos (evita producto cartesiano)
       COALESCE(
         (SELECT jsonb_agg(
           jsonb_build_object(
             'id_pago', p.id_pago,
             'medio_pago', mp.nombre,
             'monto', p.monto,
             'referencia', p.referencia_bancaria,
             'estado', p.estado
           )
         ) FROM pago p
         LEFT JOIN medio_pago mp ON mp.id_medio_pago = p.id_medio_pago
         WHERE p.id_operacion = o.id_operacion),
         '[]'::jsonb
       ) AS pagos,
       -- Subconsulta independiente para evidencias (evita producto cartesiano)
       -- CAMBIO: ahora trae datos_ocr, texto_ocr, id_evidencia, fecha_evidencia
       COALESCE(
         (SELECT jsonb_agg(
           jsonb_build_object(
             'id_evidencia', e.id_evidencia,
             'tipo_evidencia', e.tipo_evidencia,
             'storage_key', e.storage_key,
             'fecha_evidencia', TO_CHAR(e.fecha_evidencia, 'YYYY-MM-DD'),
             'texto_ocr', e.texto_ocr,
             'datos_ocr', e.datos_ocr
           )
         ) FROM evidencia e
         WHERE e.id_operacion = o.id_operacion),
         '[]'::jsonb
       ) AS evidencias,
       COALESCE(
         (SELECT jsonb_agg(
           jsonb_build_object(
             'id_pago', vp.id_pago,
             'id_evidencia_cliente', vp.id_evidencia_cliente,
             'id_evidencia_empresa', vp.id_evidencia_empresa,
             'estado_verificacion', vp.estado_verificacion
           )
         ) FROM verificacion_pago vp
         JOIN pago p ON p.id_pago = vp.id_pago
         WHERE p.id_operacion = o.id_operacion),
         '[]'::jsonb
       ) AS verificaciones
     FROM operacion o
     INNER JOIN usuario u
       ON u.id_usuario = o.id_usuario
     INNER JOIN comprobante c
       ON c.id_comprobante = o.id_comprobante
     -- NO LEFT JOIN a pagos ni evidencias a este nivel
     GROUP BY
       o.id_operacion, u.nombres, u.apellidos,
       c.id_comprobante, c.tipo_comprobante, c.serie, c.numero,
       c.cliente, c.vendedor, c.hora, c.moneda, c.igv, c.op_gravada, c.items
     ORDER BY o.id_operacion DESC`
  );

  return result.rows;
};