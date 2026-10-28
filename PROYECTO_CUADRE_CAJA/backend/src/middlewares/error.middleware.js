export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (error, req, res, next) => {
  console.error(error);

  // PUNTO 2: Manejo específico para errores de PostgreSQL (Unique Violation)
  if (error.code === '23505') {
    let mensajeAmigable = 'El registro ya existe en el sistema.';
    
    // Identificamos qué restricción falló para dar un mensaje exacto
    if (error.constraint === 'uq_comprobante_tipo_serie_numero') {
      mensajeAmigable = 'El comprobante (tipo, serie y número) ya se encuentra registrado en el sistema. Verifique los datos.';
    } else if (error.constraint === 'uq_evidencia_storage_key') {
      mensajeAmigable = 'Esta imagen de evidencia ya fue subida anteriormente al sistema.';
    } else if (error.constraint === 'uq_operacion_comprobante') {
      mensajeAmigable = 'Ya existe una operación registrada para este comprobante.';
    }

    return res.status(400).json({
      status: 'error',
      message: mensajeAmigable
    });
  }

  // Manejo de errores personalizados lanzados por los services (Ej: sobrepago, salidas inválidas)
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    status: 'error',
    message:
      statusCode === 500
        ? 'Error interno del servidor'
        : error.message
  });
};