import {
  createCierreCaja,
  findCierreCajaById,
  findCierresCaja
} from '../repositories/cierreCaja.repository.js';

export const registrarCierreCaja = async ({
  fecha,
  turno,
  total_ingresos,
  total_no_efectivo,
  total_salidas,
  efectivo_fisico,
  estado = 'CERRADO',
  fecha_fin = null,
  id_usuario_responsable
}) => {
  if (!id_usuario_responsable) {
    throw new Error('El usuario responsable es obligatorio');
  }

  if (!fecha) {
    throw new Error('La fecha es obligatoria');
  }

  if (!turno) {
    throw new Error('El turno es obligatorio');
  }

  const ingresos = Number(total_ingresos);
  const noEfectivo = Number(total_no_efectivo);
  const salidas = Number(total_salidas);
  const efectivoFisico = Number(efectivo_fisico);

  const valores = [
    ['total_ingresos', ingresos],
    ['total_no_efectivo', noEfectivo],
    ['total_salidas', salidas],
    ['efectivo_fisico', efectivoFisico]
  ];

  for (const [nombre, valor] of valores) {
    if (!Number.isFinite(valor)) {
      throw new Error(`${nombre} debe ser numérico`);
    }

    if (valor < 0) {
      throw new Error(`${nombre} no puede ser negativo`);
    }
  }

  const efectivoEsperado = ingresos - noEfectivo;

  if (efectivoEsperado < 0) {
    throw new Error(
      'El efectivo esperado no puede ser negativo'
    );
  }

  const efectivoDespuesSalidas =
    efectivoEsperado - salidas;

  if (efectivoDespuesSalidas < 0) {
    throw new Error(
      'El efectivo después de salidas no puede ser negativo'
    );
  }

  const diferencia =
    efectivoFisico - efectivoDespuesSalidas;

  return createCierreCaja({
    id_usuario_responsable,
    fecha,
    turno,
    total_ingresos: ingresos,
    total_no_efectivo: noEfectivo,
    efectivo_esperado: efectivoEsperado,
    total_salidas: salidas,
    efectivo_despues_salidas: efectivoDespuesSalidas,
    efectivo_fisico: efectivoFisico,
    diferencia,
    estado,
    fecha_fin
  });
};

export const obtenerCierreCaja = async (idCierre) => {
  return findCierreCajaById(idCierre);
};

export const listarCierresCaja = async () => {
  return findCierresCaja();
};