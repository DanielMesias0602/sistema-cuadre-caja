import { useState } from 'react';
import { Search, Calendar, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { DateRangePicker } from '../ui/DateRangePicker';

export function DashboardFilters({ filters, onFilterChange, onReset }) {
  const [expandidoMovil, setExpandidoMovil] = useState(false);

  const fechaHoy = new Date().toLocaleDateString('en-CA');
  const esHoy = filters.fecha_desde === fechaHoy && filters.fecha_hasta === fechaHoy;

  const setHoy = () => {
    onFilterChange({ fecha_desde: fechaHoy, fecha_hasta: fechaHoy });
  };

  const setTodos = () => {
    onFilterChange({ fecha_desde: '', fecha_hasta: '' });
  };

  const hayFiltrosActivos = Boolean(
    filters.search || filters.fecha_desde || filters.fecha_hasta || filters.turno || filters.estado
  );

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 sm:p-5 mb-4 sm:mb-6">
      {/* Buscador (siempre visible) */}
      <div className="flex flex-col gap-2 sm:hidden">
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

        <button
          type="button"
          onClick={() => setExpandidoMovil(!expandidoMovil)}
          className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            Filtros avanzados
            {hayFiltrosActivos && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange"></span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expandidoMovil ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Grid de filtros (colapsable en móvil, siempre visible en sm+) */}
      <div className={`${expandidoMovil ? 'block' : 'hidden'} sm:block mt-3 sm:mt-0`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Search Input (solo desktop) */}
          <div className="hidden sm:flex lg:col-span-3 flex-col justify-center">
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

          {/* Date Range */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Rango de fechas
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex-1 min-w-[240px]">
                <DateRangePicker
                  fechaDesde={filters.fecha_desde}
                  fechaHasta={filters.fecha_hasta}
                  onChange={({ fechaDesde, fechaHasta }) =>
                    onFilterChange({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
                  }
                />
              </div>

              <div className="flex items-center bg-slate-100 rounded-lg p-1 w-full sm:w-auto min-w-[140px] h-[42px]">
                <button
                  type="button"
                  onClick={setHoy}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition text-center justify-center ${
                    esHoy ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={setTodos}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition text-center justify-center ${
                    !esHoy ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>
          </div>

          {/* Turno */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Turno
            </label>
            <select
              value={filters.turno || ''}
              onChange={(e) => onFilterChange({ turno: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-orange/30 border border-transparent focus:border-brand-orange transition cursor-pointer"
            >
              <option value="">Todos los turnos</option>
              <option value="Mañana">Mañana (Antes de 14:00)</option>
              <option value="Tarde">Tarde (14:00 a 20:00)</option>
            </select>
          </div>

          {/* Estado */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estado
            </label>
            <select
              value={filters.estado || ''}
              onChange={(e) => onFilterChange({ estado: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-slate-800 text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/30 border border-transparent focus:border-orange-500 transition cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="PAGADA">PAGADA</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-gray-100">
        <span className="text-[11px] sm:text-xs font-semibold text-gray-500">
          Vista: Tabla Operativa
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar filtros</span>
              <span className="sm:hidden">Limpiar</span>
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Buscar</span>
            <span className="hidden sm:inline">operaciones</span>
          </button>
        </div>
      </div>
    </div>
  );
}