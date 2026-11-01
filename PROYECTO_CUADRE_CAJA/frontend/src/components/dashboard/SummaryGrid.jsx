import { FileText, Clock, Wallet, AlertTriangle, Calendar, Layers, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export function SummaryGrid({ filteredOps }) {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const kpis = useMemo(() => {
    const totalOps = filteredOps.length;
    const operacionesValidas = filteredOps.filter(
      (op) => String(op.estado_operacion || op.estado || '').toUpperCase() !== 'ANULADA'
    );

    const opsPagadas = filteredOps.filter(op => {
      const e = String(op.estado_operacion || op.estado || '').toUpperCase();
      return e === 'PAGADA' || e === 'VERIFICADA' || e === 'COMPLETADO';
    }).length;

    const opsPendientes = filteredOps.filter(op => {
      const e = String(op.estado_operacion || op.estado || '').toUpperCase();
      return e === 'PENDIENTE';
    }).length;

    const efectivoEsperado = operacionesValidas.reduce((acc, op) => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      const efectivo = pagos.reduce((sum, p) => {
        if (p.es_efectivo === true || (p.medio_pago || '').toLowerCase().includes('efectivo')) {
          return sum + Number(p.monto || 0);
        }
        return sum;
      }, 0);
      return acc + efectivo;
    }, 0);

    const reqVerificacion = filteredOps.filter(op => op.requiere_verificacion === true).length;

    const montoTotal = operacionesValidas.reduce((acc, op) => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      const sumaPagos = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
      return acc + sumaPagos;
    }, 0);

    return { totalOps, opsPagadas, opsPendientes, efectivoEsperado, reqVerificacion, montoTotal };
  }, [filteredOps]);

  const sinOpsPendientes = kpis.opsPendientes === 0;
  const pendStyles = sinOpsPendientes
    ? {
        barColor: 'bg-slate-400 dark:bg-slate-600',
        numColor: 'text-slate-500 dark:text-slate-400',
        bgIcon: 'bg-slate-100 dark:bg-slate-700/50',
        textIcon: 'text-slate-500 dark:text-slate-400',
        Icon: FileText,
        subtitulo: 'Sin operaciones pendientes',
        subtextColor: 'text-slate-500 dark:text-slate-400',
      }
    : {
        barColor: 'bg-amber-500',
        numColor: 'text-amber-600 dark:text-amber-400',
        bgIcon: 'bg-amber-50 dark:bg-amber-900/30',
        textIcon: 'text-amber-600 dark:text-amber-400',
        Icon: AlertTriangle,
        subtitulo:
          kpis.opsPendientes === 1
            ? '1 operación por cobrar'
            : `${kpis.opsPendientes} operaciones por cobrar`,
        subtextColor: 'text-amber-600 dark:text-amber-400',
      };

  const sinDatos = kpis.totalOps === 0;
  const todoCotejado = !sinDatos && kpis.reqVerificacion === 0;
  const reqStyles = sinDatos
    ? {
        barColor: 'bg-slate-400 dark:bg-slate-600',
        numColor: 'text-slate-500 dark:text-slate-400',
        bgIcon: 'bg-slate-100 dark:bg-slate-700/50',
        textIcon: 'text-slate-500 dark:text-slate-400',
        Icon: FileText,
        subtitulo: 'Sin operaciones registradas',
        subtextColor: 'text-slate-500 dark:text-slate-400',
      }
    : todoCotejado
      ? {
          barColor: 'bg-emerald-500',
          numColor: 'text-emerald-600 dark:text-emerald-400',
          bgIcon: 'bg-emerald-50 dark:bg-emerald-900/30',
          textIcon: 'text-emerald-600 dark:text-emerald-400',
          Icon: CheckCircle2,
          subtitulo: 'Todo cotejado',
          subtextColor: 'text-emerald-600 dark:text-emerald-400',
        }
      : {
          barColor: 'bg-amber-500',
          numColor: 'text-amber-600 dark:text-amber-400',
          bgIcon: 'bg-amber-50 dark:bg-amber-900/30',
          textIcon: 'text-amber-600 dark:text-amber-400',
          Icon: AlertTriangle,
          subtitulo:
            kpis.reqVerificacion === 1
              ? '1 pago pendiente'
              : `${kpis.reqVerificacion} pagos pendientes`,
          subtextColor: 'text-amber-600 dark:text-amber-400',
        };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 sm:gap-4 mb-4 sm:mb-6">
      {/* Card 1: Operaciones Registradas */}
      <div className="relative bg-white dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none overflow-hidden group hover:shadow-md dark:hover:border-slate-600 transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
              Operaciones Registradas
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {kpis.totalOps}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="truncate">Registros filtrados</span>
        </div>
      </div>

      {/* Card 2: Operaciones Pagadas */}
      <div className="relative bg-white dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none overflow-hidden group hover:shadow-md dark:hover:border-slate-600 transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
              Operaciones Pagadas
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {kpis.opsPagadas}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="truncate">Pago completo</span>
        </div>
      </div>

      {/* Card 3: Pendientes de Pago */}
      <div className="relative bg-white dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none overflow-hidden group hover:shadow-md dark:hover:border-slate-600 transition">
        <div className={`absolute top-0 left-0 right-0 h-1 ${pendStyles.barColor}`}></div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
              Pendientes de Pago
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${pendStyles.numColor}`}>
              {kpis.opsPendientes}
            </span>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pendStyles.bgIcon} ${pendStyles.textIcon}`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <pendStyles.Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${pendStyles.subtextColor}`} />
          <span className="truncate">{pendStyles.subtitulo}</span>
        </div>
      </div>

      {/* Card 4: Monto Total Ingresos */}
      <div className="relative bg-white dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none overflow-hidden group hover:shadow-md dark:hover:border-slate-600 transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
              Monto Total Ingresos
            </span>
            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 tabular-nums break-words">
              {formatCurrency(kpis.montoTotal)}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="truncate">Efectivo: {formatCurrency(kpis.efectivoEsperado)}</span>
        </div>
      </div>

      {/* Card 5: Requieren Verificación */}
      <div className="relative bg-white dark:bg-slate-800/80 p-3 sm:p-5 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none overflow-hidden group hover:shadow-md dark:hover:border-slate-600 transition col-span-2 md:col-span-1">
        <div className={`absolute top-0 left-0 right-0 h-1 ${reqStyles.barColor}`}></div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
              Requieren Verificación
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${reqStyles.numColor}`}>
              {kpis.reqVerificacion}
            </span>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${reqStyles.bgIcon} ${reqStyles.textIcon}`}>
            {sinDatos
              ? <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              : todoCotejado
                ? <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                : <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
          <reqStyles.Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${reqStyles.subtextColor}`} />
          <span className="truncate">{reqStyles.subtitulo}</span>
        </div>
      </div>
    </div>
  );
}