import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { construirPagoConfirmado } from './pagoCard.utils.js';

describe('construirPagoConfirmado', () => {
  it('uses the latest manual edits for amount, reference, and date', () => {
    const pago = {
      monto: '10',
      referencia: 'OCR-REF',
      fecha_operacion: '2026-11-11',
      evidencia: {
        datosOCR: {
          monto: '25',
          referencia_bancaria: 'OCR-REF',
          fecha_operacion: '11/11/2026',
        },
      },
    };

    const confirmado = construirPagoConfirmado(pago, false, {
      monto: '14.50',
      referencia: 'REF-CORREGIDA',
      fecha_operacion: '12/11/2026',
    });

    assert.equal(confirmado.monto, '14.50');
    assert.equal(confirmado.referencia, 'REF-CORREGIDA');
    assert.equal(confirmado.fecha_operacion, '2026-11-12');
    assert.equal(confirmado.evidencia.confirmada, true);
  });

  it('uses OCR values when the user has not supplied values', () => {
    const confirmado = construirPagoConfirmado({
      monto: '',
      referencia: '',
      fecha_operacion: '',
      evidencia: {
        datosOCR: {
          monto: '25.00',
          referencia_bancaria: 'OCR-REF',
          fecha_operacion: '11/11/2026',
        },
      },
    }, false);

    assert.equal(confirmado.monto, '25.00');
    assert.equal(confirmado.referencia, 'OCR-REF');
    assert.equal(confirmado.fecha_operacion, '2026-11-11');
  });

  it('clears invalid OCR dates instead of saving them as a valid date', () => {
    const confirmado = construirPagoConfirmado({
      monto: '',
      referencia: '',
      fecha_operacion: '',
      evidencia: {
        datosOCR: { fecha_operacion: '11/11/261' },
      },
    }, false);

    assert.equal(confirmado.fecha_operacion, '');
  });
});
