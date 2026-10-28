import { useState, useEffect, useCallback } from 'react';
import { usuariosService, extractData } from '../services/usuarios.service';

export function useUsuarios() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await usuariosService.listar();
      setData(extractData(response));
      setError(null);
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsuarios);
  }, [fetchUsuarios]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchUsuarios();
  }, [fetchUsuarios]);

  const crear = useCallback(async (usuarioData) => {
    try {
      await usuariosService.crear(usuarioData);
      await refetch();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al crear usuario' };
    }
  }, [refetch]);

  const actualizar = useCallback(async (id, usuarioData) => {
    try {
      await usuariosService.actualizar(id, usuarioData);
      await refetch();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al actualizar usuario' };
    }
  }, [refetch]);

  const cambiarEstado = useCallback(async (id, estado) => {
    try {
      await usuariosService.cambiarEstado(id, estado);
      await refetch();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al cambiar estado' };
    }
  }, [refetch]);

  const resetPassword = useCallback(async (id, password) => {
    try {
      await usuariosService.resetPassword(id, password);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al resetear contraseña' };
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    crear,
    actualizar,
    cambiarEstado,
    resetPassword,
  };
}
