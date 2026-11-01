import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { notifyToast } from '../components/ui/toastEvents';

export function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  const avisoMostrado = useRef(false);
  const accesoDenegado = !loading && Boolean(user) && !allowedRoles.includes(user.rol);

  useEffect(() => {
    if (accesoDenegado && !avisoMostrado.current) {
      avisoMostrado.current = true;
      notifyToast('Acceso denegado: no tienes permisos para ver este módulo.', 'warning');
    }
  }, [accesoDenegado]);

  if (loading) {
    return <div className="p-8 text-center">Cargando permisos...</div>;
  }

  if (!user || !allowedRoles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}