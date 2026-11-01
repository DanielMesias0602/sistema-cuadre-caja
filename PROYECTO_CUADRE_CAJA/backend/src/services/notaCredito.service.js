import {
  createNotaCredito,
  findNotaCreditoById,
  findNotasCreditoByComprobante,
  findAllNotasCredito,
  updateNotaCredito
} from '../repositories/notaCredito.repository.js';

import { query, withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';

const obtenerComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT c.id_comprobante, c.tipo_comprobante, c.serie, c.numero, c.fecha, c.monto, o.id_operacion, o.id_cierre
     FROM comprobante c
     LEFT JOIN operacion o ON o.id_comprobante = c.id_comprobante
     WHERE c.id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

const obtenerAnulacion = async (idComprobante) => {
  const result = await query(
    `SELECT id_anulacion, id_comprobante, fecha, motivo FROM anulacion WHERE id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

export const registrarNotaCredito = async ({ id_comprobante_original, id_usuario, fecha, monto, motivo, observacion = null }) => {
  if (!id_comprobante_original) throw new Error('El comprobante original es obligatorio');
  if (!id_usuario) throw new Error('El usuario es obligatorio');
  if (!fecha) throw new Error('La fecha es obligatoria');
  if (!motivo || !motivo.trim()) throw new Error('El motivo es obligatorio');

  const montoNumerico = Number(monto);
  if (!Number.isFinite(montoNumerico)) throw new Error('El monto debe ser numérico');
  if (montoNumerico <= 0) throw new Error('El monto debe ser mayor que cero');

  const comprobante = await obtenerComprobante(id_comprobante_original);
  if (!comprobante) {
    const error = new Error('El comprobante original no existe'); error.statusCode = 404; throw error;
  }

  const anulacion = await obtenerAnulacion(id_comprobante_original);
  if (anulacion) {
    const error = new Error('No se puede emitir una Nota de Crédito sobre un comprobante que ya ha sido ANULADO.');
    error.statusCode = 409; throw error;
  }

  const resultado = await withTransaction(async (client) => {
    const comprobanteBloqueado = await client.query(
      `SELECT monto
       FROM comprobante
       WHERE id_comprobante = $1
       FOR UPDATE`,
      [id_comprobante_original]
    );

    if (comprobanteBloqueado.rows.length === 0) {
      const error = new Error('El comprobante original no existe');
      error.statusCode = 404;
      throw error;
    }

    const notasExistentes = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_notas
       FROM nota_credito
       WHERE id_comprobante_original = $1`,
      [id_comprobante_original]
    );
    const totalNotasAnteriores = Number(notasExistentes.rows[0].total_notas);
    const montoOriginal = Number(comprobanteBloqueado.rows[0].monto);

    if (totalNotasAnteriores + montoNumerico > montoOriginal) {
      const error = new Error(`La suma de las notas de crédito (S/ ${(totalNotasAnteriores + montoNumerico).toFixed(2)}) supera el monto original del comprobante (S/ ${montoOriginal.toFixed(2)}).`);
      error.statusCode = 409;
      throw error;
    }

    const notaResult = await client.query(
      `INSERT INTO nota_credito
        (id_comprobante_original, id_usuario, fecha, monto, motivo, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_nota_credito, id_comprobante_original, id_usuario, fecha, monto, motivo, observacion`,
      [id_comprobante_original, id_usuario, fecha, montoNumerico, motivo.trim(), observacion]
    );

    return {
      nota_credito: notaResult.rows[0],
      salida_caja: null,
      cierre: null
    };
  });

  emitirEvento('ajuste_creado', {
    id: resultado.nota_credito.id_nota_credito,
    tipo: 'NOTA_CREDITO'
  });
  return resultado;
};

export const obtenerNotaCredito = async (idNotaCredito) => {
  return findNotaCreditoById(idNotaCredito);
};

export const listarNotasCreditoPorComprobante = async (idComprobante) => {
  return findNotasCreditoByComprobante(idComprobante);
};

export const listarTodasNotasCredito = async () => {
  return findAllNotasCredito();
};

export const modificarNotaCredito = async (idNotaCredito, { motivo, observacion }) => {
  if (!motivo || !motivo.trim()) {
    const error = new Error('El motivo es obligatorio'); error.statusCode = 400; throw error;
  }
  const notaExistente = await findNotaCreditoById(idNotaCredito);
  if (!notaExistente) {
    const error = new Error('La Nota de Crédito no existe'); error.statusCode = 404; throw error;
  }
  return updateNotaCredito(idNotaCredito, { motivo: motivo.trim(), observacion: observacion || null });
};