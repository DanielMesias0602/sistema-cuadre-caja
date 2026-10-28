import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { SummaryGrid } from '../components/dashboard/SummaryGrid';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { PagosPorMedioSection } from '../components/dashboard/PagosPorMedioSection';
import { OperacionesRecientesTable } from '../components/dashboard/OperacionesRecientesTable';
import { OperacionDetailDrawer } from '../components/dashboard/OperacionDetailDrawer';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const {
    metrics,
    operacionesRecientes,
    loading,
    error,
    filters,
    updateFilters,
    refetch,
  } = useDashboard();

  const [selectedOp, setSelectedOp] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const operacionSeleccionada = selectedOp || operacionesRecientes[0] || null;

  const handleResetFilters = () => {
    updateFilters({
      search: '',
      fecha_desde: '',
      fecha_hasta: '',
      turno: '',
      estado: '',
    });
  };

  const filteredOps = operacionesRecientes.filter((op) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchComp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.toLowerCase();
      const matchUser = (op.usuario || '').toLowerCase();
      if (!matchComp.includes(q) && !matchUser.includes(q)) return false;
    }
    if (filters.turno) {
      const horaRegistroRaw = op.hora_registro || op.hora;
      const horaRegistro = typeof horaRegistroRaw === 'string' ? horaRegistroRaw : '00:00';
      const [horas, minutos, segundos] = horaRegistro.split(':').map(Number);
      const horaDecimal = horas + minutos / 60 + segundos / 3600;

      if (filters.turno === 'Mañana' && horaDecimal >= 14) return false;
      if (filters.turno === 'Tarde' && (horaDecimal < 14 || horaDecimal >= 20)) return false;
    }
    if (filters.estado && op.estado) {
      if (op.estado.toUpperCase() !== filters.estado.toUpperCase()) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <DashboardHeader user={user} />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-800 dark:text-rose-300 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-1.5 bg-red-100 dark:bg-rose-900/50 hover:bg-red-200 dark:hover:bg-rose-900 text-red-800 dark:text-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Top KPI Cards Grid (Skeletons) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-gray-100 dark:border-slate-600 h-32">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <SummaryGrid filteredOps={filteredOps} />
      )}

      {/* Advanced Filter Panel */}
      <DashboardFilters
        filters={filters}
        onFilterChange={updateFilters}
        onReset={handleResetFilters}
      />

      {/* Main Workspace Grid */}
      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-xs dark:shadow-none space-y-4">
          <RefreshCw className="w-8 h-8 text-brand-orange dark:text-orange-400 animate-spin" />
          <span className="text-gray-500 dark:text-slate-400 font-semibold text-sm">Cargando métricas del Dashboard...</span>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-6 items-start ${drawerAbierto ? 'xl:grid-cols-12' : 'xl:grid-cols-1'}`}>
          {/* Table & Payments Column */}
          <div className={`space-y-6 ${drawerAbierto ? 'xl:col-span-8' : 'xl:col-span-1'}`}>
            <OperacionesRecientesTable
              operaciones={filteredOps}
              selectedOpId={operacionSeleccionada?.id_operacion}
              onSelectOp={(op) => {
                setSelectedOp(op);
                setDrawerAbierto(true);
              }}
            />
            <PagosPorMedioSection filteredOps={filteredOps} />
          </div>

          {/* Detail Drawer Column */}
          {drawerAbierto && (
            <div className="xl:col-span-4 xl:sticky xl:top-24 animate-fade-in">
              <OperacionDetailDrawer
                selectedOp={operacionSeleccionada}
                onClose={() => setDrawerAbierto(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;