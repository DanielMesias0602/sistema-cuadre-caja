let socketServer = null;
let actualizacionPendiente = false;
let detalleActualizacionPendiente = null;

export const configurarSocket = (io) => {
  socketServer = io;
};

export const emitirEvento = (evento, data) => {
  if (!socketServer) {
    console.warn(`No se pudo emitir el evento Socket.IO "${evento}": servidor no inicializado`);
    return false;
  }

  socketServer.emit(evento, data);
  if (evento !== 'datos_actualizados') {
    detalleActualizacionPendiente = { evento, data };
    if (!actualizacionPendiente) {
      actualizacionPendiente = true;
      setImmediate(() => {
        actualizacionPendiente = false;
        const detalle = detalleActualizacionPendiente;
        detalleActualizacionPendiente = null;
        socketServer?.emit('datos_actualizados', detalle);
      });
    }
  }
  return true;
};
