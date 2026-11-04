export const normalizarReferencia = (referencia) => {
  if (referencia === null || referencia === undefined) return '';

  return String(referencia)
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/^0+/, '');
};

export const compararReferencias = (referenciaPago, referenciaEmpresa) => {
  const pagoNormalizado = normalizarReferencia(referenciaPago);
  const empresaNormalizada = normalizarReferencia(referenciaEmpresa);

  if (!pagoNormalizado || !empresaNormalizada) return 'INCOMPLETO';
  return pagoNormalizado === empresaNormalizada ? 'COINCIDE' : 'DIFERENTE (BANCO)';
};
