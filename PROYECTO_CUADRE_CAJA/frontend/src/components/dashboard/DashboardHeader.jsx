import { Plus, Clock, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardHeader({ user }) {
  const navigate = useNavigate();

  const currentDateStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const currentHour = new Date().getHours();

  let turnoInfo = { nombre: 'Fuera de horario', icon: Clock };
  if (currentHour < 14) {
    turnoInfo = { nombre: 'Turno Mañana', icon: Sun };
  } else if (currentHour >= 14 && currentHour < 20) {
    turnoInfo = { nombre: 'Turno Tarde', icon: Moon };
  }

  const IconComponent = turnoInfo.icon;

  return (
    <div className="flex flex-col gap-3 mb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-2 min-w-0">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight sm:text-2xl lg:text-3xl">
          Dashboard
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <IconComponent className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-700 tracking-wide">
              {turnoInfo.nombre} · {currentDateStr}
            </span>
          </div>
        </div>

        <p className="hidden sm:block text-sm text-slate-500">
          Consulta las operaciones registradas, medios de pago e indicadores en tiempo real.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/operaciones/nueva')}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-sm transition shadow-md active:scale-95 cursor-pointer w-full sm:w-auto"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>Nueva operación</span>
      </button>
    </div>
  );
}