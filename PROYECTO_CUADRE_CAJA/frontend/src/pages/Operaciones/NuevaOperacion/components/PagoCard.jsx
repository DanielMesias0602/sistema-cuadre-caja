import { Trash2, AlertCircle } from 'lucide-react';
import PagoEvidenciaUploader from './PagoEvidenciaUploader';

export function PagoCard({
  index,
  pago,
  medios,
  pagos,
  comprobante,
  onPagoChange,
  onEliminar,
  puedeEliminar,
}) {
  // Derivar el medio seleccionado desde el padre (NO useState)
  const medioSeleccionado = medios.find(
    m => Number(m.id_medio_pago) === Number(pago.id_medio_pago)
  ) || null;

  const esEfectivo = medioSeleccionado?.es_efectivo === true;

  // Calcular si este pago específico causa exceso
  const montoComprobante = Number(comprobante?.monto) || 0;
  const totalSinEste = pagos
    .filter(p => p.id !== pago.id)
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalConEste = totalSinEste + (Number(pago.monto) || 0);
  const excesoEste = totalConEste > montoComprobante
    ? totalConEste - montoComprobante
    : 0;

  // HANDLERS — todos notifican al padre vía onPagoChange
  const handleMedioChange = (e) => {
    const id = e.target.value === '' ? null : Number(e.target.value);
    const medioObj = medios.find(m => Number(m.id_medio_pago) === id) || null;
    onPagoChange({
      ...pago,
      id_medio_pago: id,
      nombre_medio: medioObj?.nombre || '',
      es_efectivo: medioObj?.es_efectivo || false,
      // limpiar evidencia y referencia si el nuevo medio es efectivo
      ...(medioObj?.es_efectivo ? { evidencia: null, referencia: '' } : {}),
    });
  };

  const handleMontoChange = (e) => {
    onPagoChange({ ...pago, monto: e.target.value });
  };

  const handleReferenciaChange = (e) => {
    onPagoChange({ ...pago, referencia: e.target.value });
  };

  const handleObservacionChange = (e) => {
    onPagoChange({ ...pago, observacion: e.target.value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="font-semibold">Pago #{index + 1}</p>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Fila 1: Medio + Monto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Medio de pago *
          </label>
          <select
            value={String(pago.id_medio_pago || '')}
            onChange={handleMedioChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition"
          >
            <option value="">Seleccionar...</option>
            {medios.map(m => (
              <option key={m.id_medio_pago} value={m.id_medio_pago}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Monto (S/) *
          </label>
          <input
            type="number"
            value={pago.monto || ''}
            onChange={handleMontoChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={`
              w-full px-4 py-2.5 border rounded-lg
              text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 transition
              ${excesoEste > 0
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-brand-orange focus:border-brand-orange'}
            `}
          />
          {excesoEste > 0 && (
            <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Exceso: S/ {excesoEste.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Fila 2: Observación + Referencia (referencia solo si NO es efectivo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {!esEfectivo && (
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Referencia bancaria
            </label>
            <input
              type="text"
              value={pago.referencia || ''}
              onChange={handleReferenciaChange}
              placeholder="Opcional"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition placeholder:text-gray-400"
            />
          </div>
        )}
        <div className={esEfectivo ? 'md:col-span-2' : ''}>
          <label className="block text-sm font-semibold mb-1.5">
            Observación
          </label>
          <input
            type="text"
            value={pago.observacion || ''}
            onChange={handleObservacionChange}
            placeholder="Opcional"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Evidencia: solo si NO es efectivo */}
      {!esEfectivo && medioSeleccionado && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <PagoEvidenciaUploader
            pago={pago}
            onPagoChange={onPagoChange}
          />
        </div>
      )}
    </div>
  );
}

export default PagoCard;
