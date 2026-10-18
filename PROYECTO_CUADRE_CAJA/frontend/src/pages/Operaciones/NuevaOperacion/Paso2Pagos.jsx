import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import PagoCard from './components/PagoCard';
import api from '../../../lib/api';

export function Paso2Pagos({ comprobante, pagosIniciales, onNext, onBack, onPagosChange }) {
  const [pagos, setPagos] = useState(pagosIniciales || [inicialPagoVacio()]);
  const [medios, setMedios] = useState([]);
  const [loadingMedios, setLoadingMedios] = useState(true);
  const [intentoAvanzar, setIntentoAvanzar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState(null);

  // Cargar medios al montar
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/medios-pago');
        const data = Array.isArray(res) ? res : (res?.data?.data || res?.data || []);
        setMedios(data);
      } catch (err) {
        console.error('Error cargando medios:', err);
        setErrorGeneral('No se pudieron cargar los medios de pago');
      } finally {
        setLoadingMedios(false);
      }
    };
    cargar();
  }, []);

  // Notificar al padre cuando cambia el array de pagos
  useEffect(() => {
    if (onPagosChange) onPagosChange(pagos);
  }, [pagos, onPagosChange]);

  const handlePagoChange = (index, updatedPago) => {
    setPagos(prev => prev.map((p, i) => i === index ? updatedPago : p));
  };

  const handleAgregarPago = () => {
    setPagos(prev => [...prev, inicialPagoVacio()]);
  };

  const handleEliminarPago = (index) => {
    if (pagos.length <= 1) return; 
    setPagos(prev => prev.filter((_, i) => i !== index));
  };

  // Totales
  const totalPagado = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const montoComprobante = Number(comprobante?.monto) || 0;
  const pendiente = montoComprobante - totalPagado;
  const excede = totalPagado > montoComprobante;

  const todosCompletos = pagos.every(p => p.id_medio_pago && Number(p.monto) > 0);

  const handleContinuar = () => {
    if (!todosCompletos || excede) {
      setIntentoAvanzar(true);
      return;
    }
    onNext({ comprobante, pagos });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 text-center">
        Paso 2: Pagos
      </h2>
      <p className="text-slate-500 text-center">
        Registra los pagos recibidos. Puedes dividir el pago en varios medios.
      </p>

      {/* Alerta si hay error en los campos o exceso */}
      {intentoAvanzar && (!todosCompletos || excede) && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-base">
                {excede
                  ? 'El total de pagos excede el monto del comprobante'
                  : 'Complete el medio de pago y el monto en todos los pagos'}
              </p>
              <p className="text-sm text-red-800 mt-1">
                Corrige los datos marcados en rojo antes de continuar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card del comprobante */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Comprobante</p>
            <p className="text-lg font-bold">
              {comprobante.tipo_comprobante} {comprobante.serie}-{comprobante.numero}
            </p>
            <p className="text-sm text-gray-600">Fecha: {comprobante.fecha}</p>
            {comprobante.vendedor && (
              <p className="text-sm text-gray-600">Vendedor: {comprobante.vendedor}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-brand-orange hover:underline"
          >
            Editar
          </button>
        </div>
        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 uppercase">Monto total</p>
          <p className="text-2xl font-bold text-brand-orange">
            S/ {montoComprobante.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="space-y-4">
        {pagos.map((pago, index) => (
          <PagoCard
            key={pago.id}
            index={index}
            pago={pago}
            medios={medios}
            pagos={pagos}
            comprobante={comprobante}
            onPagoChange={(updated) => handlePagoChange(index, updated)}
            onEliminar={() => handleEliminarPago(index)}
            puedeEliminar={pagos.length > 1}
          />
        ))}
      </div>

      {/* Botón agregar pago */}
      <button
        type="button"
        onClick={handleAgregarPago}
        className="w-full py-3 border border-dashed border-gray-300 rounded-lg text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-4 h-4" />
        Agregar otro pago
      </button>

      {/* Card de totales */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">Monto operación</p>
            <p className="text-lg font-bold">S/ {montoComprobante.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total pagado</p>
            <p className="text-lg font-bold">S/ {totalPagado.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Indicador de estado del pago */}
        {totalPagado === 0 ? (
          <div className="rounded-lg p-3 text-center font-medium bg-slate-50 text-slate-500 border border-slate-200">
            Ingresa el monto del pago para continuar
          </div>
        ) : excede ? (
          <div className="rounded-lg p-3 text-center font-bold bg-red-50 text-red-700 border border-red-200">
            EXCESO: S/ {(totalPagado - montoComprobante).toFixed(2)} (No permitido)
          </div>
        ) : pendiente > 0 ? (
          <div className="rounded-lg p-3 text-center font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            PAGO PARCIAL: Faltan S/ {pendiente.toFixed(2)} (Quedará PENDIENTE)
          </div>
        ) : (
          <div className="rounded-lg p-3 text-center font-bold bg-green-50 text-green-700 border border-green-200 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            CUBIERTO AL 100% (Quedará PAGADA)
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex justify-between pt-4">
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
          onClick={handleContinuar}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
        >
          Continuar a confirmación
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function inicialPagoVacio() {
  return {
    id: Date.now() + Math.random(),
    id_medio_pago: null,
    nombre_medio: '',
    es_efectivo: false,
    monto: '',
    referencia: '',
    observacion: '',
    evidencia: null,
  };
}

export default Paso2Pagos;