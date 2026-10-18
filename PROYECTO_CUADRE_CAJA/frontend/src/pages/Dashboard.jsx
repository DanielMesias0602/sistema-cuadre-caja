import { useState, useEffect } from 'react';
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
    pagosPorMedio,
    operacionesRecientes,
    loading,
    error,
    filters,
    updateFilters,
    refetch,
  } = useDashboard();

  const [selectedOp, setSelectedOp] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    if (operacionesRecientes && operacionesRecientes.length > 0 && !selectedOp) {
      setSelectedOp(operacionesRecientes[0]);
    }
  }, [operacionesRecientes, selectedOp]);

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
    if (filters.turno && op.turno) {
      if (!op.turno.toLowerCase().includes(filters.turno.toLowerCase())) return false;
    }
    if (filters.estado && op.estado_operacion) {
      if (op.estado_operacion.toUpperCase() !== filters.estado.toUpperCase()) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader user={user} />

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Top KPI Cards Grid */}
      {loading || !metrics?.resumen ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 h-32">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <SummaryGrid metrics={metrics} />
      )}

      {/* Advanced Filter Panel */}
      <DashboardFilters
        filters={filters}
        onFilterChange={updateFilters}
        onReset={handleResetFilters}
      />

      {/* Main Workspace Grid: Payments Breakdown & Operations Workspace + Detail Drawer */}
      {loading && !metrics ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <RefreshCw className="w-8 h-8 text-brand-orange animate-spin" />
          <span className="text-gray-500 font-semibold text-sm">Cargando métricas del Dashboard...</span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Table & Payments Column */}
            <div className="xl:col-span-8 space-y-6">
              <OperacionesRecientesTable
                operaciones={filteredOps}
                selectedOpId={selectedOp?.id_operacion}
                onSelectOp={(op) => {
                  setSelectedOp(op);
                  setDrawerAbierto(true);
                }}
              />
              <PagosPorMedioSection pagosPorMedio={pagosPorMedio} />
            </div>

            {/* Detail Drawer Column */}
            <div className="xl:col-span-4 xl:sticky xl:top-24">
              {drawerAbierto && (
                <OperacionDetailDrawer
                  selectedOp={selectedOp}
                  onClose={() => setDrawerAbierto(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;