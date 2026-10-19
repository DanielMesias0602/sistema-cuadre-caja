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
  
  let turnoInfo = {
    nombre: 'Fuera de horario',
    icon: Clock,
  };

  if (currentHour < 14) {
    turnoInfo = {
      nombre: 'Turno Mañana',
      icon: Sun,
    };
  } else if (currentHour >= 14 && currentHour < 20) {
    turnoInfo = {
      nombre: 'Turno Tarde',
      icon: Moon,
    };
  }

  const IconComponent = turnoInfo.icon;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Operaciones y Dashboard
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <IconComponent className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700 tracking-wide">{turnoInfo.nombre} • {currentDateStr}</span>
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