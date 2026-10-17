import api from '../lib/api';

export const rolesService = {
  listar: () => api.get('/roles'),
  obtener: (id) => api.get(`/roles/${id}`),
};
