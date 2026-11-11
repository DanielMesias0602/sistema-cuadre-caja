export const construirObservacionesVale = (observacion) => {
  const observacionBase = String(observacion ?? '').trim();
  const observacionEfectivo = observacionBase
    .replace(/\[VALE\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
  const observacionVirtual = /\[VALE\]/i.test(observacionBase)
    ? observacionBase
    : [observacionBase, '[VALE]'].filter(Boolean).join(' ');

  return { observacionEfectivo, observacionVirtual };
};
