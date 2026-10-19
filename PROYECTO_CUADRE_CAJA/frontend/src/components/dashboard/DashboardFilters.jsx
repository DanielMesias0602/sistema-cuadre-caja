import { Search, Calendar, Filter, RotateCcw, Minus } from 'lucide-react';

export function DashboardFilters({ filters, onFilterChange, onReset }) {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const esHoy = filters.fecha_desde === fechaHoy && filters.fecha_hasta === fechaHoy;

  const setHoy = () => {
    onFilterChange({ fecha_desde: fechaHoy, fecha_hasta: fechaHoy });
  };

  const setTodos = () => {
    onFilterChange({ fecha_desde: '', fecha_hasta: '' });
  };
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Búsqueda rápida
          </label>
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar comprobante o usuario..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/30 border border-transparent focus:border-orange-500 transition"
            />
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Rango de fechas
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 h-10 flex-1 min-w-[200px]">
              <Calendar className="text-slate-400 w-4 h-4 flex-shrink-0" />
              <input
                type="date"
                value={filters.fecha_desde || ''}
                onChange={(e) => onFilterChange({ fecha_desde: e.target.value })}
                className="flex-1 border-0 bg-transparent outline-none text-sm text-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-400 flex-shrink-0">-</span>
              <input
                type="date"
                value={filters.fecha_hasta || ''}
                onChange={(e) => onFilterChange({ fecha_hasta: e.target.value })}
                className="flex-1 border-0 bg-transparent outline-none text-sm text-slate-700 focus:ring-0 cursor-pointer"
              />
            </div>
            
            {/* Toggle Group */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 w-full sm:w-auto min-w-[140px]">
              <button
                type="button"
                onClick={setHoy}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition text-center justify-center ${
                  esHoy 
                    ? 'bg-white shadow-sm text-slate-900' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={setTodos}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition text-center justify-center ${
                  !esHoy 
                    ? 'bg-white shadow-sm text-slate-900' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        {/* Shift Selector */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Turno
          </label>
          <select
            value={filters.turno || ''}
            onChange={(e) => onFilterChange({ turno: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-orange/30 border border-transparent focus:border-brand-orange transition cursor-pointer"
          >
            <option value="">Todos los turnos</option>
            <option value="Mañana">Mañana (Antes de 14:00)</option>
            <option value="Tarde">Tarde (14:00 a 20:00)</option>
          </select>
        </div>

        {/* Status Selector (Solo estados oficiales) */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Estado
          </label>
          <select
            value={filters.estado || ''}
            onChange={(e) => onFilterChange({ estado: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/30 border border-transparent focus:border-orange-500 transition cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="PAGADA">PAGADA</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="ANULADA">ANULADA</option>
          </select>
        </div>
      </div>

      {/* Filter Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Vista: Tabla Operativa</span>
        </div>
        <div className="flex items-center gap-3">
          {(filters.search || filters.fecha_desde || filters.turno || filters.estado) && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span>Buscar operaciones</span>
          </button>
        </div>
      </div>
    </div>
  );
}