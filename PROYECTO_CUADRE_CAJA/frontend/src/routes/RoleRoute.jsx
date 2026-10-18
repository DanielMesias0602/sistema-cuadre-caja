import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Cargando permisos...</div>;
  }

  if (!user || !allowedRoles.includes(user.rol)) {
    // Si no tiene permiso, lo redirige al dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}