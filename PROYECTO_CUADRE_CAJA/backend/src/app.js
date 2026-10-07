import express from 'express';
import cors from 'cors';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import comprobanteRoutes from './routes/comprobante.routes.js';
import operacionRoutes from './routes/operacion.routes.js';
import medioPagoRoutes from './routes/medioPago.routes.js';
import pagoRoutes from './routes/pago.routes.js';
import evidenciaRoutes from './routes/evidencia.routes.js';
import verificacionPagoRoutes from './routes/verificacionPago.routes.js';
import cierreCajaRoutes from './routes/cierreCaja.routes.js';
import tipoSalidaRoutes from './routes/tipoSalida.routes.js';
import salidaCajaRoutes from './routes/salidaCaja.routes.js';
import anulacionRoutes from './routes/anulacion.routes.js';
import notaCreditoRoutes from './routes/notaCredito.routes.js';
import conciliacionRoutes from './routes/conciliacion.routes.js';
import detalleConciliacionRoutes
  from './routes/detalleConciliacion.routes.js';
import reporteRoutes from './routes/reporte.routes.js';

import {
  notFoundHandler,
  errorHandler
} from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/comprobantes', comprobanteRoutes);
app.use('/api/operaciones', operacionRoutes);
app.use('/api/medios-pago', medioPagoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/evidencias', evidenciaRoutes);
app.use('/api/anulaciones', anulacionRoutes);

app.use(
  '/api/verificaciones-pago',
  verificacionPagoRoutes
);

app.use(
  '/api/cierres-caja',
  cierreCajaRoutes
);
app.use(
  '/api/tipos-salida',
  tipoSalidaRoutes
);

app.use(
  '/api/salidas-caja',
  salidaCajaRoutes
);

app.use(
  '/api/notas-credito',
  notaCreditoRoutes
);

app.use(
  '/api/conciliaciones',
  conciliacionRoutes
);

app.use(
  '/api/detalles-conciliaciones',
  detalleConciliacionRoutes
);

app.use('/api/reportes', reporteRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
