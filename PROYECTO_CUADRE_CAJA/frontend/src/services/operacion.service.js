import api from '../lib/api';

export const operacionService = {
  // Función para traer todas las operaciones (para el Dashboard)
  getAll: async () => {
    const response = await api.get('/operaciones');
    return response.data;
  },

  // Función para traer una operación por ID
  getById: async (id) => {
    const response = await api.get(`/operaciones/${id}`);
    return response.data;
  },

  // Función NUEVA para registrar todo el flujo (Comprobante + Operación + Pagos + Evidencias)
  registrarUnificado: async (payload) => {
    const response = await api.post('/operaciones/registrar-unificado', payload);
    return response.data;
  }
};

export default operacionService;