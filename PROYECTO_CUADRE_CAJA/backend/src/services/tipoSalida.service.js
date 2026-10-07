import {
  createTipoSalida,
  findTipoSalidaById,
  findTiposSalida
} from '../repositories/tipoSalida.repository.js';

export const registrarTipoSalida = async ({
  nombre,
  descripcion = null,
  estado = true
}) => {
  if (!nombre || !nombre.trim()) {
    throw new Error('El nombre del tipo de salida es obligatorio');
  }

  return createTipoSalida({
    nombre: nombre.trim(),
    descripcion,
    estado
  });
};

export const obtenerTipoSalida = async (idTipoSalida) => {
  return findTipoSalidaById(idTipoSalida);
};

export const listarTiposSalida = async () => {
  return findTiposSalida();
};