import { normalizarFechaISO } from '../../../../utils/fecha.js';

export const construirPagoConfirmado = (pago, esVale, cambiosPendientes = {}) => {
  const datos = pago.evidencia?.datosOCR || {};
  const tieneCambioPendiente = (campo) => Object.hasOwn(cambiosPendientes, campo);
  const campoEditado = (campo) => tieneCambioPendiente(campo) || pago.campos_editados?.[campo];
  const valorCampo = (campo, actual, detectado = '') => (
    campoEditado(campo)
      ? tieneCambioPendiente(campo) ? cambiosPendientes[campo] : actual
      : actual || detectado || ''
  );
  const montoDetectado = datos.monto;
  const montoActual = campoEditado('monto')
    ? tieneCambioPendiente('monto')
      ? cambiosPendientes.monto
      : pago.monto
    : pago.monto !== '' && pago.monto != null
      ? pago.monto
      : esVale
        ? ''
        : montoDetectado ?? '';
  const fechaEditada = Boolean(
    pago.fecha_operacion_editada || campoEditado('fecha_operacion')
  );

  return {
    ...pago,
    evidencia: { ...pago.evidencia, confirmada: true },
    monto: montoActual,
    referencia: valorCampo(
      'referencia',
      pago.referencia,
      datos.referencia_bancaria || datos.numero_operacion
    ),
    fecha_operacion: normalizarFechaISO(
      fechaEditada
        ? valorCampo('fecha_operacion', pago.fecha_operacion)
        : pago.fecha_operacion || datos.fecha_operacion || ''
    ),
    fecha_operacion_editada: fechaEditada,
    beneficiario: valorCampo('beneficiario', pago.beneficiario, datos.destinatario),
    banco: valorCampo('banco', pago.banco, datos.aplicacion_banco || datos.banco),
    hora_operacion: valorCampo('hora_operacion', pago.hora_operacion, datos.hora_operacion),
    cuenta_destino: valorCampo('cuenta_destino', pago.cuenta_destino, datos.cuenta_destino),
    observacion: pago.observacion || '',
  };
};
