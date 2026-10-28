import { useState, useEffect, useCallback } from 'react';
import { rolesService } from '../services/roles.service';

export function useRoles() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await rolesService.listar();
      setData(response.data?.data || response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRoles);
  }, [fetchRoles]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchRoles();
  }, [fetchRoles]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
