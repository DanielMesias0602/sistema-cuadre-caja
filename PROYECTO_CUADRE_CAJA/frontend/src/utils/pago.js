const obtenerMedioPago = (pago) =>
  String(pago?.medio_pago || pago?.nombre_medio || '').trim().toLowerCase();

export const esPagoEfectivo = (pago) =>
  pago?.es_efectivo === true || obtenerMedioPago(pago).includes('efectivo');

export const esPagoVale = (pago) =>
  !esPagoEfectivo(pago) &&
  (
    /\[VALE\]/i.test(String(pago?.observacion || '')) ||
    obtenerMedioPago(pago) === 'vale'
  );
