export const normalizarFechaISO = (valor) => {
  const texto = String(valor || '').trim();
  if (!texto) return '';

  const coincidenciaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const coincidenciaLocal = texto.match(/^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})$/);
  let anio;
  let mes;
  let dia;

  if (coincidenciaISO) {
    [, anio, mes, dia] = coincidenciaISO;
  } else if (coincidenciaLocal) {
    [, dia, mes, anio] = coincidenciaLocal;
    if (anio.length === 2) anio = `20${anio}`;
  } else {
    return '';
  }

  const fechaUTC = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  if (
    Number.isNaN(fechaUTC.getTime())
    || fechaUTC.getUTCFullYear() !== Number(anio)
    || fechaUTC.getUTCMonth() !== Number(mes) - 1
    || fechaUTC.getUTCDate() !== Number(dia)
  ) {
    return '';
  }

  return `${anio}-${mes}-${dia}`;
};
