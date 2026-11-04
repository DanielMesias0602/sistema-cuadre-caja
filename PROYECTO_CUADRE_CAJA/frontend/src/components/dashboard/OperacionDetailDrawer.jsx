import { Check, Clock, X, FileText, Wallet, Printer, User, Calendar } from 'lucide-react';

export function OperacionDetailDrawer({ selectedOp, onClose }) {
  if (!selectedOp) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Detalle de Operación</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60 shadow-sm dark:shadow-none">
          <Check className="w-3 h-3" strokeWidth={3} /> {st}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800/60 shadow-sm dark:shadow-none">
          <Clock className="w-3 h-3" strokeWidth={3} /> PENDIENTE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
        <X className="w-3 h-3" strokeWidth={3} /> {st || 'REGISTRADO'}
      </span>
    );
  };

  const pagosList = Array.isArray(selectedOp.pagos) ? selectedOp.pagos : (Array.isArray(selectedOp.payments) ? selectedOp.payments : []);

  const dataComprobante = selectedOp.comprobante || selectedOp;

  const handlePrint = () => {
    const printArea = document.getElementById('operacion-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const clone = printArea.cloneNode(true);
    clone.id = 'operacion-print-clone';
    clone.querySelectorAll('button').forEach((b) => b.remove());

    clone.classList.remove('dark:bg-slate-900/40');
    clone.classList.add('bg-white');

    clone.querySelectorAll('[class*="max-h-"]').forEach((el) => {
      [...el.classList].forEach((c) => {
        if (c.includes('max-h-')) el.classList.remove(c);
      });
    });
    clone.querySelectorAll('[class*="overflow-"]').forEach((el) => {
      [...el.classList].forEach((c) => {
        if (c.includes('overflow-')) el.classList.remove(c);
      });
    });

    clone.style.padding = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';

    const tempContainer = document.createElement('div');
    tempContainer.id = 'temp-print-root';
    tempContainer.style.cssText = 'display: none; background: white;';
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    const style = document.createElement('style');
    style.id = 'temp-print-style';
    style.textContent = `
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        body > *:not(#temp-print-root) {
          display: none !important;
        }
        #temp-print-root {
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          width: 100% !important;
          height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
        }
        #operacion-print-clone {
          width: 100% !important;
          max-width: 190mm !important;
          padding: 0 !important;
          margin: 0 auto !important;
          background: white !important;
        }
        #operacion-print-clone * {
          visibility: visible !important;
          max-height: none !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #operacion-print-clone button {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.getElementById('temp-print-root')?.remove();
        document.getElementById('temp-print-style')?.remove();
      }, 500);
    }, 200);
  };

  return (
    <div
      id="operacion-print-area"
      className="bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-600 p-2 sm:p-3 flex flex-col space-y-3 max-h-[90vh] max-h-[90dvh] overflow-y-auto shadow-sm dark:shadow-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-600 flex flex-col space-y-4">

        {/* BLOQUE A: INFORMACIÓN DE LA OPERACIÓN */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Información de la Operación
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
              {dataComprobante.tipo_comprobante} {dataComprobante.serie}-{dataComprobante.numero}
            </h2>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Comprobante Electrónico
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(selectedOp.estado_operacion || selectedOp.estado || selectedOp.status)}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition print:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* DATOS GENERALES */}
        <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-600 text-xs sm:grid-cols-2">
          <div>
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 font-semibold text-[10px] uppercase tracking-wider">
              <Calendar className="w-3 h-3" /> Fecha y hora
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">
              {dataComprobante.fecha || selectedOp.fecha}
              {dataComprobante.hora ? ` - ${dataComprobante.hora}` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 font-semibold text-[10px] uppercase tracking-wider">
              <User className="w-3 h-3" /> Cliente
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-bold block break-words" title={dataComprobante.cliente || 'No registrado'}>
              {dataComprobante.cliente || 'No registrado'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1 font-semibold text-[10px] uppercase tracking-wider">Usuario</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold block break-words">
              {selectedOp.usuario || `${selectedOp.nombres || ''} ${selectedOp.apellidos || ''}`.trim() || 'Sistema'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1 font-semibold text-[10px] uppercase tracking-wider">Vendedor</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold block break-words">
              {dataComprobante.vendedor || 'No registrado'}
            </span>
          </div>
        </div>

        {/* BLOQUE B: COMPROBANTE Y TOTALES */}
        <div className="bg-blue-50/60 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 relative overflow-hidden">

          <div className="flex items-center justify-between text-[10px] text-blue-800/70 dark:text-blue-400/80 font-bold uppercase tracking-wider mb-2">
            <span>Monto Total Cancelado</span>
            <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>

          <div className="flex items-end justify-between">
            <strong className="text-blue-900 dark:text-blue-300 font-black text-3xl tracking-tight">
              {formatCurrency(selectedOp.monto_operacion || selectedOp.monto || selectedOp.total || dataComprobante.monto)}
            </strong>
          </div>

          {/* Detalle de totales */}
          <div className="grid grid-cols-2 gap-2 text-xs mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
            <div>
              <span className="text-blue-600/70 dark:text-blue-400/80 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">Op. Gravada</span>
              <strong className="text-blue-900 dark:text-blue-300 font-bold">{formatCurrency(dataComprobante.op_gravada ?? selectedOp.op_gravada)}</strong>
            </div>
            <div>
              <span className="text-blue-600/70 dark:text-blue-400/80 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">IGV</span>
              <strong className="text-blue-900 dark:text-blue-300 font-bold">{formatCurrency(dataComprobante.igv ?? selectedOp.igv)}</strong>
            </div>
          </div>
        </div>

        {/* BLOQUE C: PAGOS */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-4 shadow-sm dark:shadow-none space-y-3 mt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Pagos Asociados ({pagosList.length})</span>
          </div>
          {pagosList.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium py-2 text-center bg-slate-50 dark:bg-slate-900/60 rounded-lg">
              No registra detalles de pago individuales
            </div>
          ) : (
            pagosList.map((pago, idx) => (
              <div
                key={pago.id_pago || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-600 text-xs hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Pago {idx + 1}: {pago.medio_pago || 'Medio registrado'}
                  </span>
                </div>
                <strong className="font-black text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatCurrency(pago.monto)}
                </strong>
              </div>
            ))
          )}
        </div>

        {/* BLOQUE G: ACCIONES (oculto al imprimir) */}
        <div className="flex items-center gap-3 pt-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Imprimir Resumen</span>
          </button>
        </div>

      </div>
    </div>
  );
}