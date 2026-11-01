import { createContext, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const obtenerUrlSocket = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    return new URL(apiUrl).origin;
  }

  return window.location.origin;
};

export function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const socket = useMemo(() => {
    if (!isAuthenticated || !token) return null;
    return io(obtenerUrlSocket(), {
      path: '/socket.io',
      auth: { token },
      autoConnect: false,
    });
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleConnectionError = (error) => {
      console.error('Error de conexión en tiempo real:', error.message);
    };

    socket.on('connect_error', handleConnectionError);
    socket.connect();

    return () => {
      socket.off('connect_error', handleConnectionError);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;
