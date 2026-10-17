import { useState, useEffect, useCallback } from 'react';
import { rolesService } from '../services/roles.service';

export function useRoles() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rolesService.listar();
      setData(response.data?.data || response.data);
    } catch (err) {
      setError(err.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    data,
    loading,
    error,
    refetch: fetchRoles,
  };
}
