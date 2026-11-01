export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const usuario = req.user?.usuario || 'anónimo';
  const metodo = req.method;
  const url = req.originalUrl;

  console.log(`[${timestamp}] → ${metodo} ${url} (usuario: ${usuario})`);

  res.on('finish', () => {
    const duracion = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ← ${metodo} ${url} → ${res.statusCode} (${duracion}ms)`);
  });

  next();
};

export const errorLogger = (error, req, res, next) => {
  console.error('═══════════════════════════════════════');
  console.error(`ERROR en ${req.method} ${req.originalUrl}`);
  console.error('Mensaje:', error.message);
  console.error('Stack:', error.stack);
  console.error('═══════════════════════════════════════');
  next(error);
};
