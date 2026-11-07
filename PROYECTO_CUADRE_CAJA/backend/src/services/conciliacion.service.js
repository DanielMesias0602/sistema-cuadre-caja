import {
  createConciliacion,
  findConciliacionById,
  findAllConciliaciones,
  findCierresByFecha,
  findConciliacionByFecha,
  contarOperacionesSinEvidenciaEmpresaPorFecha,
  findTodasOperacionesPorFecha,
  findOperacionesConNumeros,
  actualizarConciliacion as actualizarConciliacionRepository,
  ponerConciliacionEnRevision as actualizarConciliacionEnRevision
} from '../repositories/conciliacion.repository.js';
import { withTransaction } from '../repositories/base.repository.js';
import { emitirEvento } from './socket.service.js';

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
  const total_no_efectivo = cierres.reduce((acc, c) => acc + Number(c.total_no_efectivo || 0), 0);
  const total_salidas = cierres.reduce((acc, c) => acc + Number(c.total_salidas || 0), 0);
  const total_efectivo_esperado = total_ingresos - total_no_efectivo - total_salidas;

  const operaciones_pendientes_evidencia = await contarOperacionesSinEvidenciaEmpresaPorFecha(fecha);
  const operaciones_con_numeros = await findOperacionesConNumeros(fecha);
  const todas_las_operaciones = await findTodasOperacionesPorFecha(fecha);

  return {
    cierres,
    diferencia_total,
    total_ingresos,
    total_no_efectivo,
    total_efectivo_esperado,
    total_salidas,
    operaciones_pendientes_evidencia,
    operaciones_con_numeros,
    todas_las_operaciones
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
  if (typeof resultado !== 'string' || !resultado.trim()) {
    throw validationError('El resultado de la conciliación es obligatorio');
  }
  const resultadoNormalizado = resultado.trim().toUpperCase() === 'EN REVISION'
    ? 'EN REVISIÓN'
    : resultado.trim().toUpperCase();
  if (!['CONCILIADO', 'EN REVISIÓN'].includes(resultadoNormalizado)) {
    throw validationError('El resultado debe ser CONCILIADO o EN REVISIÓN');
  }

  const conciliacion = await withTransaction(async (client) => {
    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended('conciliacion-fecha:' || $1::date::text, 0)
       )`,
      [fecha]
    );

    const existe = await findConciliacionByFecha(fecha, client);
    if (existe) {
      throw validationError(
        'Ya existe una conciliación para esta fecha. Use el botón de actualizar.'
      );
    }

    return createConciliacion({
      id_usuario,
      fecha,
      diferencia_detectada: diferenciaNumerica,
      resultado: resultadoNormalizado,
      observacion: observacion?.trim() || null
    }, client);
  });
  emitirEvento('conciliacion_actualizada', { id: conciliacion.id_conciliacion });
  return conciliacion;
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

export const actualizarConciliacion = async (
  idConciliacion,
  { id_usuario, diferencia_detectada, resultado, observacion = null }
) => {
  const idNumerico = Number(idConciliacion);
  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw validationError('El identificador de conciliación no es válido');
  }
  if (!id_usuario) throw validationError('El usuario es obligatorio');

  const diferenciaNumerica = Number(diferencia_detectada);
  if (!Number.isFinite(diferenciaNumerica)) {
    throw validationError('La diferencia detectada debe ser numérica');
  }
  if (typeof resultado !== 'string' || !resultado.trim()) {
    throw validationError('El resultado de la conciliación es obligatorio');
  }
  const resultadoNormalizado = resultado.trim().toUpperCase() === 'EN REVISION'
    ? 'EN REVISIÓN'
    : resultado.trim().toUpperCase();
  if (!['CONCILIADO', 'EN REVISIÓN'].includes(resultadoNormalizado)) {
    throw validationError('El resultado debe ser CONCILIADO o EN REVISIÓN');
  }
  if (observacion != null && typeof observacion !== 'string') {
    throw validationError('La observación debe ser texto');
  }
  if (observacion != null && observacion.trim().length > 500) {
    throw validationError('La observación no puede superar los 500 caracteres');
  }

  const conciliacionActualizada = await withTransaction(async (client) => {
    const existente = await client.query(
      `SELECT id_conciliacion
       FROM conciliacion
       WHERE id_conciliacion = $1
       FOR UPDATE`,
      [idNumerico]
    );
    if (existente.rows.length === 0) {
      const error = new Error('La conciliación no existe');
      error.statusCode = 404;
      throw error;
    }

    return actualizarConciliacionRepository(
      idNumerico,
      {
        diferencia_detectada: diferenciaNumerica,
        resultado: resultadoNormalizado,
        observacion: observacion?.trim() || null
      },
      client
    );
  });

  if (!conciliacionActualizada) {
    const error = new Error('No se pudo actualizar la conciliación');
    error.statusCode = 409;
    throw error;
  }

  emitirEvento('conciliacion_actualizada', {
    id: conciliacionActualizada.id_conciliacion,
    resultado: conciliacionActualizada.resultado
  });
  return conciliacionActualizada;
};

export const ponerConciliacionEnRevision = async (idConciliacion, idUsuario, motivo) => {
  const idNumerico = Number(idConciliacion);
  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw validationError('El identificador de conciliación no es válido');
  }
  if (!idUsuario) throw validationError('El usuario es obligatorio');
  if (typeof motivo !== 'string' || !motivo.trim()) {
    throw validationError('El motivo para poner en revisión es obligatorio');
  }
  if (motivo.trim().length > 400) {
    throw validationError('El motivo no puede superar los 400 caracteres');
  }

  const conciliacion = await obtenerConciliacion(idNumerico);
  if (String(conciliacion.resultado || '').toUpperCase() === 'EN REVISIÓN') {
    const error = new Error('La conciliación ya está en revisión');
    error.statusCode = 409;
    throw error;
  }

  if (String(conciliacion.resultado || '').toUpperCase() !== 'CONCILIADO') {
    const error = new Error('Solo se puede poner en revisión una conciliación conciliada');
    error.statusCode = 409;
    throw error;
  }

  const registroRevision = `Puesta en revisión por usuario #${idUsuario}. Motivo: ${motivo.trim()}`;
  const observacionAnterior = String(conciliacion.observacion || '').trim();
  const limiteObservacionAnterior = Math.max(
    0,
    500 - registroRevision.length - (observacionAnterior ? 1 : 0)
  );
  const observacion = [
    observacionAnterior.slice(0, limiteObservacionAnterior),
    registroRevision
  ].filter(Boolean).join('\n');
  const conciliacionEnRevision = await actualizarConciliacionEnRevision(
    idNumerico,
    observacion
  );

  if (!conciliacionEnRevision) {
    const error = new Error('La conciliación ya está en revisión');
    error.statusCode = 409;
    throw error;
  }

  emitirEvento('conciliacion_actualizada', { id: idNumerico, resultado: 'EN REVISIÓN' });
  return conciliacionEnRevision;
};

export const listarConciliaciones = async () => {
  const lista = await findAllConciliaciones();
  
  const promesas = lista.map(async (c) => {
    try {
      const operaciones = await findOperacionesConNumeros(c.fecha);
      return { ...c, operaciones_con_numeros: operaciones };
    } catch (error) {
      console.error(`ERROR buscando operaciones para la fecha ${c.fecha}:`, error.message);
      return { ...c, operaciones_con_numeros: [] };
    }
  });

  return Promise.all(promesas);
};