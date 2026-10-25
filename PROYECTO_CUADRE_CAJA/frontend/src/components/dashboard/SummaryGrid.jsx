import { FileText, Clock, Wallet, AlertTriangle, Calendar, Layers, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

export function SummaryGrid({ filteredOps }) {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const kpis = useMemo(() => {
    const totalOps = filteredOps.length;

    // Pagadas: estado = PAGADA / VERIFICADA / COMPLETADO
    const opsPagadas = filteredOps.filter(op => {
      const e = String(op.estado || op.estado_operacion || '').toUpperCase();
      return e === 'PAGADA' || e === 'VERIFICADA' || e === 'COMPLETADO';
    }).length;

    // Pendientes de pago: estado = PENDIENTE
    const opsPendientes = filteredOps.filter(op => {
      const e = String(op.estado || op.estado_operacion || '').toUpperCase();
      return e === 'PENDIENTE';
    }).length;

    const efectivoEsperado = filteredOps.reduce((acc, op) => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : [];
      const efectivo = pagos.reduce((sum, p) => {
        if (p.es_efectivo === true || (p.medio_pago || '').toLowerCase().includes('efectivo')) {
          return sum + Number(p.monto || 0);
        }
        return sum;
      }, 0);
      return acc + efectivo;
    }, 0);

    const reqVerificacion = filteredOps.filter(
      op => op.requiere_verificacion === true
    ).length;

    return {
      totalOps,
      opsPagadas,
      opsPendientes,
      efectivoEsperado,
      reqVerificacion
    };
  }, [filteredOps]);

  // Colores dinámicos: Pendientes de Pago
  const sinOpsPendientes = kpis.opsPendientes === 0;
  const pendStyles = sinOpsPendientes
    ? {
        barColor: 'bg-slate-400',
        numColor: 'text-slate-500',
        bgIcon: 'bg-slate-100',
        textIcon: 'text-slate-500',
        Icon: FileText,
        subtitulo: 'Sin operaciones pendientes',
        subtextColor: 'text-slate-500',
      }
    : {
        barColor: 'bg-amber-500',
        numColor: 'text-amber-600',
        bgIcon: 'bg-amber-50',
        textIcon: 'text-amber-600',
        Icon: AlertTriangle,
        subtitulo:
          kpis.opsPendientes === 1
            ? '1 operación por cobrar'
            : `${kpis.opsPendientes} operaciones por cobrar`,
        subtextColor: 'text-amber-600',
      };

  // Colores dinámicos: Requieren Verificación
  const sinDatos = kpis.totalOps === 0;
  const todoCotejado = !sinDatos && kpis.reqVerificacion === 0;
  const reqStyles = sinDatos
    ? {
        barColor: 'bg-slate-400',
        numColor: 'text-slate-500',
        bgIcon: 'bg-slate-100',
        textIcon: 'text-slate-500',
        Icon: FileText,
        subtitulo: 'Sin operaciones registradas',
        subtextColor: 'text-slate-500',
      }
    : todoCotejado
      ? {
          barColor: 'bg-emerald-500',
          numColor: 'text-emerald-600',
          bgIcon: 'bg-emerald-50',
          textIcon: 'text-emerald-600',
          Icon: CheckCircle2,
          subtitulo: 'Todo cotejado',
          subtextColor: 'text-emerald-600',
        }
      : {
          barColor: 'bg-amber-500',
          numColor: 'text-amber-600',
          bgIcon: 'bg-amber-50',
          textIcon: 'text-amber-600',
          Icon: AlertTriangle,
          subtitulo:
            kpis.reqVerificacion === 1
              ? '1 pago pendiente'
              : `${kpis.reqVerificacion} pagos pendientes`,
          subtextColor: 'text-amber-600',
        };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Card 1: Operaciones Registradas */}
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

      {/* Card 2: Operaciones Pagadas */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Operaciones Pagadas
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {kpis.opsPagadas}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pago completo</span>
        </div>
      </div>

      {/* Card 3: Pendientes de Pago */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className={`absolute top-0 left-0 right-0 h-1 ${pendStyles.barColor}`}></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pendientes de Pago
            </span>
            <span className={`text-3xl font-extrabold mt-1 tabular-nums ${pendStyles.numColor}`}>
              {kpis.opsPendientes}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendStyles.bgIcon} ${pendStyles.textIcon}`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <pendStyles.Icon className={`w-3.5 h-3.5 ${pendStyles.subtextColor}`} />
          <span>{pendStyles.subtitulo}</span>
        </div>
      </div>

      {/* Card 4: Monto Total Ingresos */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Monto Total Ingresos
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
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

      {/* Card 5: Requieren Verificación */}
      <div className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition">
        <div className={`absolute top-0 left-0 right-0 h-1 ${reqStyles.barColor}`}></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Requieren Verificación
            </span>
            <span className={`text-3xl font-extrabold mt-1 tabular-nums ${reqStyles.numColor}`}>
              {kpis.reqVerificacion}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${reqStyles.bgIcon} ${reqStyles.textIcon}`}>
            {sinDatos
              ? <FileText className="w-5 h-5" />
              : todoCotejado
                ? <ShieldCheck className="w-5 h-5" />
                : <ShieldAlert className="w-5 h-5" />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <reqStyles.Icon className={`w-3.5 h-3.5 ${reqStyles.subtextColor}`} />
          <span>{reqStyles.subtitulo}</span>
        </div>
      </div>
    </div>
  );
}