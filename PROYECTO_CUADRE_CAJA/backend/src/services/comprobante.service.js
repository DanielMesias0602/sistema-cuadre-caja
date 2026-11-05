import {
  createComprobante,
  findComprobanteById,
  findAllComprobantes,
  updateComprobante,
  findComprobanteByTipoSerieNumero // <-- NUEVO IMPORT
} from '../repositories/comprobante.repository.js';

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

export const registerComprobante = async (data) => {
  return createComprobante(data);
};

export const actualizarComprobante = async (idComprobante, data) => {
  const id = Number(idComprobante);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw validationError('El identificador del comprobante no es válido.');
  }

  const tipoComprobante = typeof data?.tipo_comprobante === 'string'
    ? data.tipo_comprobante.trim()
    : '';
  const serie = typeof data?.serie === 'string' ? data.serie.trim() : '';
  const numero = typeof data?.numero === 'string' ? data.numero.trim() : '';
  const fecha = typeof data?.fecha === 'string' ? data.fecha.trim() : '';
  if (data?.hora != null && typeof data.hora !== 'string') {
    throw validationError('La hora indicada no es válida.');
  }
  const hora = typeof data?.hora === 'string' ? data.hora.trim() : '';
  const cliente = data?.cliente == null
    ? null
    : typeof data.cliente === 'string'
      ? data.cliente.trim() || null
      : undefined;
  const vendedor = data?.vendedor == null
    ? null
    : typeof data.vendedor === 'string'
      ? data.vendedor.trim() || null
      : undefined;

  if (!tipoComprobante || tipoComprobante.length > 30) {
    throw validationError('El tipo de comprobante es obligatorio y no debe superar 30 caracteres.');
  }
  if (!serie || serie.length > 10) {
    throw validationError('La serie es obligatoria y no debe superar 10 caracteres.');
  }
  if (!numero || numero.length > 20) {
    throw validationError('El número es obligatorio y no debe superar 20 caracteres.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw validationError('La fecha debe tener el formato AAAA-MM-DD.');
  }
  const fechaValidada = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(fechaValidada.getTime()) || fechaValidada.toISOString().slice(0, 10) !== fecha) {
    throw validationError('La fecha indicada no es válida.');
  }
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora)) {
    throw validationError('La hora indicada no es válida.');
  }
  if (cliente === undefined || (cliente && cliente.length > 255)) {
    throw validationError('El nombre del cliente no debe superar 255 caracteres.');
  }
  if (vendedor === undefined || (vendedor && vendedor.length > 100)) {
    throw validationError('El nombre del vendedor no debe superar 100 caracteres.');
  }

  const comprobante = await updateComprobante(id, {
    tipo_comprobante: tipoComprobante,
    serie,
    numero,
    fecha,
    hora: hora || null,
    cliente,
    vendedor,
  });

  if (!comprobante) {
    throw notFoundError('El comprobante no existe.');
  }

  return comprobante;
};

export const getComprobanteById = async (idComprobante) => {
  return findComprobanteById(idComprobante);
};

export const getComprobantes = async () => {
  return findAllComprobantes();
};

// NUEVA FUNCIÓN: Verificar si existe un comprobante por sus datos únicos
export const checkComprobanteExistente = async (tipo, serie, numero) => {
  return findComprobanteByTipoSerieNumero(tipo, serie, numero);
};