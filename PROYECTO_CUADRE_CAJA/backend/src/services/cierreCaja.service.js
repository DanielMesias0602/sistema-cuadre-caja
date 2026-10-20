import {
  createCierreCaja,
  findCierreCajaById,
  findCierresCaja,
  getTotalesParaCierre
} from '../repositories/cierreCaja.repository.js';

import {
  withTransaction
} from '../repositories/base.repository.js';

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

  return withTransaction(async (client) => {
    const cierre = await createCierreCaja({
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
    }, client);

    let timeCondition = '';
    if (turno === 'MAÑANA') {
      timeCondition = `AND (fecha_registro AT TIME ZONE 'America/Lima')::time <= '14:00:00'::time`;
    } else if (turno === 'TARDE') {
      timeCondition = `AND (fecha_registro AT TIME ZONE 'America/Lima')::time > '14:00:00'::time AND (fecha_registro AT TIME ZONE 'America/Lima')::time <= '20:00:00'::time`;
    }

    await client.query(
      `UPDATE operacion
       SET id_cierre = $1,
           fecha_modificacion = CURRENT_TIMESTAMP
       WHERE fecha = $2
         AND id_cierre IS NULL
         ${timeCondition}`,
      [cierre.id_cierre, fecha]
    );

    return cierre;
  });
};

export const obtenerCierreCaja = async (idCierre) => {
  return findCierreCajaById(idCierre);
};

export const listarCierresCaja = async () => {
  return findCierresCaja();
};

export const obtenerPreCalculoCierre = async (fecha, turno) => {
  const totales = await getTotalesParaCierre(fecha, turno);
  const ingresos = Number(totales.total_ingresos);
  const noEfectivo = Number(totales.total_no_efectivo);
  return {
    total_ingresos: ingresos,
    total_no_efectivo: noEfectivo,
    efectivo_esperado: ingresos - noEfectivo
  };
};