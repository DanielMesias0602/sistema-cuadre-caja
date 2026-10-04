export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (error, req, res, next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    status: 'error',
    message:
      statusCode === 500
        ? 'Error interno del servidor'
        : error.message
  });
};