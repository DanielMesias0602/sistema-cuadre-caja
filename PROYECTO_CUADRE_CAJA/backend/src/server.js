import 'dotenv/config';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import app from './app.js';
import { configurarSocket } from './services/socket.service.js';

const PORT = Number(process.env.PORT) || 3000;

const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }

  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Token inválido o expirado'));
  }
});

configurarSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('Error del servidor:', error);
});

server.on('close', () => {
  console.log('Servidor cerrado');
});

process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  io.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  io.close(() => {
    process.exit(0);
  });
});