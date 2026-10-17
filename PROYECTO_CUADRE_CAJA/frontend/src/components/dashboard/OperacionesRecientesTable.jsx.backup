import { Eye, Check, Clock, AlertCircle, X } from 'lucide-react';

export function OperacionesRecientesTable({ operaciones, selectedOpId, onSelectOp }) {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'VERIFICADA' || st === 'COMPLETADO' || st === 'PAGADO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
          <Check className="w-3.5 h-3.5" /> VERIFICADA
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs border border-amber-100">
          <Clock className="w-3.5 h-3.5" /> PENDIENTE
        </span>
      );
    }
    if (st === 'OBSERVADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-100">
          <AlertCircle className="w-3.5 h-3.5" /> OBSERVADA
        </span>
      );
    }
    if (st === 'ANULADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
          <X className="w-3.5 h-3.5" /> ANULADA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200">
        {st || 'REGISTRADO'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Operaciones y Comprobantes</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro de operaciones realizadas y consulta detallada en tiempo real
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          {operaciones.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Fecha / hora</th>
              <th className="py-3 px-5">Comprobante</th>
              <th className="py-3 px-4 text-right">Monto total</th>
              <th className="py-3 px-5">Medios de pago</th>
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-slate-800">
            {operaciones.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-gray-400 text-sm font-medium">
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
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-orange-50/70 border-l-4 border-l-brand-orange' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                      <span className="block">{op.fecha}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-brand-orange block">
                        {op.tipo_comprobante} {op.serie}-{op.numero}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(op.monto_operacion || op.monto_comprobante)}
                    </td>
                    <td className="py-3.5 px-5">
                      {pagosList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pagosList.slice(0, 2).map((pago, idx) => (
                            <span
                              key={pago.id_pago || idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {pago.medio_pago}: {formatCurrency(pago.monto)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin detalle de pago</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
