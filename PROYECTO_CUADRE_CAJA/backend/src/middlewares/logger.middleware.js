export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const metodo = req.method;
  const url = req.originalUrl;
  console.log(`[${timestamp}] ${metodo} ${url}`);
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
