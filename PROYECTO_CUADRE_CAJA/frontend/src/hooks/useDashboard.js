import { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardService } from '../services/dashboard.service';
import { useSocket } from './useSocket';

export function useDashboard() {
  const socket = useSocket();
  const [metrics, setMetrics] = useState(null);
  const [pagosPorMedio, setPagosPorMedio] = useState([]);
  const [operacionesRecientes, setOperacionesRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hoy = new Date().toLocaleDateString('en-CA');

  // 🔥 CAMBIO CLAVE: Por defecto, el filtro es "Todos" (fechas vacías)
  let initialFilters = {
    fecha_desde: '',
    fecha_hasta: '',
    turno: '',
    estado: '',
    search: '',
  };

  try {
    const saved = sessionStorage.getItem('dashboardFilters');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Si la fecha guardada es futura (bug UTC antiguo), la limpiamos
      if (parsed.fecha_desde && parsed.fecha_desde > hoy) {
        parsed.fecha_desde = '';
      }
      if (parsed.fecha_hasta && parsed.fecha_hasta > hoy) {
        parsed.fecha_hasta = '';
      }
      initialFilters = { ...initialFilters, ...parsed };
    }
  } catch {
    // Fallback a initialFilters
  }

  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    sessionStorage.setItem('dashboardFilters', JSON.stringify(filters));
  }, [filters]);

  const fetchDashboardData = useCallback(async () => {
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
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Error al cargar los datos del Dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void Promise.resolve().then(fetchDashboardData);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!socket) return undefined;
    const actualizarDashboard = () => {
      void fetchDashboardData();
    };
    const eventos = ['operacion_creada', 'pago_actualizado', 'ajuste_creado'];
    eventos.forEach((evento) => socket.on(evento, actualizarDashboard));

    return () => {
      eventos.forEach((evento) => socket.off(evento, actualizarDashboard));
    };
  }, [socket, fetchDashboardData]);

  const updateFilters = (newFilters) => {
    setLoading(true);
    setError(null);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchDashboardData();
  }, [fetchDashboardData]);

  const operacionesFiltradas = useMemo(() => operacionesRecientes.filter((op) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchComp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.toLowerCase();
      const matchUser = (op.usuario || '').toLowerCase();
      if (!matchComp.includes(q) && !matchUser.includes(q)) return false;
    }

    if (filters.turno) {
      const turnoOperacion = String(op.turno || '').trim().toLocaleUpperCase();
      if (turnoOperacion !== filters.turno.trim().toLocaleUpperCase()) return false;
    }

    if (filters.estado) {
      const estadoOperacion = String(op.estado_operacion || op.estado || '').trim().toUpperCase();
      if (estadoOperacion !== filters.estado.trim().toUpperCase()) return false;
    }

    return true;
  }), [operacionesRecientes, filters.search, filters.turno, filters.estado]);

  return {
    metrics,
    pagosPorMedio,
    operacionesRecientes,
    operacionesFiltradas,
    loading,
    error,
    filters,
    updateFilters,
    refetch,
    kpis: metrics?.kpis || {
      operaciones_registradas: 0,
      operaciones_con_pago: 0,
      monto_total: 0,
      requieren_verificacion: 0,
    },
  };
}