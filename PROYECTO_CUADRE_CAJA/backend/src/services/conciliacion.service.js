import {
  createConciliacion,
  findConciliacionById,
  findAllConciliaciones,
  findCierresByFecha,
  findConciliacionByFecha // <-- NUEVO
} from '../repositories/conciliacion.repository.js';

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const obtenerPreCalculoConciliacion = async (fecha) => {
  if (!fecha) throw validationError('La fecha es obligatoria para el pre-cálculo');

  const cierres = await findCierresByFecha(fecha);

  const diferencia_total = cierres.reduce((acc, c) => acc + Number(c.diferencia || 0), 0);
  const total_ingresos = cierres.reduce((acc, c) => acc + Number(c.total_ingresos || 0), 0);
  const total_efectivo_esperado = cierres.reduce((acc, c) => acc + Number(c.efectivo_esperado || 0), 0);
  const total_salidas = cierres.reduce((acc, c) => acc + Number(c.total_salidas || 0), 0);

  return {
    cierres,
    diferencia_total,
    total_ingresos,
    total_efectivo_esperado,
    total_salidas
  };
};

export const registrarConciliacion = async ({
  id_usuario,
  fecha,
  diferencia_detectada,
  resultado,
  observacion = null
}) => {
  if (!id_usuario) throw validationError('El usuario es obligatorio');
  if (!fecha) throw validationError('La fecha de conciliación es obligatoria');

  const diferenciaNumerica = Number(diferencia_detectada);
  if (!Number.isFinite(diferenciaNumerica)) throw validationError('La diferencia detectada debe ser numérica');
  if (!resultado || !resultado.trim()) throw validationError('El resultado de la conciliación es obligatorio');
  if (resultado.trim().length > 30) throw validationError('El resultado no puede superar los 30 caracteres');

  // NUEVO: Validar que no exista una conciliación para esa fecha
  const existe = await findConciliacionByFecha(fecha);
  if (existe) {
    throw validationError(`Ya existe una conciliación registrada para la fecha ${fecha}`);
  }

  return createConciliacion({
    id_usuario,
    fecha,
    diferencia_detectada: diferenciaNumerica,
    resultado: resultado.trim(),
    observacion: observacion?.trim() || null
  });
};

export const obtenerConciliacion = async (idConciliacion) => {
  const conciliacion = await findConciliacionById(idConciliacion);
  if (!conciliacion) {
    const error = new Error('La conciliación no existe');
    error.statusCode = 404;
    throw error;
  }
  return conciliacion;
};

export const listarConciliaciones = async () => {
  return findAllConciliaciones();
};