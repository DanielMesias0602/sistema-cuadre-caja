import axios from 'axios';
import { authService } from './auth.service';

const BASE_URL = import.meta.env.DEV ? '/api' : '/cuadrecaja/api';

export const dashboardService = {
  async getDashboardData(filters = {}) {
    const token = authService.getToken();
    const response = await axios.get(`${BASE_URL}/reportes/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: filters,
    });
    
    // El backend responde: { status: "success", data: { resumen, operaciones, pagos, ... } }
    const data = response.data?.data || response.data;
    
    // Extraer y normalizar los KPIs del Dashboard
    const resumen = data?.resumen || {};
    const operaciones = data?.operaciones || {};
    
    return {
      resumen,
      operaciones,
      pagos: data?.pagos || {},
      indicadores: data?.indicadores_tiempo_cierre || {},
      // KPIs normalizados para el frontend
      kpis: {
        operaciones_registradas: operaciones.total_operaciones ?? 0,
        operaciones_con_pago: operaciones.operaciones_con_pago ?? 0,
        monto_total: parseFloat(resumen.total_ingresos ?? 0),
        requieren_verificacion: operaciones.operaciones_con_verificacion ?? 0,
      },
    };
  },

  async getPagosPorMedio(filters = {}) {
    const token = authService.getToken();
    const response = await axios.get(`${BASE_URL}/reportes/pagos-por-medio`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: filters,
    });
    return response.data?.data || [];
  },

  async getOperacionesRecientes(filters = {}) {
    const token = authService.getToken();
    const response = await axios.get(`${BASE_URL}/reportes/operaciones`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: filters,
    });
    return response.data?.data || [];
  },
};
