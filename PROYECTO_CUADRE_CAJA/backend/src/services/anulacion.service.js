import {
  createAnulacion,
  findAnulacionById,
  findAnulacionByComprobante,
  findAllAnulaciones
} from '../repositories/anulacion.repository.js';

import { query, withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';

const comprobarComprobante = async (idComprobante) => {
  const result = await query(
    `SELECT
       id_comprobante, tipo_comprobante, serie, numero, fecha, monto,
       (SELECT id_operacion FROM operacion WHERE id_comprobante = $1 LIMIT 1) AS id_operacion,
       (SELECT id_cierre FROM operacion WHERE id_comprobante = $1 LIMIT 1) AS id_cierre
     FROM comprobante
     WHERE id_comprobante = $1`,
    [idComprobante]
  );
  return result.rows[0] ?? null;
};

const comprobarAnulacionExistente = async (idComprobante) => {
  return findAnulacionByComprobante(idComprobante);
};

export const registrarAnulacion = async ({
  id_comprobante,
  id_usuario,
  fecha,
  motivo,
  observacion = null
}) => {
  if (!id_comprobante) throw new Error('El comprobante es obligatorio');
  if (!id_usuario) throw new Error('El usuario es obligatorio');
  if (!fecha) throw new Error('La fecha es obligatoria');
  if (!motivo || !motivo.trim()) throw new Error('El motivo es obligatorio');

  const comprobante = await comprobarComprobante(id_comprobante);
  if (!comprobante) throw new Error('El comprobante no existe');

  const anulacionExistente = await comprobarAnulacionExistente(id_comprobante);
  if (anulacionExistente) {
    const error = new Error('El comprobante ya tiene una anulación registrada');
    error.statusCode = 409;
    throw error;
  }

  // ============================================================
  // NUEVO: Validar que el cierre no esté CERRADO
  // ============================================================
  if (comprobante.id_operacion) {
    const cierreResult = await query(
      `SELECT cc.estado AS estado_cierre
       FROM operacion o
       LEFT JOIN cierre_caja cc ON cc.id_cierre = o.id_cierre
       WHERE o.id_operacion = $1`,
      [comprobante.id_operacion]
    );

    const cierre = cierreResult.rows[0];
    if (cierre && String(cierre.estado_cierre || '').toUpperCase() === 'CERRADO') {
      const error = new Error(
        'No se puede anular una operación que pertenece a un cierre ya cerrado. Debe reabrir el turno en el módulo de Cierres de Caja para poder anular.'
      );
      error.statusCode = 409;
      throw error;
    }
  }
  // ============================================================

  const anulacion = await withTransaction(async (client) => {
    const anulacion = await createAnulacion({
      id_comprobante,
      id_usuario,
      fecha,
      motivo: motivo.trim(),
      observacion
    }, client);

    if (comprobante.id_operacion) {
      await client.query(
        `UPDATE operacion
         SET estado = 'ANULADA',
             fecha_modificacion = CURRENT_TIMESTAMP
         WHERE id_operacion = $1`,
        [comprobante.id_operacion]
      );
    }

    return anulacion;
  });

  emitirEvento('ajuste_creado', { id: anulacion.id_anulacion, tipo: 'ANULACION' });
  emitirEvento('cierre_actualizado', { id: comprobante.id_cierre });
  return anulacion;
};

export const obtenerAnulacion = async (idAnulacion) => {
  return findAnulacionById(idAnulacion);
};

export const obtenerAnulacionPorComprobante = async (idComprobante) => {
  return findAnulacionByComprobante(idComprobante);
};

export const listarAnulaciones = async () => {
  return findAllAnulaciones();
};