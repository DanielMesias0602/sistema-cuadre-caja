import { FileText, Clock, Wallet, AlertTriangle, Calendar, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function SummaryGrid({ metrics }) {
  const resumen = metrics?.resumen || {};
  const operaciones = metrics?.operaciones || {};
  const pagos = metrics?.pagos || {};

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalOps = operaciones.total_operaciones || 0;
  const totalMonto = resumen.total_ingresos || 0;
  const reqVerificacion = operaciones.operaciones_con_verificacion || 0;

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
              {totalOps}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Registros del día en curso</span>
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
              {operaciones.operaciones_con_pago || 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <Layers className="w-3.5 h-3.5 text-brand-orange" />
          <span>{operaciones.operaciones_con_pagos_completos || 0} pagos completos</span>
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
              {formatCurrency(totalMonto)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Efectivo esperado: {formatCurrency(resumen.efectivo_esperado)}</span>
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
              {reqVerificacion}
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
