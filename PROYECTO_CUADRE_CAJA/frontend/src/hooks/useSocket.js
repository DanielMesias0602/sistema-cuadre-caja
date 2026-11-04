import { useContext, useEffect, useRef } from 'react';
import SocketContext from '../context/SocketContext';

export function useSocket() {
  return useContext(SocketContext);
}

export function useDatosActualizados(callback) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleDatosActualizados = (event) => {
      callbackRef.current?.(event.detail);
    };

    window.addEventListener('datos_actualizados', handleDatosActualizados);
    return () => window.removeEventListener('datos_actualizados', handleDatosActualizados);
  }, []);
}
