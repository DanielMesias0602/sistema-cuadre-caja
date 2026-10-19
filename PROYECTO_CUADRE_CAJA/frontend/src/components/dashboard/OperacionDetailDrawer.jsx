import { Check, Clock, AlertCircle, X, FileText, Wallet, Paperclip, Printer, History, Package } from 'lucide-react';

export function OperacionDetailDrawer({ selectedOp, onClose }) {
  if (!selectedOp) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center text-gray-400">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Detalle de Operación</h3>
        <p className="text-xs text-gray-500 max-w-xs">
          Seleccione una fila en la tabla de operaciones para inspeccionar su comprobante, medios de pago, evidencias y estado de verificación.
        </p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'VERIFICADA' || st === 'COMPLETADO' || st === 'PAGADO' || st === 'PAGADA') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
          <Check className="w-3.5 h-3.5" /> {st}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
          <Clock className="w-3.5 h-3.5" /> PENDIENTE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
        <X className="w-3.5 h-3.5" /> {st || 'REGISTRADO'}
      </span>
    );
  };

  const pagosList = Array.isArray(selectedOp.pagos) ? selectedOp.pagos : (Array.isArray(selectedOp.payments) ? selectedOp.payments : []);
  
  // Validación segura por si los items vienen como string JSON de PostgreSQL
  let itemsList = [];
  try {
    if (selectedOp.items) {
      itemsList = typeof selectedOp.items === 'string' ? JSON.parse(selectedOp.items) : selectedOp.items;
    } else if (selectedOp.comprobante?.items) {
      itemsList = typeof selectedOp.comprobante.items === 'string' ? JSON.parse(selectedOp.comprobante.items) : selectedOp.comprobante.items;
    }
  } catch (e) {
    console.error("Error parseando items:", e);
  }

  // Obtener datos del comprobante (a veces vienen en la raíz, a veces en .comprobante)
  const dataComprobante = selectedOp.comprobante || selectedOp;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 flex flex-col space-y-5 max-h-[85vh] overflow-y-auto">
      {/* BLOQUE A: INFORMACIÓN DE LA OPERACIÓN */}
      <div className="pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Información de la Operación
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              {dataComprobante.tipo_comprobante} {dataComprobante.serie}-{dataComprobante.numero}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(selectedOp.estado_operacion || selectedOp.estado || selectedOp.status)}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 rounded-xl text-xs">
          <div>
            <span className="text-gray-500 block font-medium">Fecha y hora</span>
            <span className="text-slate-900 font-bold">
              {dataComprobante.fecha || selectedOp.fecha} 
              {dataComprobante.hora ? ` - ${dataComprobante.hora}` : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Cliente</span>
            <span className="text-slate-900 font-bold">{dataComprobante.cliente || 'No registrado'}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Usuario</span>
            <span className="text-slate-900 font-bold">{selectedOp.usuario || `${selectedOp.nombres || ''} ${selectedOp.apellidos || ''}`.trim() || 'Sistema'}</span>
          </div>
          <div>
            <span className="text-gray-500 block font-medium">Vendedor</span>
            <span className="text-slate-900 font-bold">{dataComprobante.vendedor || 'No registrado'}</span>
          </div>
        </div>
      </div>

      {/* BLOQUE B: COMPROBANTE Y TOTALES */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
          <span>Totales del Comprobante</span>
          <FileText className="w-4 h-4 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500 block">Op. Gravada</span>
            <strong className="text-slate-900 font-bold">{formatCurrency(dataComprobante.op_gravada ?? selectedOp.op_gravada)}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">IGV</span>
            <strong className="text-slate-900 font-bold">{formatCurrency(dataComprobante.igv ?? selectedOp.igv)}</strong>
          </div>
          <div className="col-span-2 pt-2 border-t border-gray-200 mt-1">
            <span className="text-gray-500 block">Monto Total</span>
            <strong className="text-brand-orange font-extrabold text-base">
              {formatCurrency(selectedOp.monto_operacion || selectedOp.monto || selectedOp.total || dataComprobante.monto)}
            </strong>
          </div>
        </div>
      </div>

      {/* BLOQUE NUEVO: TABLA DE PRODUCTOS (ITEMS) */}
      {itemsList.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
            <span>Detalle de Productos ({itemsList.length})</span>
            <Package className="w-4 h-4 text-gray-400" />
          </div>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-100">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-2 py-1.5 font-semibold text-center w-12">Cant.</th>
                  <th className="px-2 py-1.5 font-semibold">Descripción</th>
                  <th className="px-2 py-1.5 font-semibold text-right">P. Unit</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itemsList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2 text-center text-slate-700">{item.cantidad}</td>
                    <td className="px-2 py-2 text-slate-900 whitespace-normal break-words max-w-[150px] sm:max-w-xs">
                      {item.descripcion}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap">
                      {formatCurrency(item.precio_unitario)}
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BLOQUE C: PAGOS */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
          <span>Pagos Asociados ({pagosList.length})</span>
          <Wallet className="w-4 h-4 text-gray-400" />
        </div>
        {pagosList.length === 0 ? (
          <div className="text-xs text-gray-400 font-medium py-2">
            No registra detalles de pago individuales
          </div>
        ) : (
          pagosList.map((pago, idx) => (
            <div
              key={pago.id_pago || idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-gray-100 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800">
                  Pago {idx + 1}: {pago.medio_pago || 'Medio registrado'}
                </span>
              </div>
              <strong className="font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(pago.monto)}
              </strong>
            </div>
          ))
        )}
      </div>

      {/* BLOQUE G: ACCIONES */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Imprimir Resumen</span>
        </button>
      </div>
    </div>
  );
}