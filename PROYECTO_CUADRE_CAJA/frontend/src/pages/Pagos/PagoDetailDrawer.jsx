import { useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ExternalLink,
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
  User,
  Calendar,
  ShieldCheck,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import api from '../../lib/api';

export function PagoDetailDrawer({ selectedPago, onClose, onVerificado }) {
  const open = selectedPago !== null;
  const lastPago = useRef(selectedPago);
  const justOpened = useRef(false);
  if (selectedPago) lastPago.current = selectedPago;
  const pago = lastPago.current;
  const closeRef = useRef(null);

  const [marcando, setMarcando] = useState(false);
  const [estadoLocal, setEstadoLocal] = useState(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsImageOpen(false);
      setZoom(false);
      setEstadoLocal(null);
      return;
    }
    // Solo reseteamos el estado local cuando el panel se acaba de abrir (no en cada actualización de selectedPago)
    if (!justOpened.current) {
      justOpened.current = true;
      setEstadoLocal(selectedPago?.estado || 'PENDIENTE');
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isImageOpen) {
          setIsImageOpen(false);
          setZoom(false);
        } else {
          onClose();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      justOpened.current = false;
    };
  }, [open, selectedPago, onClose, isImageOpen]);

  if (!pago) return null;

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const estadoActual = estadoLocal || pago.estado || 'PENDIENTE';
  const isVerificado =
    String(estadoActual).toUpperCase() === 'VERIFICADO' ||
    String(estadoActual).toUpperCase() === 'VERIFICADA' ||
    String(estadoActual).toUpperCase() === 'COMPLETADO';

  const urlEvidencia = pago.evidencia_url
    ? pago.evidencia_url.startsWith('http')
      ? pago.evidencia_url
      : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${pago.evidencia_url}`
    : null;

  const handleMarcarVerificado = async () => {
    const estadoAnterior = estadoActual;
    
    // Actualización optimista: cambiamos el estado local inmediatamente
    setEstadoLocal('VERIFICADO');
    
    try {
      setMarcando(true);
      if (pago.id_pago) {
        try {
          // Enviamos el objeto completo con todos los campos
          await api.put(`/pagos/${pago.id_pago}`, {
            id_medio_pago: pago.id_medio_pago || pago.id_medio,
            monto: Number(pago.monto),
            referencia_bancaria: pago.referencia || pago.referencia_bancaria || null,
            observacion: pago.observacion || null,
            estado: 'VERIFICADO'
          });
        } catch (apiErr) {
          console.error('Error al actualizar pago:', apiErr);
          const errorMessage = apiErr.response?.data?.message || apiErr.message || 'Error al verificar el pago';
          alert(errorMessage);
          // Revertimos el estado si falla el PUT
          setEstadoLocal(estadoAnterior);
          return;
        }
      }
      
      // Notificamos al padre para actualizar la tabla
      if (onVerificado) {
        onVerificado(pago.id_pago, 'VERIFICADO');
      }
    } catch (err) {
      console.error('Error al verificar pago:', err);
      alert(err.message || 'Error al verificar el pago');
      // Revertimos el estado si hay error
      setEstadoLocal(estadoAnterior);
    } finally {
      setMarcando(false);
    }
  };

  const renderMedioIcon = (medio) => {
    const m = (medio || '').toLowerCase();
    if (m.includes('efectivo')) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
          <Banknote className="h-4 w-4" />
        </span>
      );
    }
    if (m.includes('tarjeta') || m.includes('pos')) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
          <CreditCard className="h-4 w-4" />
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-600/10">
        <Wallet className="h-4 w-4" />
      </span>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Fondo oscuro general con desenfoque */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* VISOR DE EVIDENCIA EN SPLIT-SCREEN (PANEL IZQUIERDO) */}
      {isImageOpen && urlEvidencia && (
        <div
          className="fixed inset-y-0 left-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 border-r border-slate-700 p-3 sm:p-6 backdrop-blur-md select-none w-full lg:right-[500px] lg:w-auto animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón flotante para cerrar el visor de imagen */}
          <button
            type="button"
            onClick={() => {
              setIsImageOpen(false);
              setZoom(false);
            }}
            className="absolute top-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-slate-700 active:scale-95"
            title="Cerrar visor de evidencia"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Badge de zoom superior izquierdo */}
          <button
            type="button"
            onClick={() => setZoom(!zoom)}
            className="absolute top-4 left-4 z-40 flex items-center gap-2 rounded-full bg-slate-800/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-slate-700"
          >
            {zoom ? (
              <>
                <ZoomOut className="h-4 w-4 text-brand-orange" />
                <span>Zoom 150% (Clic para alejar)</span>
              </>
            ) : (
              <>
                <ZoomIn className="h-4 w-4 text-brand-orange" />
                <span>100% (Clic para ampliar)</span>
              </>
            )}
          </button>

          {/* Contenedor scrolleable que adapta la imagen al panel izquierdo */}
          <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
            <img
              src={urlEvidencia}
              alt="Evidencia del Pago"
              onClick={() => setZoom(!zoom)}
              className={`max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out ${
                zoom ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
              }`}
            />
          </div>

          {/* Texto sutil en la parte inferior */}
          <p className="mt-2 text-xs font-medium text-slate-400">
            {zoom ? 'Haz clic en la imagen para alejar' : 'Haz clic en la imagen para hacer zoom'}
          </p>
        </div>
      )}

      {/* PANEL LATERAL DE DETALLES DEL PAGO (LADO DERECHO - ASIDE) */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[500px] flex-col bg-white text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera del Pago */}
        <header className="border-b border-slate-100 px-6 pb-6 pt-5 sm:px-8">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                isVerificado
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              }`}
            >
              {isVerificado ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  PAGO VERIFICADO
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  PENDIENTE DE CONCILIACIÓN
                </>
              )}
            </span>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Detalle de Pago Individual
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {pago.fecha} {pago.hora ? `· ${pago.hora.substring(0, 5)}` : ''}
            </span>
          </p>

          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">
            Monto de este Pago
          </p>
          <p className="mt-1 text-4xl font-black tracking-tight text-brand-orange tabular-nums">
            {formatCurrency(pago.monto)}
          </p>
        </header>

        {/* Contenido en Scroll */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5">
            {/* TARJETA 1: INFORMACIÓN DEL MEDIO Y REFERENCIA */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Receipt className="h-4 w-4 text-slate-400" />
                Datos de Cobro
              </h3>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500">Medio de Pago</span>
                  <div className="flex items-center gap-2">
                    {renderMedioIcon(pago.medio_pago)}
                    <span className="text-sm font-bold text-slate-900">{pago.medio_pago}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500">Número de Referencia</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {pago.referencia || 'Sin referencia bancaria'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500">Comprobante Vinculado</span>
                  <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    {pago.comprobante}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs text-slate-500">Cliente</span>
                  <span className="max-w-[230px] truncate text-right text-xs font-semibold text-slate-900">
                    {pago.cliente}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Usuario Registrador</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {pago.usuario}
                  </span>
                </div>
              </div>
            </section>

            {/* TARJETA 2: EVIDENCIA ADJUNTA (COMPROBANTE DIGITAL) */}
            {(pago.medio_pago || '').toLowerCase().includes('efectivo') ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pago en Efectivo
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      La verificación se realiza físicamente en el arqueo de caja. No requiere comprobante digital.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-slate-400" />
                    Evidencia Adjunta
                  </span>
                  {urlEvidencia && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-600/10">
                      Comprobante Digital
                    </span>
                  )}
                </h3>

                {urlEvidencia ? (
                  <div className="space-y-3">
                    {/* Miniatura de imagen fija h-40 object-cover con botón de zoom */}
                    <div
                      onClick={() => {
                        setIsImageOpen(true);
                        setZoom(false);
                      }}
                      className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs"
                      title="Clic para abrir panel comparativo a la izquierda"
                    >
                      <img
                        src={urlEvidencia}
                        alt="Evidencia del Pago"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                      <div className="hidden h-full w-full flex-col items-center justify-center bg-slate-100 p-4 text-center">
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                        <p className="mt-1 text-xs text-slate-500">Error al cargar la imagen</p>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/35">
                        <span className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-800 shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="h-3.5 w-3.5 text-brand-orange" />
                          Comparar en Pantalla Dividida
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsImageOpen(true);
                        setZoom(false);
                      }}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-98"
                    >
                      <ZoomIn className="h-4 w-4 text-brand-orange" />
                      Comparar en Pantalla Dividida
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">Sin Evidencia Adjunta</p>
                    <p className="mt-0.5 max-w-xs text-[11px] text-slate-400">
                      No se adjuntó voucher ni captura para esta transacción de cobro.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* TARJETA 3: ESTADO DE CONCILIACIÓN */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                Estado de Conciliación
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isVerificado
                  ? 'Este pago ha sido verificado y conciliado con el arqueo o extracto correspondiente.'
                  : 'Este pago se encuentra registrado pero requiere validación contra el estado de cuenta bancario o arqueo de caja físico.'}
              </p>
            </section>
          </div>
        </div>

        {/* Pie de Panel con Acciones */}
        <footer className="flex gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Cerrar
          </button>

          {!isVerificado ? (
            <button
              type="button"
              disabled={marcando}
              onClick={handleMarcarVerificado}
              className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{marcando ? 'Verificando...' : 'Marcar como Verificado'}</span>
            </button>
          ) : (
            <div className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Pago Verificado</span>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

export default PagoDetailDrawer;
