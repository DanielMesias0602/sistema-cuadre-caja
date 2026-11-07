import { CreditCard, Banknote, Smartphone, Landmark } from 'lucide-react';
import { useMemo } from 'react';

export function PagosPorMedioSection({ filteredOps }) {
  const pagosPorMedio = useMemo(() => {
    const medios = {};
    const operacionesValidas = filteredOps.filter(
      (op) => String(op.estado || op.estado_operacion || '').toUpperCase() !== 'ANULADA'
    );
    
    operacionesValidas.forEach(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      pagos.forEach(p => {
        const medioOriginal = String(p.medio_pago || p.nombre_medio || 'Efectivo');
        const esVale = /\[VALE\]/i.test(String(p.observacion || '')) ||
          medioOriginal.trim().toLowerCase() === 'vale';
        const medio = esVale ? 'Vale' : medioOriginal;
        const monto = Number(p.monto || p.importe || 0);
        const esEfectivo = !esVale && (medio || '').toLowerCase().includes('efectivo');
        
        if (!medios[medio]) {
          medios[medio] = {
            medio_pago: medio,
            total_monto: 0,
            es_efectivo: esEfectivo,
            count: 0
          };
        }
        medios[medio].total_monto += monto;
        medios[medio].count += 1;
      });
    });
    
    return Object.values(medios);
  }, [filteredOps]);

  const operacionesValidas = filteredOps.filter(
    (op) => String(op.estado || op.estado_operacion || '').toUpperCase() !== 'ANULADA'
  );
  const totalMontoGeneral = operacionesValidas.reduce((acc, op) => {
    const pagos = Array.isArray(op.pagos) ? op.pagos : [];
    const sumaPagos = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    return acc + sumaPagos;
  }, 0);

  const getMedioIcon = (nombre, esEfectivo) => {
    if (esEfectivo) return Banknote;
    const lower = (nombre || '').toLowerCase();
    if (lower.includes('yape') || lower.includes('plin') || lower.includes('qr')) return Smartphone;
    if (lower.includes('tarjeta') || lower.includes('pos')) return CreditCard;
    return Landmark;
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    // CONTENEDOR PRINCIPAL
    <div className="bg-blue-50/50 dark:bg-slate-800/50 rounded-2xl p-5 sm:p-6 border border-blue-100 dark:border-slate-600 shadow-sm dark:shadow-none">
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-blue-100 dark:border-slate-600 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Desglose por Medio de Pago
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución de ingresos según medio de recepción registrado
          </p>
        </div>
        <span className="text-sm font-black text-brand-orange dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-3.5 py-1.5 rounded-xl border border-orange-100 dark:border-orange-800/50 shadow-sm dark:shadow-none w-fit">
          Total: {formatCurrency(totalMontoGeneral)}
        </span>
      </div>

      {pagosPorMedio.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm font-medium bg-white dark:bg-slate-800/90 rounded-xl">
          No hay registros de pagos para el período seleccionado
        </div>
      ) : (
        <div className="space-y-4">
          {pagosPorMedio.map((item) => {
            const Icon = getMedioIcon(item.medio_pago, item.es_efectivo);
            const monto = Number(item.total_monto || 0);
            const porcentaje = totalMontoGeneral > 0 ? ((monto / totalMontoGeneral) * 100).toFixed(1) : 0;
            const esVale = String(item.medio_pago || '').trim().toLowerCase() === 'vale';
            
            const barColor = esVale
              ? 'bg-violet-500 dark:bg-violet-400'
              : item.es_efectivo ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-brand-orange dark:bg-orange-500';
            const iconBg = esVale
              ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
              : item.es_efectivo
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-orange-50 dark:bg-orange-950/40 text-brand-orange dark:text-orange-400';

            return (
              <div key={item.id_medio_pago || item.medio_pago} className="space-y-2 bg-white dark:bg-slate-800/90 p-4 rounded-xl shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-600">
                <div className="flex items-center justify-between text-sm font-medium">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-bold">{item.medio_pago}</span>
                    {item.es_efectivo && (
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        EFECTIVO
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(monto)}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-2">({porcentaje}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}