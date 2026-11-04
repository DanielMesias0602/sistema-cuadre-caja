import { Check, Clock, AlertCircle, X, ArrowRight } from 'lucide-react';

export function OperacionesRecientesTable({ operaciones, selectedOpId, onSelectOp }) {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'VERIFICADA' || st === 'COMPLETADO' || st === 'PAGADO' || st === 'PAGADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800/60 shadow-sm dark:shadow-none">
          <Check className="w-3.5 h-3.5" /> {st === 'PAGADA' ? 'PAGADA' : 'VERIFICADA'}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60 shadow-sm dark:shadow-none">
          <Clock className="w-3.5 h-3.5" /> PENDIENTE
        </span>
      );
    }
    if (st === 'OBSERVADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-800/60 shadow-sm dark:shadow-none">
          <AlertCircle className="w-3.5 h-3.5" /> OBSERVADA
        </span>
      );
    }
    if (st === 'ANULADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
          <X className="w-3.5 h-3.5" /> ANULADA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
        {st || 'REGISTRADO'}
      </span>
    );
  };

  const getComprobanteBadge = (tipo) => {
    const t = (tipo || '').toUpperCase();
    if (t === 'BOLETA') return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60";
    if (t === 'FACTURA') return "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60";
    return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const getMedioDotColor = (medio) => {
    const m = (medio || '').toLowerCase();
    if (m.includes('bcp') || m.includes('transferencia')) return "bg-blue-500";
    if (m.includes('yape')) return "bg-purple-500";
    if (m.includes('efectivo')) return "bg-orange-500";
    if (m.includes('tarjeta') || m.includes('pos')) return "bg-emerald-500";
    return "bg-slate-400";
  };

  return (
    <div className="bg-blue-50/50 dark:bg-slate-800/50 rounded-2xl border border-blue-100 dark:border-slate-600 shadow-sm dark:shadow-none overflow-hidden">
      {/* HEADER DE LA TABLA */}
      <div className="p-4 sm:p-5 border-b border-blue-100 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Operaciones y Comprobantes</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
            Registro de operaciones realizadas y consulta detallada en tiempo real
          </p>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm dark:shadow-none">
          {operaciones.length} reg.
        </span>
      </div>

      {/* Mobile: cards */}
      <div className="block md:hidden divide-y divide-blue-100/50 dark:divide-slate-700/50">
        {operaciones.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 dark:text-slate-500 text-sm font-medium bg-white dark:bg-slate-800/90">
            No hay operaciones registradas para los filtros aplicados
          </div>
        ) : (
          operaciones.map((op) => {
            const isSelected = selectedOpId === op.id_operacion;
            const pagosList = Array.isArray(op.pagos) ? op.pagos : [];

            return (
              <div
                key={op.id_operacion}
                onClick={() => onSelectOp(op)}
                className={`p-4 cursor-pointer transition-colors bg-white dark:bg-slate-800/90 ${
                  isSelected
                    ? 'bg-orange-50/50 dark:bg-orange-950/20 border-l-4 border-l-brand-orange'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[10px] font-bold text-slate-400">{op.fecha}</p>
                    </div>
                    <span className={`inline-flex flex-col items-start px-2 py-1 rounded-md border text-[10px] font-bold ${getComprobanteBadge(op.tipo_comprobante)}`}>
                      <span>{op.tipo_comprobante}</span>
                      <span className="text-[9px] opacity-80">{op.serie}-{op.numero}</span>
                    </span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm flex-shrink-0 tabular-nums">
                    {formatCurrency(op.monto_operacion || op.monto_comprobante)}
                  </span>
                </div>

                {pagosList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pagosList.slice(0, 2).map((pago, idx) => (
                      <span
                        key={pago.id_pago || idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-semibold shadow-sm dark:shadow-none"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getMedioDotColor(pago.medio_pago)}`}></span>
                        {pago.medio_pago}: {formatCurrency(pago.monto)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {op.usuario || 'Sistema'}
                  </span>
                  {getStatusBadge(op.estado_operacion)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden md:block overflow-x-auto w-full bg-white dark:bg-slate-800 pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">Fecha / hora</th>
              <th className="py-3.5 px-5">Comprobante</th>
              <th className="py-3.5 px-4 text-right">Monto total</th>
              <th className="py-3.5 px-5">Medios de pago</th>
              <th className="py-3.5 px-4">Usuario</th>
              <th className="py-3.5 px-4 text-center">Estado</th>
              <th className="py-3.5 px-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
            {operaciones.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                  No hay operaciones registradas para los filtros aplicados
                </td>
              </tr>
            ) : (
              operaciones.map((op) => {
                const isSelected = selectedOpId === op.id_operacion;
                const pagosList = Array.isArray(op.pagos) ? op.pagos : [];

                return (
                  <tr
                    key={op.id_operacion}
                    onClick={() => onSelectOp(op)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-orange-50/40 dark:bg-orange-950/25' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{op.fecha}</span>
                        {op.hora && <span className="text-[10px] font-medium text-slate-400">{op.hora}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className={`inline-flex flex-col px-2.5 py-1 rounded-md border text-[10px] font-bold ${getComprobanteBadge(op.tipo_comprobante)}`}>
                        <span>{op.tipo_comprobante}</span>
                        <span className="text-[9px] opacity-80">{op.serie}-{op.numero}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                      {formatCurrency(op.monto_operacion || op.monto_comprobante)}
                    </td>

                    <td className="py-3.5 px-5">
                      {pagosList.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {pagosList.slice(0, 2).map((pago, idx) => (
                            <span
                              key={pago.id_pago || idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold shadow-sm dark:shadow-none whitespace-nowrap"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${getMedioDotColor(pago.medio_pago)}`}></span>
                              {pago.medio_pago}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin detalle</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {op.usuario || 'Sistema'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(op.estado_operacion)}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOp(op);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-orange dark:hover:text-brand-orange hover:border-brand-orange dark:hover:border-brand-orange transition-all shadow-sm dark:shadow-none cursor-pointer"
                        title="Ver detalle"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="p-3 sm:p-4 border-t border-blue-100 dark:border-slate-700 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800">
        <p>
          Mostrando <strong className="text-slate-800 dark:text-slate-200">{operaciones.length}</strong> de <strong className="text-slate-800 dark:text-slate-200">{operaciones.length}</strong> operaciones
        </p>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed" disabled>
            &lt;
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded bg-blue-600 text-white font-bold shadow-sm dark:shadow-none">
            1
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}