import test from 'node:test';
import assert from 'node:assert/strict';
import {
  construirAsociacionOperacionesSql,
  normalizarHoraCaja,
  normalizarTurnoCaja,
  obtenerEtiquetaTurno,
  obtenerRangoTurno,
  obtenerTurnoPorHora,
  validarHorarioRegistroOperacion,
} from '../src/utils/turnoCaja.js';

test('normalizes labels from the UI with case and accents', () => {
  assert.equal(normalizarTurnoCaja('Mañana'), 'MANANA');
  assert.equal(normalizarTurnoCaja('MANANA'), 'MANANA');
  assert.equal(normalizarTurnoCaja('Tarde'), 'TARDE');
  assert.equal(obtenerEtiquetaTurno('manana'), 'Mañana');
  assert.equal(obtenerEtiquetaTurno('TARDE'), 'Tarde');
  assert.equal(obtenerEtiquetaTurno('noche'), null);
});

test('classifies operating hours with a single 2 PM boundary', () => {
  assert.equal(obtenerTurnoPorHora('08:00'), 'MANANA');
  assert.equal(obtenerTurnoPorHora('13:59:59'), 'MANANA');
  assert.equal(obtenerTurnoPorHora('14:00:00'), 'TARDE');
  assert.equal(obtenerTurnoPorHora('14:58:00'), 'TARDE');
  assert.equal(obtenerTurnoPorHora('20:00:00'), 'TARDE');
  assert.equal(obtenerTurnoPorHora('21:17'), 'TARDE');
  assert.equal(obtenerTurnoPorHora('23:59:59'), 'TARDE');
  assert.equal(obtenerTurnoPorHora('07:59:59'), null);
});

test('returns disjoint ranges used by close totals and operation assignment', () => {
  assert.deepEqual(obtenerRangoTurno('Mañana'), {
    inicio: '08:00:00',
    operadorInicio: '>=',
    fin: '14:00:00',
    operadorFin: '<',
  });
  assert.deepEqual(obtenerRangoTurno('Tarde'), {
    inicio: '14:00:00',
    operadorInicio: '>=',
    fin: '23:59:59',
    operadorFin: '<=',
  });
});

test('builds the association update for an evening sale in the afternoon close only', () => {
  const tarde = construirAsociacionOperacionesSql('Tarde');
  const manana = construirAsociacionOperacionesSql('Mañana');
  const fechaOperacion = '2026-10-28';
  const horaOperacion = '21:17:00';

  assert.match(tarde.sql, /c\.id_comprobante = o\.id_comprobante/);
  assert.match(tarde.sql, /o\.fecha = \$2::date/);
  assert.match(tarde.sql, /o\.id_cierre IS NULL/);
  assert.match(tarde.sql, /AT TIME ZONE 'America\/Lima'/);
  assert.deepEqual(
    [tarde.rangoTurno.inicio, tarde.rangoTurno.fin],
    ['14:00:00', '23:59:59'],
  );
  assert.deepEqual(
    [manana.rangoTurno.inicio, manana.rangoTurno.fin],
    ['08:00:00', '14:00:00'],
  );

  const operacionPendiente = {
    fecha: fechaOperacion,
    hora: horaOperacion,
    idCierre: null,
  };
  const cumpleCondiciones = (rango) =>
    operacionPendiente.fecha === fechaOperacion &&
    operacionPendiente.idCierre === null &&
    operacionPendiente.hora >= rango.inicio &&
    (rango.operadorFin === '<' ? operacionPendiente.hora < rango.fin : operacionPendiente.hora <= rango.fin);

  assert.equal(cumpleCondiciones(tarde.rangoTurno), true);
  assert.equal(cumpleCondiciones(manana.rangoTurno), false);
});

test('normalizes receipt time values and rejects malformed values', () => {
  assert.equal(normalizarHoraCaja('2:58 PM'), '14:58:00');
  assert.equal(normalizarHoraCaja('14:58'), '14:58:00');
  assert.equal(normalizarHoraCaja('25:00'), null);
  assert.equal(normalizarHoraCaja('not a time'), null);
});

test('classifies by receipt time without blocking on server time or current close status', () => {
  assert.deepEqual(validarHorarioRegistroOperacion({
    horaActual: '01:22:00',
    horaComprobante: '21:17',
  }), { turno: 'TARDE', hora: '21:17:00' });

  assert.deepEqual(validarHorarioRegistroOperacion({
    horaActual: '21:17:00',
    horaComprobante: '10:00',
  }), { turno: 'MANANA', hora: '10:00:00' });

  assert.deepEqual(validarHorarioRegistroOperacion({
    horaActual: '01:22:00',
  }), { turno: null, hora: '01:22:00' });
});
