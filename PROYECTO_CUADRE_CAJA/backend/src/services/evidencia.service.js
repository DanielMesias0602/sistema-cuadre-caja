import {
  createEvidencia,
  findEvidenciaById,
  findEvidenciasByOperacion
} from '../repositories/evidencia.repository.js';
import { withTransaction } from '../repositories/base.repository.js';

import {
  findOperacionById
} from '../repositories/operacion.repository.js';

import {
  generatePreauthenticatedRequest
} from './ociStorage.service.js';

/**
 * Añade una URL firmada temporal (24 h) a una evidencia.
 * Si OCI no responde o el objeto ya no existe, la evidencia
 * se devuelve igual pero con url_firmada = null.
 * El campo url_firmada NO se persiste en la BD.
 */
const enrichWithUrl = async (evidencia) => {
  if (!evidencia || !evidencia.storage_key) return evidencia;

  try {
    const url = await generatePreauthenticatedRequest(
      evidencia.storage_key,
      24
    );

    return { ...evidencia, url_firmada: url || null };
  } catch (error) {
    console.warn(
      `No se pudo generar URL firmada para ${evidencia.storage_key}:`,
      error.message
    );
    return { ...evidencia, url_firmada: null };
  }
};

export const registerEvidencia = async (data) => {
  const {
    id_operacion,
    id_pago = null,
    id_usuario,
    tipo_evidencia,
    storage_key,
    fecha_evidencia,
    observacion = null,
    texto_ocr = null,
    datos_ocr = null
  } = data;

  if (
    !id_operacion ||
    !id_usuario ||
    !tipo_evidencia ||
    !storage_key ||
    !fecha_evidencia
  ) {
    const error = new Error(
      'id_operacion, id_usuario, tipo_evidencia, storage_key y fecha_evidencia son obligatorios'
    );
    error.statusCode = 400;
    throw error;
  }

  if (id_pago != null && (!Number.isInteger(Number(id_pago)) || Number(id_pago) <= 0)) {
    const error = new Error('id_pago debe ser un identificador válido');
    error.statusCode = 400;
    throw error;
  }

  const tipoEvidenciaNormalizado = String(tipo_evidencia).toUpperCase();
  if (id_pago != null && !['CLIENTE', 'EMPRESA'].includes(tipoEvidenciaNormalizado)) {
    const error = new Error('La evidencia asociada al pago debe ser de tipo CLIENTE o EMPRESA');
    error.statusCode = 400;
    throw error;
  }

  const operacion = await findOperacionById(id_operacion);

  if (!operacion) {
    const error = new Error('La operación no existe');
    error.statusCode = 404;
    throw error;
  }

  try {
    const creada = await withTransaction(async (client) => {
      if (id_pago != null) {
        const pagoResult = await client.query(
          `SELECT id_pago
           FROM pago
           WHERE id_pago = $1 AND id_operacion = $2
           FOR UPDATE`,
          [id_pago, id_operacion]
        );
        if (pagoResult.rows.length === 0) {
          const error = new Error('El pago no pertenece a la operación indicada');
          error.statusCode = 404;
          throw error;
        }
      }

      const evidencia = await createEvidencia({
        id_operacion,
        id_usuario,
        tipo_evidencia,
        storage_key,
        fecha_evidencia,
        observacion,
        texto_ocr,
        datos_ocr
      }, client);

      if (id_pago != null) {
        const columnaEvidencia = tipoEvidenciaNormalizado === 'EMPRESA'
          ? 'id_evidencia_empresa'
          : 'id_evidencia_cliente';
        const asociacionResult = await client.query(
          `UPDATE verificacion_pago
           SET ${columnaEvidencia} = $1
           WHERE id_pago = $2`,
          [evidencia.id_evidencia, id_pago]
        );
        if (asociacionResult.rowCount === 0) {
          const error = new Error('No existe una verificación para el pago indicado');
          error.statusCode = 404;
          throw error;
        }
      }

      return evidencia;
    });

    return enrichWithUrl(creada);
  } catch (error) {
    if (
      error.code === '23505' &&
      error.constraint === 'uq_evidencia_storage_key'
    ) {
      const conflictError = new Error(
        'El storage_key de la evidencia ya existe'
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }
};

export const getEvidenciaById = async (idEvidencia) => {
  const evidencia = await findEvidenciaById(idEvidencia);
  return enrichWithUrl(evidencia);
};

export const getEvidenciasByOperacion = async (idOperacion) => {
  const lista = await findEvidenciasByOperacion(idOperacion);

  if (!Array.isArray(lista)) return lista;

  return Promise.all(lista.map(enrichWithUrl));
};