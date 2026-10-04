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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;