import { FileText, Clock, Wallet, AlertTriangle, Calendar, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export function SummaryGrid({ filteredOps }) {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const kpis = useMemo(() => {
    const totalOps = filteredOps.length;
    const opsConPago = filteredOps.filter(op => op.pagos && op.pagos.length > 0).length;
    
    // Sumar efectivo esperado de todas las operaciones
    const efectivoEsperado = filteredOps.reduce((acc, op) => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      const efectivo = pagos.reduce((sum, p) => {
        const medio = (p.medio_pago || '').toLowerCase();
        if (medio.includes('efectivo')) {
          return sum + Number(p.monto || 0);
        }
        return sum;
      }, 0);
      return acc + efectivo;
    }, 0);
    
    // Pagos completos (todos los pagos de la operación tienen monto > 0)
    const pagosCompletos = filteredOps.filter(op => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      if (pagos.length === 0) return false;
      return pagos.every(p => Number(p.monto || 0) > 0);
    }).length;
    
    // Requieren verificación (operaciones pendientes)
    const reqVerificacion = filteredOps.filter(op => {
      const estado = (op.estado || op.estado_operacion || '').toUpperCase();
      return estado === 'PENDIENTE' || estado === 'REGISTRADO';
    }).length;

    return {
      totalOps,
      opsConPago,
      efectivoEsperado,
      pagosCompletos,
      reqVerificacion
    };
  }, [filteredOps]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1 */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Operaciones Registradas
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {kpis.totalOps}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Registros filtrados</span>
        </div>
      </div>

      {/* Card 2 */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Operaciones con Pago
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {kpis.opsConPago}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <Layers className="w-3.5 h-3.5 text-brand-orange" />
          <span>{kpis.pagosCompletos} pagos completos</span>
        </div>
      </div>

      {/* Card 3 */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Monto Total Ingresos
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {formatCurrency(
                filteredOps.reduce((acc, op) => {
                  const pagos = Array.isArray(op.pagos) ? op.pagos : [];
                  const sumaPagos = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
                  return acc + sumaPagos;
                }, 0)
              )}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Efectivo esperado: {formatCurrency(kpis.efectivoEsperado)}</span>
        </div>
      </div>

      {/* Card 4 */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Requieren Verificación
            </span>
            <span className="text-3xl font-extrabold text-rose-600 mt-1 tabular-nums">
              {kpis.reqVerificacion}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Pendientes de cotejo bancario</span>
        </div>
      </div>
    </div>
  );
}
