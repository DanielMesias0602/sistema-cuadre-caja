import api from '../lib/api';

export const usuariosService = {
  listar: () => api.get('/usuarios'),
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  cambiarEstado: (id, estado) => api.patch(`/usuarios/${id}/estado`, { estado }),
  resetPassword: (id, password) => api.patch(`/usuarios/${id}/password`, { password }),
  eliminar: (id) => api.delete(`/usuarios/${id}`), // <-- NUEVO
};

export const extractData = (response) => {
  const raw = response?.data;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.data && Array.isArray(raw.data)) return raw.data;
  if (raw.data) return raw.data;
  return raw;
};