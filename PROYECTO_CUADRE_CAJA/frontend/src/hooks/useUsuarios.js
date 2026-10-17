import { useState, useEffect, useCallback } from 'react';
import { usuariosService, extractData } from '../services/usuarios.service';

export function useUsuarios() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usuariosService.listar();
      setData(extractData(response));
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const crear = useCallback(async (usuarioData) => {
    try {
      await usuariosService.crear(usuarioData);
      await fetchUsuarios();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al crear usuario' };
    }
  }, [fetchUsuarios]);

  const actualizar = useCallback(async (id, usuarioData) => {
    try {
      await usuariosService.actualizar(id, usuarioData);
      await fetchUsuarios();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al actualizar usuario' };
    }
  }, [fetchUsuarios]);

  const cambiarEstado = useCallback(async (id, estado) => {
    try {
      await usuariosService.cambiarEstado(id, estado);
      await fetchUsuarios();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al cambiar estado' };
    }
  }, [fetchUsuarios]);

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
    refetch: fetchUsuarios,
    crear,
    actualizar,
    cambiarEstado,
    resetPassword,
  };
}
