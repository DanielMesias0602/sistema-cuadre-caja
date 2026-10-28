import { withTransaction } from '../repositories/base.repository.js';
import {
  createOperacion,
  findOperacionById,
  findAllOperaciones
} from '../repositories/operacion.repository.js';
import { createComprobante } from '../repositories/comprobante.repository.js';
import { createPago } from '../repositories/pago.repository.js';
import { createEvidencia } from '../repositories/evidencia.repository.js';
import { generatePreauthenticatedRequest } from './ociStorage.service.js';

// --- FUNCIONES EXISTENTES ---

export const registerOperacion = async (data) => {
  return createOperacion(data);
};

export const getOperacionById = async (idOperacion) => {
  return findOperacionById(idOperacion);
};

// --- FUNCIÓN DE LISTADO CON ENLACES SEGUROS A OCI ---

export const getOperaciones = async () => {
  const operaciones = await findAllOperaciones();

  const operacionesConLinks = await Promise.all(operaciones.map(async (op) => {
    const pagosConLinks = await Promise.all((op.pagos || []).map(async (pago) => {
      if (pago.evidencia_url && pago.evidencia_url !== 'None') {
        try {
          const signedUrl = await generatePreauthenticatedRequest(pago.evidencia_url, 24);
          if (signedUrl) {
            return { ...pago, evidencia_url: signedUrl };
          }
          return pago;
        } catch (err) {
          console.error("Error generando enlace para evidencia de pago:", err);
          return pago;
        }
      }
      return pago;
    }));

    const evidenciasConLinks = await Promise.all((op.evidencias || []).map(async (evidencia) => {
      if (evidencia.storage_key && evidencia.storage_key !== 'None') {
        try {
          const signedUrl = await generatePreauthenticatedRequest(evidencia.storage_key, 24);
          if (signedUrl) {
            return { ...evidencia, url_firmada: signedUrl };
          }
          return evidencia;
        } catch (err) {
          console.error("Error generando enlace para evidencia:", err);
          return evidencia;
        }
      }
      return evidencia;
    }));

    return {
      ...op,
      pagos: pagosConLinks,
      evidencias: evidenciasConLinks
    };
  }));

  return operacionesConLinks;
};

// --- FUNCIÓN TRANSACCIONAL (Para guardar todo de golpe) ---

export const registerOperacionUnificada = async (data) => {
  const {
    comprobante,
    operacion,
    pagos,
    id_usuario
  } = data;

  const listaEvidencias = Array.isArray(data.evidencias)
    ? data.evidencias
    : [];

  if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
    const error = new Error('La operación debe tener al menos un pago asociado');
    error.statusCode = 400;
    throw error;
  }

  return await withTransaction(async (client) => {
    
    // =================================================================
    // OPCIÓN A: BLOQUEO ESTRICTO DE TURNOS
    // =================================================================
    const dateCheck = await client.query(`SELECT CURRENT_DATE::text as hoy`);
    const hoyStr = dateCheck.rows[0].hoy;
    
    // Solo validamos si la operación es para el día de HOY (ignoramos fechas pasadas)
    if (operacion.fecha === hoyStr) {
      const timeCheck = await client.query(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::time::text as hora_actual`);
      const horaActual = timeCheck.rows[0].hora_actual; // Formato "HH:MM:SS"
      
      // Si es después de las 2:00 PM (14:00:00)
      if (horaActual > '14:00:00') {
        const cierreMananaResult = await client.query(
          `SELECT id_cierre, estado 
           FROM cierre_caja 
           WHERE fecha = $1 AND UPPER(turno) = 'MAÑANA' 
           LIMIT 1`,
          [hoyStr]
        );
        
        const cierreManana = cierreMananaResult.rows[0];
        
        if (!cierreManana || cierreManana.estado.toUpperCase() !== 'CERRADO') {
          const error = new Error('El Turno Mañana no ha sido cerrado. Es obligatorio realizar el Cierre de Caja de la Mañana antes de continuar operando en el Turno Tarde.');
          error.statusCode = 409; // 409 Conflict para que el frontend lo detecte como error fatal
          throw error;
        }
      }
    }
    // =================================================================
    
    // 1. Crear Comprobante con datos de OCR
    const newComprobante = await createComprobante(comprobante, client);

    // 2. Crear Operación
    const newOperacion = await createOperacion({
      ...operacion,
      id_comprobante: newComprobante.id_comprobante,
      id_usuario: id_usuario
    }, client);

    // 3. Crear Pagos con lógica de auto-verificación para efectivo
    const createdPagos = await Promise.all(
      pagos.map(async (pago) => {
        const medioPagoResult = await client.query(
          `SELECT es_efectivo
           FROM medio_pago
           WHERE id_medio_pago = $1`,
          [pago.id_medio_pago]
        );

        const esEfectivo = medioPagoResult.rows.length > 0 && medioPagoResult.rows[0].es_efectivo;
        const estadoInicial = esEfectivo ? 'VERIFICADO' : (pago.estado || 'REGISTRADO');

        return createPago({
          ...pago,
          id_operacion: newOperacion.id_operacion,
          estado: estadoInicial
        }, client);
      })
    );

    const createdEvidencias = await Promise.all(
      listaEvidencias.map(evid => createEvidencia({
        ...evid,
        id_operacion: newOperacion.id_operacion,
        id_usuario
      }, client))
    );

    return {
      id_operacion: newOperacion.id_operacion,
      comprobante: newComprobante,
      pagos: createdPagos,
      evidencias: createdEvidencias
    };
  });
};