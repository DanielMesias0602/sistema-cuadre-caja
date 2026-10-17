import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../lib/api';

export function Paso4Confirmacion({ datos, onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegistrar = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Crear comprobante
      const comprobanteResponse = await api.post('/comprobantes', datos.comprobante);
      const comprobanteData = comprobanteResponse.data?.data || comprobanteResponse.data;

      // 2. Crear operación
      const operacionResponse = await api.post('/operaciones', {
        id_comprobante: comprobanteData.id,
        estado_operacion: datos.estado,
        monto_total: parseFloat(datos.comprobante.monto),
      });
      const operacionData = operacionResponse.data?.data || operacionResponse.data;

      // 3. Crear pagos
      for (const pago of datos.pagos) {
        await api.post('/pagos', {
          id_operacion: operacionData.id_operacion,
          id_medio_pago: pago.medio_pago,
          monto: parseFloat(pago.monto),
          referencia_bancaria: pago.referencia || null,
          observacion: pago.observacion || null,
        });
      }

      // 4. Crear evidencia si existe
      if (datos.evidencia) {
        const formDataEvidencia = new FormData();
        formDataEvidencia.append('archivo', datos.evidencia);
        formDataEvidencia.append('id_operacion', operacionData.id_operacion);

        try {
          await api.post('/evidencias', formDataEvidencia, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (evidenciaError) {
          console.warn('No se pudo guardar la evidencia, pero la operación se registró');
        }
      }

      onSuccess(operacionData);
    } catch (err) {
      console.error('Error registrando operación:', err);
      setError(err.response?.data?.message || err.message || 'Error al registrar la operación');
      setLoading(false);
    }
  };

  const totalPagado = datos.pagos.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 4: Confirmación
        </h2>
        <p className="text-slate-500">
          Revisa la información antes de registrar la operación
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Resumen del Comprobante</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Tipo</p>
            <p className="font-semibold text-slate-900">{datos.comprobante.tipo_comprobante}</p>
          </div>
          <div>
            <p className="text-slate-500">Serie-Número</p>
            <p className="font-semibold text-slate-900">
              {datos.comprobante.serie}-{datos.comprobante.numero}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Fecha</p>
            <p className="font-semibold text-slate-900">{datos.comprobante.fecha}</p>
          </div>
          <div>
            <p className="text-slate-500">Monto</p>
            <p className="font-semibold text-slate-900">S/ {parseFloat(datos.comprobante.monto).toFixed(2)}</p>
          </div>
          {datos.comprobante.producto && (
            <div className="col-span-2">
              <p className="text-slate-500">Producto</p>
              <p className="font-semibold text-slate-900">{datos.comprobante.producto}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Pagos</h3>
        <div className="space-y-3">
          {datos.pagos.map((pago, index) => (
            <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Pago #{index + 1}</p>
                  <p className="text-xs text-slate-500">Medio: {pago.medio_pago}</p>
                </div>
                <p className="font-bold text-slate-900">S/ {parseFloat(pago.monto).toFixed(2)}</p>
              </div>
              {pago.referencia && (
                <p className="text-xs text-slate-500 mt-1">Ref: {pago.referencia}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <p className="font-semibold text-slate-700">Total pagado</p>
          <p className="font-bold text-lg text-slate-900">S/ {totalPagado.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Estado de la Operación</h3>
        <div className="flex items-center gap-3">
          {datos.estado === 'PAGADA' ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-500" />
          )}
          <div>
            <p className="font-semibold text-slate-900">{datos.estado}</p>
            <p className="text-sm text-slate-500">
              {datos.estado === 'PAGADA'
                ? 'La operación está completamente pagada'
                : 'La operación tiene un saldo pendiente'}
            </p>
          </div>
        </div>
      </div>

      {datos.evidencia && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800 text-sm font-medium">
            Evidencia adjunta: {datos.evidencia.name || 'Archivo cargado'}
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Registrar operación
            </>
          )}
        </button>
      </div>
    </div>
  );
}
