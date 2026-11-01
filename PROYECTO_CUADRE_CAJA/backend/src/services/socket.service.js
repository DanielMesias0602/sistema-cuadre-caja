let socketServer = null;

export const configurarSocket = (io) => {
  socketServer = io;
};

export const emitirEvento = (evento, data) => {
  if (!socketServer) {
    console.warn(`No se pudo emitir el evento Socket.IO "${evento}": servidor no inicializado`);
    return false;
  }

  socketServer.emit(evento, data);
  return true;
};
