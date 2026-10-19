import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, CreditCard, Package, Printer, Receipt, X, ZoomIn, Image as ImageIcon, Eye, ZoomOut } from 'lucide-react';

export function OperacionDetailDrawerPremium({ op, onClose }) {
  const open = op !== null;
  const lastOperation = useRef(op);
  if (op) lastOperation.current = op;
  const opData = lastOperation.current;
  const closeRef = useRef(null);

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsImageOpen(false);
      setSelectedImageUrl(null);
      setZoom(false);
      return;
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isImageOpen) {
          setIsImageOpen(false);
          setSelectedImageUrl(null);
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
    };
  }, [open, onClose, isImageOpen]);

  if (!opData) return null;

  // Formateador de moneda
  const formatPEN = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Mapeo robusto de datos reales de la BD a las variables del diseño
  const dataComprobante = opData.comprobante || opData;
  const montoFinal = opData.monto || opData.total || opData.monto_operacion || dataComprobante.monto || dataComprobante.total || 0;
  const estadoFinal = opData.estado || opData.status || opData.estado_operacion || 'PENDIENTE';
  const estadoUpper = String(estadoFinal).toUpperCase();
  const isPagada = estadoUpper === 'PAGADA' || estadoUpper === 'VERIFICADA' || estadoUpper === 'COMPLETADO' || estadoUpper === 'PAGADO';
  
  const tipoComp = dataComprobante.tipo_comprobante || opData.tipo_comprobante || 'DOC';
  const serieComp = dataComprobante.serie || opData.serie || '';
  const numComp = dataComprobante.numero || opData.numero || '';
  const comprobante = `${tipoComp} ${serieComp ? `${serieComp}-` : ''}${numComp}`;
  
  const nombreUsuario = opData.usuario || `${opData.nombres || ''} ${opData.apellidos || ''}`.trim() || 'Sistema';
  const cliente = dataComprobante.cliente || opData.cliente || 'No registrado';
  const vendedor = dataComprobante.vendedor || opData.vendedor || '-';
  const fecha = dataComprobante.fecha || opData.fecha || '';
  const hora = dataComprobante.hora || opData.hora || '';
  
  const opGravada = dataComprobante.op_gravada ?? opData.op_gravada;
  const igv = dataComprobante.igv ?? opData.igv;

  let rawItems = opData.items || dataComprobante.items;
  if (typeof rawItems === 'string') {
    try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; }
  }
  const items = Array.isArray(rawItems) ? rawItems : [];
  const pagos = Array.isArray(opData.pagos) ? opData.pagos : (Array.isArray(opData.payments) ? opData.payments : []);
  const evidencias = Array.isArray(opData.evidencias) ? opData.evidencias : [];

  const getEvidenciaUrl = (tipo) => {
    const evidencia = evidencias.find(e => e.tipo_evidencia === tipo);
    if (!evidencia || !evidencia.storage_key) return null;
    const storageKey = evidencia.storage_key;
    // Ya viene como URL firmada desde el backend
    return storageKey.startsWith('http')
      ? storageKey
      : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${storageKey}`;
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Fondo oscuro */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Panel Lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-white text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="border-b border-slate-100 px-6 pb-6 pt-5 sm:px-8">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              isPagada 
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' 
                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
            }`}>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              {estadoFinal}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            {comprobante}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {fecha} {hora ? `· ${hora.substring(0, 5)}` : ''}
            </span>
          </p>

          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">Monto total</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-brand-orange tabular-nums">
            {formatPEN(montoFinal)}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6">
            
            {/* TARJETA 1: INFORMACIÓN Y TOTALES */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5">
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Cliente</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{cliente}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Vendedor</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{vendedor}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Usuario registrador</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{nombreUsuario}</dd>
                </div>
              </dl>
              
              <div className="border-t border-slate-100 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Receipt className="w-3.5 h-3.5" /> Totales
                </h3>
                <dl className="flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Op. Gravada</dt>
                    <dd className="font-medium text-slate-700 tabular-nums">{formatPEN(opGravada)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">IGV (18%)</dt>
                    <dd className="font-medium text-slate-700 tabular-nums">{formatPEN(igv)}</dd>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                    <dt className="font-semibold text-slate-900">Total</dt>
                    <dd className="text-base font-bold text-slate-900 tabular-nums">{formatPEN(montoFinal)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* TARJETA 2: PRODUCTOS */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="flex w-7 h-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                  <Package className="w-4 h-4" />
                </span>
                Detalle de Productos ({items.length})
              </h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
                {items.length > 0 ? items.map((p, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-slate-900">{p.descripcion}</p>
                      <p className="mt-1 text-xs text-slate-500 tabular-nums">
                        Cant: {p.cantidad} · P. Unit: {formatPEN(p.precio_unitario)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                      {formatPEN(p.total)}
                    </span>
                  </li>
                )) : (
                  <li className="py-4 text-sm text-slate-500 text-center">No hay productos detallados.</li>
                )}
              </ul>
            </section>

            {/* TARJETA 3: PAGOS */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="flex w-7 h-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                  <CreditCard className="w-4 h-4" />
                </span>
                Pagos Asociados ({pagos.length})
              </h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
                {pagos.length > 0 ? pagos.map((p, idx) => {
                  const esEfectivo = (p.medio_pago || p.nombre_medio || '').toLowerCase().includes('efectivo');
                  // Solo buscar evidencia si no es efectivo
                  const urlEvidenciaCliente = !esEfectivo ? getEvidenciaUrl('CLIENTE') : null;
                  const tieneEvidencia = urlEvidenciaCliente !== null;

                  return (
                    <li key={idx} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {p.medio_pago || p.nombre_medio || 'Efectivo'}
                          </p>
                          {tieneEvidencia && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedImageUrl(urlEvidenciaCliente);
                                setIsImageOpen(true);
                                setZoom(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
                              title="Ver evidencia del cliente"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Evidencia
                            </button>
                          )}
                        </div>
                        {p.referencia && p.referencia !== 'None' && (
                          <p className="mt-1 text-xs text-slate-500 tabular-nums">Ref: {p.referencia}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                        {formatPEN(p.monto)}
                      </span>
                    </li>
                  );
                }) : (
                  <li className="py-4 text-sm text-slate-500 text-center">No hay pagos registrados.</li>
                )}
              </ul>
            </section>
          </div>
        </div>

        <footer className="flex gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-lg bg-brand-orange text-sm font-semibold text-white shadow-md shadow-brand-orange/25 transition-colors hover:bg-brand-orange-hover"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprobante
          </button>
        </footer>
      </aside>

      {/* VISOR DE EVIDENCIA EN SPLIT-SCREEN (PANEL IZQUIERDO) */}
      {isImageOpen && selectedImageUrl && (
        <div
          className="fixed inset-y-0 left-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 border-r border-slate-700 p-3 sm:p-6 backdrop-blur-md select-none w-full lg:right-[500px] lg:w-auto animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón flotante para cerrar el visor de imagen */}
          <button
            type="button"
            onClick={() => {
              setIsImageOpen(false);
              setSelectedImageUrl(null);
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
              src={selectedImageUrl}
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
    </div>
  );
}
