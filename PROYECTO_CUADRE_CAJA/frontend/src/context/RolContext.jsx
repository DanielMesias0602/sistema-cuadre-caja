import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const RolContext = createContext(null);

export function RolProvider({ children }) {
  const { user } = useAuth();

  const idRolActual = user?.id_rol || null;
  const nombreRol = user?.rol || null;

  const isAdmin = () => idRolActual === 1;
  const puedeGestionarUsuarios = () => idRolActual === 1;
  const puedeGestionarRoles = () => idRolActual === 1;

  return (
    <RolContext.Provider
      value={{
        idRolActual,
        nombreRol,
        isAdmin,
        puedeGestionarUsuarios,
        puedeGestionarRoles,
      }}
    >
      {children}
    </RolContext.Provider>
  );
}

export function useRol() {
  const context = useContext(RolContext);
  if (!context) {
    throw new Error('useRol debe ser utilizado dentro de un RolProvider');
  }
  return context;
}
