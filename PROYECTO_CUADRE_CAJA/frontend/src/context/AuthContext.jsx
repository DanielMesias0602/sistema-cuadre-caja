import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(authService.getToken()));

  const checkAuth = useCallback(async () => {
    const existingToken = authService.getToken();
    if (!existingToken) {
      authService.logout();
      return;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setToken(existingToken);
      } else {
        authService.logout();
        setUser(null);
        setToken(null);
      }
    } catch {
      authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(checkAuth);
  }, [checkAuth]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      setToken(data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // 1. Limpiamos el token y usuario del localStorage
    authService.logout();
    
    // 2. Limpiamos los estados de React
    setUser(null);
    setToken(null);

    // 3. Redirigimos usando la BASE_URL de Vite (respetando /cuadrecaja/)
    const baseUrl = import.meta.env.BASE_URL || '/cuadrecaja/';
    window.location.href = `${baseUrl}login`; 
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}