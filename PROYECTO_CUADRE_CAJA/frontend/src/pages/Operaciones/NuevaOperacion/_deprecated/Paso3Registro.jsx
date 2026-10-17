import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';

export function Paso3Registro({ comprobanteData, onNext, onBack }) {
  const [loadingMedios, setLoadingMedios] = useState(true);
  const [mediosPago, setMediosPago] = useState([]);
  const [pagos, setPagos] = useState([{ medio_pago: '', monto: '', referencia: '', observacion: '' }]);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarMediosPago();
  }, []);

  const cargarMediosPago = async () => {
    setLoadingMedios(true);
    try {
      const response = await api.get('/medios-pago');
      const raw = response.data;
      const lista = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setMediosPago(lista);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('No se pudieron cargar los medios de pago');
      setMediosPago([]);
    } finally {
      setLoadingMedios(false);
    }
  };

  const handlePagoChange = (index, field, value) => {
    const newPagos = [...pagos];
    newPagos[index][field] = value;
    setPagos(newPagos);
  };

  const agregarPago = () => {
    setPagos([...pagos, { medio_pago: '', monto: '', referencia: '', observacion: '' }]);
  };

  const eliminarPago = (index) => {
    if (pagos.length > 1) {
      setPagos(pagos.filter((_, i) => i !== index));
    }
  };

  const montoOperacion = parseFloat(comprobanteData?.monto) || 0;
  const totalPagado = pagos.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0);
  const diferencia = montoOperacion - totalPagado;

  const validarFormulario = () => {
    // No validar campos del comprobante porque ya están confirmados en Paso 2

    if (totalPagado > montoOperacion) {
      setError('El total de pagos no puede exceder el monto de la operación');
      return false;
    }

    const pagosValidos = pagos.every((pago) => pago.medio_pago && pago.monto);
    if (!pagosValidos) {
      setError('Completa todos los campos de los pagos');
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validarFormulario()) return;

    const estadoOperacion = diferencia === 0 ? 'PAGADA' : 'PENDIENTE';

    onNext({
      comprobante: comprobanteData,
      pagos,
      estado: estadoOperacion,
      evidencia: comprobanteData?.evidencia,
    });
  };

  const handleEditarComprobante = () => {
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 3: Registro de Pagos
        </h2>
        <p className="text-slate-500">
          Registra los pagos correspondientes al comprobante
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Card de resumen del comprobante (solo lectura) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-lg">Comprobante confirmado</h3>
          <button
            type="button"
            onClick={handleEditarComprobante}
            className="text-sm text-brand-orange hover:text-brand-orange-hover font-semibold transition"
          >
            Editar comprobante
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Tipo y número
            </p>
            <p className="text-lg font-bold text-slate-900">
              {comprobanteData?.tipo_comprobante || 'Comprobante'} {comprobanteData?.serie || ''}-{comprobanteData?.numero || ''}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Fecha: {comprobanteData?.fecha || 'Pendiente'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Monto total
            </p>
            <p className="text-2xl font-bold text-brand-orange">
              S/ {montoOperacion.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-lg">Pagos</h3>
          <button
            type="button"
            onClick={agregarPago}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg font-semibold text-sm transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Agregar pago
          </button>
        </div>

        {pagos.map((pago, index) => (
          <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-slate-700">Pago #{index + 1}</span>
              {pagos.length > 1 && (
                <button
                  type="button"
                  onClick={() => eliminarPago(index)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Medio de pago *
                </label>
                {loadingMedios ? (
                  <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                    Cargando...
                  </div>
                ) : (
                  <select
                    value={pago.medio_pago}
                    onChange={(e) => handlePagoChange(index, 'medio_pago', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {Array.isArray(mediosPago) && mediosPago.map((medio) => (
                      <option key={medio.id_medio_pago || medio.id} value={medio.id_medio_pago || medio.id}>
                        {medio.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Monto (S/) *
                </label>
                <input
                  type="number"
                  value={pago.monto}
                  onChange={(e) => handlePagoChange(index, 'monto', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Referencia bancaria
                </label>
                <input
                  type="text"
                  value={pago.referencia}
                  onChange={(e) => handlePagoChange(index, 'referencia', e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Observación
                </label>
                <input
                  type="text"
                  value={pago.observacion}
                  onChange={(e) => handlePagoChange(index, 'observacion', e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Total pagado</p>
            <p className="text-lg font-bold text-slate-900">S/ {totalPagado.toFixed(2)}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm text-slate-600">Monto operación</p>
            <p className="text-lg font-bold text-slate-900">S/ {montoOperacion.toFixed(2)}</p>
          </div>
        </div>

        {diferencia > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-yellow-800 text-sm font-medium">
              Pendiente de pago: S/ {diferencia.toFixed(2)}
            </p>
          </div>
        )}

        {diferencia < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-red-800 text-sm font-medium">
              Exceso de pago: S/ {Math.abs(diferencia).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
