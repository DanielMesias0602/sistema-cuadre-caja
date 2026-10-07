import {
  createVerificacionPago,
  findVerificacionPagoById,
  findVerificacionesByPago
} from '../repositories/verificacionPago.repository.js';

import { query } from '../repositories/base.repository.js';

const obtenerPago = async (idPago) => {
  const result = await query(
    `SELECT
       p.id_pago,
       p.id_operacion,
       p.monto,
       p.referencia_bancaria,
       p.estado
     FROM pago p
     WHERE p.id_pago = $1`,
    [idPago]
  );

  return result.rows[0] ?? null;
};

const obtenerEvidencia = async (idEvidencia) => {
  const result = await query(
    `SELECT
       id_evidencia,
       id_operacion,
       tipo_evidencia
     FROM evidencia
     WHERE id_evidencia = $1`,
    [idEvidencia]
  );

  return result.rows[0] ?? null;
};

export const registrarVerificacionPago = async ({
  id_pago,
  id_evidencia_cliente = null,
  id_evidencia_empresa = null,
  id_usuario,
  monto_comparado,
  fecha_comparada,
  referencia_bancaria_comparada = null,
  estado_verificacion,
  observacion = null
}) => {
  if (!id_pago) {
    const error = new Error('El pago es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  if (!id_usuario) {
    const error = new Error('El usuario es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  if (
    monto_comparado === undefined ||
    monto_comparado === null
  ) {
    const error = new Error(
      'El monto comparado es obligatorio'
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    fecha_comparada === undefined ||
    fecha_comparada === null ||
    fecha_comparada === ''
  ) {
    const error = new Error(
      'La fecha comparada es obligatoria'
    );
    error.statusCode = 400;
    throw error;
  }

  if (!estado_verificacion) {
    const error = new Error(
      'El estado de verificación es obligatorio'
    );
    error.statusCode = 400;
    throw error;
  }

  const estadosPermitidos = [
    'PENDIENTE',
    'VERIFICADO',
    'OBSERVADO',
    'NO_CONFIRMADO'
  ];

  if (!estadosPermitidos.includes(estado_verificacion)) {
    const error = new Error(
      'Estado de verificación no válido'
    );
    error.statusCode = 400;
    throw error;
  }

  const montoComparado = Number(monto_comparado);

  if (!Number.isFinite(montoComparado)) {
    const error = new Error(
      'El monto comparado debe ser un valor numérico válido'
    );
    error.statusCode = 400;
    throw error;
  }

  if (montoComparado < 0) {
    const error = new Error(
      'El monto comparado no puede ser negativo'
    );
    error.statusCode = 400;
    throw error;
  }

  const fechaComparada = new Date(
    `${fecha_comparada}T00:00:00`
  );

  if (Number.isNaN(fechaComparada.getTime())) {
    const error = new Error(
      'La fecha comparada no es válida'
    );
    error.statusCode = 400;
    throw error;
  }

  const pago = await obtenerPago(id_pago);

  if (!pago) {
    const error = new Error('El pago no existe');
    error.statusCode = 404;
    throw error;
  }

  if (id_evidencia_cliente) {
    const evidenciaCliente = await obtenerEvidencia(
      id_evidencia_cliente
    );

    if (!evidenciaCliente) {
      const error = new Error(
        'La evidencia del cliente no existe'
      );
      error.statusCode = 404;
      throw error;
    }

    if (
      evidenciaCliente.id_operacion !==
      pago.id_operacion
    ) {
      const error = new Error(
        'La evidencia del cliente no corresponde a la operación del pago'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (id_evidencia_empresa) {
    const evidenciaEmpresa = await obtenerEvidencia(
      id_evidencia_empresa
    );

    if (!evidenciaEmpresa) {
      const error = new Error(
        'La evidencia de la empresa no existe'
      );
      error.statusCode = 404;
      throw error;
    }

    if (
      evidenciaEmpresa.id_operacion !==
      pago.id_operacion
    ) {
      const error = new Error(
        'La evidencia de la empresa no corresponde a la operación del pago'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return createVerificacionPago({
    id_pago,
    id_evidencia_cliente,
    id_evidencia_empresa,
    id_usuario,
    monto_comparado: montoComparado,
    fecha_comparada,
    referencia_bancaria_comparada,
    estado_verificacion,
    observacion
  });
};

export const obtenerVerificacionPago = async (
  idVerificacion
) => {
  return findVerificacionPagoById(idVerificacion);
};

export const listarVerificacionesPago = async (
  idPago
) => {
  const pago = await obtenerPago(idPago);

  if (!pago) {
    const error = new Error('El pago no existe');
    error.statusCode = 404;
    throw error;
  }

  return findVerificacionesByPago(idPago);
};