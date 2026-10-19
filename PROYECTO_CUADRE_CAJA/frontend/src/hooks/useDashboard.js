import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboard.service';

export function useDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [pagosPorMedio, setPagosPorMedio] = useState([]);
  const [operacionesRecientes, setOperacionesRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cargar filtros desde sessionStorage
  const hoy = new Date().toISOString().split('T')[0];
  const savedFilters = sessionStorage.getItem('dashboardFilters');
  const initialFilters = savedFilters ? JSON.parse(savedFilters) : {
    fecha_desde: hoy,
    fecha_hasta: hoy,
    turno: '',
    estado: '',
    search: '',
  };
  
  const [filters, setFilters] = useState(initialFilters);
  
  // Guardar filtros en sessionStorage cuando cambian
  useEffect(() => {
    sessionStorage.setItem('dashboardFilters', JSON.stringify(filters));
  }, [filters]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = {};
      if (filters.fecha_desde) activeFilters.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) activeFilters.fecha_hasta = filters.fecha_hasta;

      const [dashData, pagosData, opsData] = await Promise.all([
        dashboardService.getDashboardData(activeFilters),
        dashboardService.getPagosPorMedio(activeFilters),
        dashboardService.getOperacionesRecientes(activeFilters),
      ]);

      setMetrics(dashData);
      setPagosPorMedio(pagosData || []);
      setOperacionesRecientes(opsData || []);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Error al cargar los datos del Dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    metrics,
    pagosPorMedio,
    operacionesRecientes,
    loading,
    error,
    filters,
    updateFilters,
    refetch: fetchDashboardData,
    // KPIs normalizados para fácil acceso
    kpis: metrics?.kpis || {
      operaciones_registradas: 0,
      operaciones_con_pago: 0,
      monto_total: 0,
      requieren_verificacion: 0,
    },
  };
}
