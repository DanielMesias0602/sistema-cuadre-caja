import {
  createNotaCredito,
  findNotaCreditoById,
  findNotasCreditoByComprobante,
  findAllNotasCredito // <-- NUEVO
} from '../repositories/notaCredito.repository.js';

import {
  query,
  withTransaction
} from '../repositories/base.repository.js';

const obtenerComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT
       c.id_comprobante, c.tipo_comprobante, c.serie, c.numero, c.fecha, c.monto,
       o.id_operacion, o.id_cierre
     FROM comprobante c
     LEFT JOIN operacion o ON o.id_comprobante = c.id_comprobante
     WHERE c.id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

const obtenerAnulacion = async (idComprobante) => {
  const result = await query(
    `SELECT id_anulacion, id_comprobante, fecha, motivo
     FROM anulacion
     WHERE id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

const obtenerTipoSalidaNotaCredito = async (client) => {
  const result = await client.query(
    `SELECT id_tipo_salida, nombre, estado
     FROM tipo_salida
     WHERE LOWER(nombre) IN ('nota de crédito', 'nota de credito')
     LIMIT 1`
  );
  return result.rows[0] ?? null;
};

const crearSalidaNotaCredito = async ({
  client,
  id_cierre,
  id_usuario,
  id_comprobante,
  fecha,
  monto,
  motivo
}) => {
  const cierreResult = await client.query(
    `SELECT id_cierre, efectivo_esperado
     FROM cierre_caja
     WHERE id_cierre = $1
     FOR UPDATE`,
    [id_cierre]
  );
  const cierre = cierreResult.rows[0];
  if (!cierre) throw new Error('El cierre de caja no existe');

  const tipoSalida = await obtenerTipoSalidaNotaCredito(client);
  if (!tipoSalida) {
    const error = new Error('No existe el tipo de salida "Nota de crédito" en el catálogo');
    error.statusCode = 409;
    throw error;
  }
  if (!tipoSalida.estado) {
    const error = new Error('El tipo de salida "Nota de crédito" está inactivo');
    error.statusCode = 409;
    throw error;
  }

  const totalResult = await client.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_salidas
     FROM salida_caja
     WHERE id_cierre = $1`,
    [id_cierre]
  );
  const totalSalidasActuales = Number(totalResult.rows[0].total_salidas);
  const nuevoTotalSalidas = totalSalidasActuales + monto;
  const efectivoDespuesSalidas = Number(cierre.efectivo_esperado) - nuevoTotalSalidas;

  if (efectivoDespuesSalidas < 0) {
    const error = new Error('La salida por nota de crédito supera el efectivo esperado del cierre');
    error.statusCode = 409;
    throw error;
  }

  const salidaResult = await client.query(
    `INSERT INTO salida_caja
      (id_cierre, id_tipo_salida, id_usuario, id_comprobante, fecha, monto, motivo, observacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_salida, id_cierre, id_tipo_salida, id_usuario, id_comprobante, fecha, monto, motivo, observacion, fecha_registro`,
    [id_cierre, tipoSalida.id_tipo_salida, id_usuario, id_comprobante, fecha, monto, motivo, 'Salida generada automáticamente por Nota de Crédito']
  );

  const totalFinalResult = await client.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_salidas
     FROM salida_caja
     WHERE id_cierre = $1`,
    [id_cierre]
  );
  const totalSalidas = Number(totalFinalResult.rows[0].total_salidas);
  const efectivoDespues = Number(cierre.efectivo_esperado) - totalSalidas;

  const cierreActualizadoResult = await client.query(
    `UPDATE cierre_caja
     SET total_salidas = $1, efectivo_despues_salidas = $2, diferencia = efectivo_fisico - $2
     WHERE id_cierre = $3
     RETURNING id_cierre, total_salidas, efectivo_despues_salidas, efectivo_fisico, diferencia`,
    [totalSalidas, efectivoDespues, id_cierre]
  );

  return { salida: salidaResult.rows[0], cierre: cierreActualizadoResult.rows[0] };
};

export const registrarNotaCredito = async ({
  id_comprobante_original,
  id_usuario,
  fecha,
  monto,
  motivo,
  observacion = null,
  genera_salida_efectivo = false,
  id_tipo_salida = null,
  id_cierre = null
}) => {
  if (!id_comprobante_original) throw new Error('El comprobante original es obligatorio');
  if (!id_usuario) throw new Error('El usuario es obligatorio');
  if (!fecha) throw new Error('La fecha es obligatoria');
  if (!motivo || !motivo.trim()) throw new Error('El motivo es obligatorio');

  const montoNumerico = Number(monto);
  if (!Number.isFinite(montoNumerico)) throw new Error('El monto debe ser numérico');
  if (montoNumerico <= 0) throw new Error('El monto debe ser mayor que cero');

  const comprobante = await obtenerComprobante(id_comprobante_original);
  if (!comprobante) {
    const error = new Error('El comprobante original no existe');
    error.statusCode = 404;
    throw error;
  }

  const anulacion = await obtenerAnulacion(id_comprobante_original);
  if (!anulacion) {
    const error = new Error('El comprobante debe estar anulado antes de registrar la Nota de Crédito');
    error.statusCode = 409;
    throw error;
  }

  const cierreDestino = id_cierre || comprobante.id_cierre;
  const comprobanteMonto = Number(comprobante.monto);
  const diferencia = comprobanteMonto - montoNumerico;
  const backend_genera_salida = diferencia > 0;

  if (backend_genera_salida && !cierreDestino) {
    const error = new Error('Para registrar salida de efectivo por Nota de Crédito se requiere un cierre de caja asociado');
    error.statusCode = 409;
    throw error;
  }

  return withTransaction(async (client) => {
    const notaResult = await client.query(
      `INSERT INTO nota_credito
        (id_comprobante_original, id_usuario, fecha, monto, motivo, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion`,
      [id_comprobante_original, id_usuario, fecha, montoNumerico, motivo.trim(), observacion]
    );

    const notaCredito = notaResult.rows[0];
    let salida = null;
    if (backend_genera_salida) {
      salida = await crearSalidaNotaCredito({
        client,
        id_cierre: cierreDestino,
        id_usuario,
        id_comprobante: id_comprobante_original,
        fecha,
        monto: diferencia,
        motivo: `Nota de crédito por diferencia - ${motivo.trim()}`,
        id_tipo_salida
      });
    }

    return {
      nota_credito: notaCredito,
      salida_caja: salida ? salida.salida : null,
      cierre: salida ? salida.cierre : null
    };
  });
};

export const obtenerNotaCredito = async (idNotaCredito) => {
  return findNotaCreditoById(idNotaCredito);
};

export const listarNotasCreditoPorComprobante = async (idComprobante) => {
  return findNotasCreditoByComprobante(idComprobante);
};

// NUEVO: Listar todas las notas de crédito
export const listarTodasNotasCredito = async () => {
  return findAllNotasCredito();
};