import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
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
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
});