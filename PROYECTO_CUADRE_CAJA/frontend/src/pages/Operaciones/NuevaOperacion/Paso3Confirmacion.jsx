import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../../lib/api';

export function Paso3Confirmacion({ comprobante, pagos, onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const montoOperacion = parseFloat(comprobante?.monto) || 0;
  const totalPagado = pagos.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0);
  const pendiente = montoOperacion - totalPagado;
  const estadoOperacion = pendiente === 0 ? 'PAGADA' : 'PENDIENTE';

  const handleRegistrar = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calcular total pagado y estado
      const totalPagado = pagos.reduce((sum, pago) => sum + (Number(pago.monto) || 0), 0);
      const montoComprobante = Number(comprobante.monto) || 0;
      const pendiente = montoComprobante - totalPagado;
      const estadoOperacion = pendiente <= 0 ? 'PAGADA' : 'PENDIENTE';

      // Convertir fecha a formato ISO (YYYY-MM-DD)
      const fechaISO = comprobante.fecha.includes('/')
        ? comprobante.fecha.split('/').reverse().join('-')
        : comprobante.fecha;

      // 1. Crear comprobante
      const comprobanteResponse = await api.post('/comprobantes', {
        tipo_comprobante: comprobante.tipo_comprobante,
        serie: comprobante.serie,
        numero: comprobante.numero,
        fecha: fechaISO,
        monto: montoComprobante,
      });

      const idComprobante = comprobanteResponse.data?.data?.id_comprobante || comprobanteResponse.data?.id_comprobante;

      if (!idComprobante) {
        throw new Error('No se pudo obtener el ID del comprobante');
      }

      // 2. Crear operación
      const operacionResponse = await api.post('/operaciones', {
        id_comprobante: idComprobante,
        monto: montoComprobante,
        fecha: fechaISO,
        estado: estadoOperacion,
        observacion: '',
      });

      const idOperacion = operacionResponse.data?.data?.id_operacion || operacionResponse.data?.id_operacion;

      if (!idOperacion) {
        throw new Error('No se pudo obtener el ID de la operación');
      }

      // 3. Crear pagos
      for (const pago of pagos) {
        await api.post('/pagos', {
          id_operacion: idOperacion,
          id_medio_pago: pago.id_medio_pago,
          monto: pago.monto,
          referencia_bancaria: pago.referencia || null,
          observacion: pago.observacion || null,
          estado: 'REGISTRADO',
        });

        // 4. Crear evidencia si el pago tiene una
        if (pago.evidencia) {
          const formData = new FormData();
          formData.append('archivo', pago.evidencia.blob);
          formData.append('id_operacion', idOperacion);
          formData.append('tipo_evidencia', pago.evidencia.origen || 'CLIENTE');
          formData.append('fecha_evidencia', new Date().toISOString().split('T')[0]);
          formData.append('observacion', '');

          await api.post('/evidencias', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err) {
      console.error('Error registrando operación:', err);
      setError(err.response?.data?.message || err.message || 'Error al registrar la operación');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Operación registrada!</h2>
        <p className="text-slate-500">Redirigiendo a operaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 3: Confirmación
        </h2>
        <p className="text-slate-500">
          Revisa los datos antes de registrar la operación
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium text-sm mb-2">{error}</p>
            <button
              type="button"
              onClick={handleRegistrar}
              className="text-sm text-red-700 underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Card del comprobante */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Comprobante confirmado</h3>
        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-900">
            {comprobante?.tipo_comprobante || 'Comprobante'} {comprobante?.serie || ''}-{comprobante?.numero || ''}
          </p>
          <p className="text-sm text-slate-600">
            Fecha: {comprobante?.fecha || 'Pendiente'}
          </p>
          {comprobante?.vendedor && (
            <p className="text-sm text-slate-600">
              Vendedor: {comprobante.vendedor}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Monto total
            </p>
            <p className="text-2xl font-bold text-brand-orange">
              S/ {montoOperacion.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="space-y-4">
        {pagos.map((pago, index) => {
          const datosDestino = pago.evidencia?.datosOCR || {};
          const tieneEvidencia = pago.evidencia?.confirmada;

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-900">Pago #{index + 1}</h4>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Medio de pago</p>
                    <p className="font-semibold text-slate-900">{pago.nombre_medio || `Medio #${pago.id_medio_pago}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Monto</p>
                    <p className="font-semibold text-slate-900">S/ {parseFloat(pago.monto).toFixed(2)}</p>
                  </div>
                </div>

                {pago.referencia && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Referencia bancaria</p>
                    <p className="font-mono text-slate-900">{pago.referencia}</p>
                  </div>
                )}

                {pago.observacion && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Observación</p>
                    <p className="text-slate-900">{pago.observacion}</p>
                  </div>
                )}

                {tieneEvidencia && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Origen evidencia</p>
                        <p className="text-slate-900">{pago.evidencia.origen}</p>
                      </div>
                    </div>

                    {/* DESTINO */}
                    {(datosDestino.aplicacion_banco || datosDestino.destinatario || datosDestino.cuenta_destino) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <p className="text-xs text-blue-800 uppercase font-semibold mb-2">
                          DESTINO
                        </p>
                        <div className="space-y-1 text-sm">
                          {datosDestino.aplicacion_banco && (
                            <p>
                              <span className="text-blue-600">Banco:</span>{' '}
                              <span className="font-semibold">{datosDestino.aplicacion_banco}</span>
                            </p>
                          )}
                          {datosDestino.destinatario && (
                            <p>
                              <span className="text-blue-600">Beneficiario:</span>{' '}
                              <span className="font-semibold">{datosDestino.destinatario}</span>
                            </p>
                          )}
                          {datosDestino.cuenta_destino && (
                            <p>
                              <span className="text-blue-600">Cuenta:</span>{' '}
                              <span className="font-semibold">{datosDestino.cuenta_destino}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Miniatura */}
                    {pago.evidencia?.imagenBase64 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Evidencia</p>
                        <img
                          src={pago.evidencia.imagenBase64}
                          alt="Evidencia"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totales */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Monto operación</p>
            <p className="text-lg font-bold text-slate-900">S/ {montoOperacion.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total pagado</p>
            <p className="text-lg font-bold text-slate-900">S/ {totalPagado.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Pendiente</p>
            <p className="text-lg font-bold text-slate-900">S/ {pendiente.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600 mb-1">Estado:</p>
          <p className={`text-lg font-bold ${pendiente === 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {estadoOperacion}
          </p>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              Registrar operación
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
