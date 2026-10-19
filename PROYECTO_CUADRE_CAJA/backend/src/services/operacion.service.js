import { withTransaction } from '../repositories/base.repository.js';
import {
  createOperacion,
  findOperacionById,
  findAllOperaciones
} from '../repositories/operacion.repository.js';
import { createComprobante } from '../repositories/comprobante.repository.js';
import { createPago } from '../repositories/pago.repository.js';
import { createEvidencia } from '../repositories/evidencia.repository.js';
import { generatePreauthenticatedRequest } from './ociStorage.service.js'; // <-- NUEVO IMPORT

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
  
  // Mapeamos las operaciones para inyectar la URL segura (prefirmada) en cada pago y evidencia
  const operacionesConLinks = await Promise.all(operaciones.map(async (op) => {
    // Procesamos pagos para generar enlaces seguros
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

    // Procesamos evidencias para generar enlaces seguros
    const evidenciasConLinks = await Promise.all((op.evidencias || []).map(async (evidencia) => {
      if (evidencia.storage_key && evidencia.storage_key !== 'None') {
        try {
          const signedUrl = await generatePreauthenticatedRequest(evidencia.storage_key, 24);
          if (signedUrl) {
            return { ...evidencia, storage_key: signedUrl };
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
    evidencias, 
    id_usuario 
  } = data;

  return await withTransaction(async (client) => {
    // 1. Crear Comprobante con datos de OCR
    const newComprobante = await createComprobante(comprobante, client);

    // 2. Crear Operación
    const newOperacion = await createOperacion({
      ...operacion,
      id_comprobante: newComprobante.id_comprobante,
      id_usuario: id_usuario
    }, client);

    // 3. Crear Pagos
    const createdPagos = await Promise.all(
      pagos.map(pago => createPago({
        ...pago,
        id_operacion: newOperacion.id_operacion
      }, client))
    );

    // 4. Crear Evidencias con datos de OCR
    const createdEvidencias = await Promise.all(
      evidencias.map(evid => createEvidencia({
        ...evid,
        id_operacion: newOperacion.id_operacion,
        id_usuario: id_usuario
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