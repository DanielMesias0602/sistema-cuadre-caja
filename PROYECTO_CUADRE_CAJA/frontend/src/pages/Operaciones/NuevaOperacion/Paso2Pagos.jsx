import { useState, useEffect } from 'react';
import { Plus, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Receipt } from 'lucide-react';
import PagoCard from './components/PagoCard';
import api from '../../../lib/api';
import { normalizarFechaISO } from '../../../utils/fecha';

const valeTotalNoCuadra = (pago) => {
  const monto = Number(pago.monto);
  const montoEfectivo = Number(pago.monto_efectivo);
  const montoVirtual = Number(pago.monto_virtual);
  if (
    !Number.isFinite(monto) ||
    !Number.isFinite(montoEfectivo) ||
    !Number.isFinite(montoVirtual) ||
    monto <= 0 ||
    montoEfectivo <= 0 ||
    montoVirtual <= 0
  ) {
    return false;
  }

  const totalCentimos = Math.round((monto + Number.EPSILON) * 100);
  const partesCentimos = Math.round((montoEfectivo + Number.EPSILON) * 100)
    + Math.round((montoVirtual + Number.EPSILON) * 100);
  return totalCentimos !== partesCentimos;
};

export function Paso2Pagos({ comprobante, pagosIniciales, onNext, onBack, onPagosChange }) {
  // FIX: si pagosIniciales es [] (array vacío), inicializar con un pago vacío
  const [pagos, setPagos] = useState(
    Array.isArray(pagosIniciales) && pagosIniciales.length > 0
      ? pagosIniciales
      : [inicialPagoVacio()]
  );
  const [medios, setMedios] = useState([]);
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

  const handlePrepararOcr = (index) => {
    setPagos((prev) => {
      const pagoActual = prev[index];
      if (!pagoActual) return prev;

      return prev.map((pago, pagoIndex) => (
        pagoIndex === index
        || (
          pagoActual.grupo_depositos_id
          && pago.grupo_depositos_id === pagoActual.grupo_depositos_id
        )
          ? {
            ...pago,
            monto: '',
            referencia: '',
            fecha_operacion: '',
            fecha_operacion_editada: false,
            campos_editados: {},
            evidencia: null,
          }
          : pago
      ));
    });
  };

  const handleCantidadDepositosChange = (index, cantidadSeleccionada) => {
    const cantidad = Number(cantidadSeleccionada);
    if (!Number.isInteger(cantidad) || cantidad < 1) return;

    setPagos((prev) => {
      const pagoActual = prev[index];
      if (!pagoActual) return prev;

      const grupoId = pagoActual.grupo_depositos_id || `depositos-${pagoActual.id}`;
      const indicesGrupo = prev.reduce((indices, pago, pagoIndex) => {
        if (
          pagoIndex === index
          || pago.grupo_depositos_id === grupoId
        ) {
          indices.push(pagoIndex);
        }
        return indices;
      }, []);
      const inicioGrupo = Math.min(...indicesGrupo);
      const grupoExistente = indicesGrupo.map((pagoIndex) => prev[pagoIndex]);
      const pagoBase = grupoExistente[0] || pagoActual;
      const nuevosPagos = Array.from({ length: cantidad }, (_, depositoIndex) => ({
        ...(
          grupoExistente[depositoIndex]
          || {
            ...pagoBase,
            id: Date.now() + Math.random(),
            monto: '',
            referencia: '',
            fecha_operacion: '',
          }
        ),
        cantidad_depositos: cantidad,
        grupo_depositos_id: grupoId,
        grupo_depositos_index: depositoIndex,
      }));
      const indicesSet = new Set(indicesGrupo);
      const pagosRestantes = prev.filter((_, pagoIndex) => !indicesSet.has(pagoIndex));

      return [
        ...pagosRestantes.slice(0, inicioGrupo),
        ...nuevosPagos,
        ...pagosRestantes.slice(inicioGrupo),
      ];
    });
  };

  const handleDepositosDetectados = ({ index, depositos, datosOCR, evidencia }) => {
    setPagos((prev) => {
      const pagoBase = prev[index];
      if (!pagoBase) return prev;

      const grupoId = pagoBase.grupo_depositos_id || `depositos-${pagoBase.id}`;
      const indicesGrupo = prev.reduce((indices, pago, pagoIndex) => {
        if (
          pagoIndex === index
          || pago.grupo_depositos_id === grupoId
        ) {
          indices.push(pagoIndex);
        }
        return indices;
      }, []);
      const inicioGrupo = Math.min(...indicesGrupo);
      const grupoExistente = indicesGrupo.map((pagoIndex) => prev[pagoIndex]);
      const cantidad = Math.max(
        1,
        Number.parseInt(pagoBase.cantidad_depositos, 10) || depositos.length
      );
      const nuevosPagos = Array.from({ length: cantidad }, (_, depositoIndex) => {
        const pagoExistente = grupoExistente[depositoIndex] || pagoBase;
        const deposito = depositos[depositoIndex];
        const monto = Number(deposito?.monto);

        return {
          ...pagoExistente,
          id: pagoExistente.id || Date.now() + Math.random(),
          monto: Number.isFinite(monto) && monto > 0
            ? monto.toFixed(2)
            : pagoExistente.monto || '',
          referencia: deposito?.referencia
            || deposito?.operacion
            || datosOCR?.referencia_bancaria
            || pagoExistente.referencia
            || '',
          fecha_operacion: normalizarFechaISO(
            deposito?.fecha_operacion
              || datosOCR?.fecha_operacion
              || pagoExistente.fecha_operacion
              || ''
          ),
          fecha_operacion_editada: false,
          beneficiario: pagoExistente.beneficiario || datosOCR?.destinatario || '',
          cuenta_destino: pagoExistente.cuenta_destino || datosOCR?.cuenta_destino || '',
          cantidad_depositos: cantidad,
          grupo_depositos_id: grupoId,
          grupo_depositos_index: depositoIndex,
          evidencia: {
            ...evidencia,
            datosOCR: datosOCR || {},
          },
        };
      });
      const indicesSet = new Set(indicesGrupo);
      const pagosRestantes = prev.filter((_, pagoIndex) => !indicesSet.has(pagoIndex));

      return [
        ...pagosRestantes.slice(0, inicioGrupo),
        ...nuevosPagos,
        ...pagosRestantes.slice(inicioGrupo),
      ];
    });
  };

  const handleAgregarPago = () => {
    setPagos(prev => [...prev, inicialPagoVacio()]);
  };

  const handleEliminarPago = (index) => {
    if (pagos.length <= 1) return;
    setPagos((prev) => {
      const pagoEliminado = prev[index];
      const pagosRestantes = prev.filter((_, pagoIndex) => pagoIndex !== index);
      if (!pagoEliminado?.grupo_depositos_id) return pagosRestantes;

      const indicesGrupo = pagosRestantes.reduce((indices, pago, pagoIndex) => {
        if (pago.grupo_depositos_id === pagoEliminado.grupo_depositos_id) {
          indices.push(pagoIndex);
        }
        return indices;
      }, []);
      return pagosRestantes.map((pago, pagoIndex) => (
        pago.grupo_depositos_id === pagoEliminado.grupo_depositos_id
          ? {
            ...pago,
            cantidad_depositos: indicesGrupo.length,
            grupo_depositos_index: indicesGrupo.indexOf(pagoIndex),
          }
          : pago
      ));
    });
  };

  // Totales
  const totalPagado = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const montoComprobante = Number(comprobante?.monto) || 0;
  const pendiente = montoComprobante - totalPagado;
  const excede = totalPagado > montoComprobante;
  const hayDiferencia = totalPagado > 0
    && Math.round(totalPagado * 100) !== Math.round(montoComprobante * 100);

  const todosCompletos = pagos.length > 0 && pagos.every((p) => {
    const monto = Number(p.monto);
    if (!p.id_medio_pago || !Number.isFinite(monto) || monto <= 0) return false;
    if (String(p.nombre_medio || '').trim().toLowerCase() !== 'vale') return true;
    const montoEfectivo = Number(p.monto_efectivo);
    const montoVirtual = Number(p.monto_virtual);
    return Number.isFinite(montoEfectivo) && montoEfectivo > 0 &&
      Number.isFinite(montoVirtual) && montoVirtual > 0 &&
      Number(p.id_medio_virtual) > 0 &&
      !valeTotalNoCuadra(p);
  });

  // FIX: detectar los 3 tipos de error por separado
  const sinPagos = pagos.length === 0;
  const pagosIncompletos = pagos.length > 0 && !todosCompletos;
  const hayExceso = excede;

  const hayError = intentoAvanzar && (
    sinPagos || pagosIncompletos || hayExceso || hayDiferencia
  );

  const handleContinuar = () => {
    if (sinPagos || pagosIncompletos || hayExceso || hayDiferencia) {
      setIntentoAvanzar(true);
      return;
    }
    onNext({ comprobante, pagos });
  };

  return (
    <div className="space-y-4 sm:space-y-6 dark:bg-slate-900">
      <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
        Paso 2: Pagos
      </h2>
      <p className="text-xs sm:text-base text-slate-500 dark:text-slate-400 text-center px-2">
        Registra los pagos recibidos. Puedes dividir el pago en varios medios.
      </p>

      {/* ALERTA — 3 mensajes diferentes según el error */}
      {hayError && (
        <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-red-900 dark:text-red-200 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-none">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {sinPagos ? (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    Debes registrar al menos un pago
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1">
                    Haz clic en <strong>"Agregar otro pago"</strong> o completa el pago vacío que aparece en pantalla.
                  </p>
                </>
              ) : hayExceso ? (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    El total de pagos excede el monto del comprobante
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1">
                    Diferencia: S/ {(totalPagado - montoComprobante).toFixed(2)}. Ajusta el monto de los pagos.
                  </p>
                </>
              ) : hayDiferencia ? (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    El total de pagos debe coincidir con el monto del comprobante
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1">
                    Diferencia: S/ {Math.abs(pendiente).toFixed(2)}. Ajusta los montos antes de continuar.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm sm:text-base">
                    Completa todos los pagos antes de continuar
                  </p>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1">
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
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 sm:p-4 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
          {errorGeneral}
        </div>
      )}

      {/* Card del comprobante */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-600 p-3 sm:p-6">
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase">Comprobante</p>
            <p className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 break-words">
              {comprobante.tipo_comprobante} {comprobante.serie}-{comprobante.numero}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Fecha: {comprobante.fecha}</p>
            {comprobante.vendedor && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">Vendedor: {comprobante.vendedor}</p>
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
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 sm:pt-3">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase">Monto total</p>
          <p className="text-lg sm:text-2xl font-bold text-brand-orange tabular-nums">
            S/ {montoComprobante.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Estado "sin pagos" — tarjeta vacía con CTA */}
      {sinPagos && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm sm:text-base mb-1">
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
              onPrepararOcr={() => handlePrepararOcr(index)}
              onCantidadDepositosChange={(cantidad) => (
                handleCantidadDepositosChange(index, cantidad)
              )}
              onDepositosDetectados={handleDepositosDetectados}
              onEliminar={() => handleEliminarPago(index)}
              puedeEliminar={pagos.length > 1}
              mostrarError={intentoAvanzar && (
                !pago.id_medio_pago ||
                !Number(pago.monto) ||
                (String(pago.nombre_medio || '').trim().toLowerCase() === 'vale' &&
                  (!Number(pago.monto_efectivo) || !Number(pago.monto_virtual) ||
                    !Number(pago.id_medio_virtual)))
              )}
              errorMontoVale={intentoAvanzar && (
                String(pago.nombre_medio || '').trim().toLowerCase() === 'vale' &&
                valeTotalNoCuadra(pago)
              )}
            />
          ))}
        </div>
      )}

      {/* Botón agregar pago (solo si ya hay al menos uno) */}
      {pagos.length > 0 && (
        <button
          type="button"
          onClick={handleAgregarPago}
          className="min-h-11 w-full border border-dashed border-gray-300 dark:border-slate-700 rounded-lg py-2.5 sm:py-3 text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-slate-100 hover:border-gray-400 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar otro pago
        </button>
      )}

      {/* Card de totales */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-600 p-3 sm:p-6">
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Monto operación</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">S/ {montoComprobante.toFixed(2)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total pagado</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">S/ {totalPagado.toFixed(2)}</p>
          </div>
        </div>

        {totalPagado === 0 ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-medium bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
            Ingresa el monto del pago para continuar
          </div>
        ) : excede ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-xs sm:text-sm">
            EXCESO: S/ {(totalPagado - montoComprobante).toFixed(2)} (No permitido)
          </div>
        ) : pendiente > 0 ? (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center gap-2 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>PAGO PARCIAL: Faltan S/ {pendiente.toFixed(2)}</span>
          </div>
        ) : (
          <div className="rounded-lg p-2.5 sm:p-3 text-center font-bold bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800/60 flex items-center justify-center gap-2 text-xs sm:text-sm">
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
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 rounded-xl font-semibold text-sm transition"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleContinuar}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm transition shadow-md dark:shadow-none ${
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
    monto_efectivo: '',
    monto_virtual: '',
    id_medio_virtual: null,
    cantidad_depositos: 1,
    referencia: '',
    observacion: '',
    evidencia: null,
  };
}

export default Paso2Pagos;