import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardHeader({ user }) {
  const navigate = useNavigate();
  const currentDateStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Operaciones y Dashboard
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold shadow-xs border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Turno Activo • {currentDateStr} • Caja abierta</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Consulta las operaciones registradas, medios de pago e indicadores en tiempo real.
        </p>
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto">
        <button
          type="button"
          onClick={() => navigate('/operaciones/nueva')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-sm transition shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva operación</span>
        </button>
      </div>
    </div>
  );
}