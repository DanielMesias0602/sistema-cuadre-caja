import api from '../lib/api';

export const usuariosService = {
  listar: () => api.get('/usuarios'),
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  cambiarEstado: (id, estado) => api.patch(`/usuarios/${id}/estado`, { estado }),
  resetPassword: (id, password) => api.patch(`/usuarios/${id}/password`, { password }),
};

// Helper para extraer data de la respuesta del backend { status, data }
// Maneja tanto arrays como objetos
export const extractData = (response) => {
  const raw = response?.data;
  if (!raw) return [];
  
  // Si ya es un array, devolverlo
  if (Array.isArray(raw)) return raw;
  
  // Si tiene data y es array, devolver data
  if (raw.data && Array.isArray(raw.data)) return raw.data;
  
  // Si tiene data y es objeto, devolver data
  if (raw.data) return raw.data;
  
  // Si no, devolver el objeto completo
  return raw;
};
