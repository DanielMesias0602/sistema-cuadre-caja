import { createContext, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const obtenerConfiguracionSocket = () => ({
  url: import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin,
  path: import.meta.env.DEV ? '/socket.io' : '/cuadrecaja/socket.io',
});

export function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const socket = useMemo(() => {
    if (!isAuthenticated || !token) return null;
    const { url, path } = obtenerConfiguracionSocket();
    return io(url, {
      path,
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
