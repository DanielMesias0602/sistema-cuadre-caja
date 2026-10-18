import { Search, Calendar, Filter, RotateCcw } from 'lucide-react';

export function DashboardFilters({ filters, onFilterChange, onReset }) {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-4 flex flex-col justify-center">
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

        {/* Date Selector */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Fecha
          </label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-3.5 text-gray-400 w-4 h-4 pointer-events-none" />
            <input
              type="date"
              value={filters.fecha_desde || ''}
              onChange={(e) => onFilterChange({ fecha_desde: e.target.value, fecha_hasta: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/30 border border-transparent focus:border-orange-500 transition cursor-pointer"
            />
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
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/30 border border-transparent focus:border-orange-500 transition cursor-pointer"
          >
            <option value="">Todos los turnos</option>
            <option value="Mañana">Turno Mañana</option>
            <option value="Tarde">Turno Tarde</option>
          </select>
        </div>

        {/* Status Selector (Solo estados oficiales) */}
        <div className="lg:col-span-3 flex flex-col justify-center">
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