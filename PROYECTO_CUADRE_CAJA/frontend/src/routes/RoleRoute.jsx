import { Navigate } from 'react-router-dom';
import { useRol } from '../context/RolContext';

export function RoleRoute({ allowedRoles, children }) {
  const { idRolActual } = useRol();

  if (!idRolActual || !allowedRoles.includes(idRolActual)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
