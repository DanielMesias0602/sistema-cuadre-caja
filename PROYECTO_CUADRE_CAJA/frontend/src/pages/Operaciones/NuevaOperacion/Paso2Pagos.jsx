import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Receipt } from 'lucide-react';
import PagoCard from './components/PagoCard';
import api from '../../../lib/api';

export function Paso2Pagos({ comprobante, pagosIniciales, onNext, onBack, onPagosChange }) {
  // FIX: si pagosIniciales es [] (array vacío), inicializar con un pago vacío
  const [pagos, setPagos] = useState(
    Array.isArray(pagosIniciales) && pagosIniciales.length > 0
      ? pagosIniciales
      : [inicialPagoVacio()]
  );
  const [medios, setMedios] = useState([]);
  const [loadingMedios, setLoadingMedios] = useState(true);
  const [intentoAvanzar, setIntentoAvanzar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState(null);

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

  const todosCompletos = pagos.length > 0 && pagos.every(p => p.id_medio_pago && Number(p.monto) > 0);

  // FIX: detectar los 3 tipos de error por separado
  const sinPagos = pagos.length === 0;
  const pagosIncompletos = pagos.length > 0 && !todosCompletos;
  const hayExceso = excede;

  const hayError = intentoAvanzar && (sinPagos || pagosIncompletos || hayExceso);

  const handleContinuar = () => {
    if (sinPagos || pagosIncompletos || hayExceso) {
      setIntentoAvanzar(true);
      return;
    }
    onNext({ comprobante, pagos });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-2xl font-bold text-slate-900 text-center">
        Paso 2: Pagos
      </h2>
      <p className="text-xs sm:text-base text-slate-500 text-center px-2">
        Registra los pagos recibidos. Puedes dividir el pago en varios medios.
      </p>

      {/* ALERTA — 3 mensajes diferentes según el error */}
      {hayError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-900 p-3 sm:p-4 rounded-lg shadow-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {sinPagos ? (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    Debes registrar al menos un pago
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 mt-1">
                    Haz clic en <strong>"Agregar otro pago"</strong> o completa el pago vacío que aparece en pantalla.
                  </p>
                </>
              ) : hayExceso ? (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    El total de pagos excede el monto del comprobante
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 mt-1">
                    Diferencia: S/ {(totalPagado - montoComprobante).toFixed(2)}. Ajusta el monto de los pagos.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    Completa todos los pagos antes de continuar
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 mt-1">
                    Cada pago debe tener <strong>medio de pago</strong> y <strong>monto mayor a 0</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error general (medios no cargados) */}
      {errorGeneral && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 text-amber-800 text-xs sm:text-sm">
          {errorGeneral}
        </div>
      )}

      {/* Card del comprobante */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Comprobante</p>
            <p className="text-sm sm:text-lg font-bold break-words">
              {comprobante.tipo_comprobante} {comprobante.serie}-{comprobante.numero}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">Fecha: {comprobante.fecha}</p>
            {comprobante.vendedor && (
              <p className="text-xs sm:text-sm text-gray-600">Vendedor: {comprobante.vendedor}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs sm:text-sm text-brand-orange hover:underline flex-shrink-0"
          >
            Editar
          </button>
        </div>
        <div className="border-t pt-2 sm:pt-3">
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase">Monto total</p>
          <p className="text-lg sm:text-2xl font-bold text-brand-orange tabular-nums">
            S/ {montoComprobante.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Estado "sin pagos" — tarjeta vacía con CTA */}
      {sinPagos && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700 text-sm sm:text-base mb-1">
            No hay pagos registrados
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            Agrega al menos un pago para continuar con la confirmación.
          </p>
          <button
            type="button"
            onClick={handleAgregarPago}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Registrar primer pago
          </button>
        </div>
      )}

      {/* Lista de pagos */}
      {pagos.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
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
              mostrarError={intentoAvanzar && (!pago.id_medio_pago || !Number(pago.monto))}
            />
          ))}
        </div>
      )}

      {/* Botón agregar pago (solo si ya hay al menos uno) */}
      {pagos.length > 0 && (
        <button
          type="button"
          onClick={handleAgregarPago}
          className="w-full py-2.5 sm:py-3 border border-dashed border-gray-300 rounded-lg text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar otro pago
        </button>
      )}

      {/* Card de totales */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Monto operación</p>
            <p className="text-base sm:text-lg font-bold tabular-nums">S/ {montoComprobante.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-gray-500">Total pagado</p>
            <p className="text-base sm:text-lg font-bold tabular-nums">S/ {totalPagado.toFixed(2)}</p>
          </div>
        </div>

        {totalPagado === 0 ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-medium bg-slate-50 text-slate-500 border border-slate-200 text-xs sm:text-sm">
            Ingresa el monto del pago para continuar
          </div>
        ) : excede ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm">
            EXCESO: S/ {(totalPagado - montoComprobante).toFixed(2)} (No permitido)
          </div>
        ) : pendiente > 0 ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>PAGO PARCIAL: Faltan S/ {pendiente.toFixed(2)}</span>
          </div>
        ) : (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-green-50 text-green-700 border border-green-200 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>CUBIERTO AL 100% (Quedará PAGADA)</span>
          </div>
        )}
      </div>

      {/* Nav — Continuar arriba en móvil */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 pt-2 sm:pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold text-sm transition"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleContinuar}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm transition shadow-md ${
            hayError
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-brand-orange hover:bg-brand-orange-hover text-white'
          }`}
        >
          Continuar a confirmación
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
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