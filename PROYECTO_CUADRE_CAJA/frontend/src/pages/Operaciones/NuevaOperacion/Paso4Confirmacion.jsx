import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import api from '../../../lib/api';

const base64ToBlob = (base64, contentType = 'image/jpeg') => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

export function Paso4Confirmacion({ comprobante, pagos, evidenciaComprobante, evidenciaEmpresa, ocrEmpresa, onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const montoOperacion = parseFloat(comprobante?.monto) || 0;
  const totalPagado = pagos.reduce((sum, pago) => sum + (parseFloat(pago.monto) || 0), 0);
  const pendiente = montoOperacion - totalPagado;
  const estadoOperacion = pendiente === 0 ? 'PAGADA' : 'PENDIENTE';

  // Cálculos para verificación
  const pagosTransferencia = pagos.filter(p => {
    const medio = (p.nombre_medio || p.medio_pago || '').toLowerCase();
    return medio.includes('transferencia') || medio.includes('yape') || medio.includes('plin');
  });
  
  const totalTransferenciasCliente = pagosTransferencia.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const montoEmpresa = ocrEmpresa?.monto ? parseFloat(ocrEmpresa.monto) || 0 : 0;
  
  const margenError = 1; // 1 sol de margen por redondeo
  const montosCoinciden = totalTransferenciasCliente > 0 && montoEmpresa > 0 && Math.abs(totalTransferenciasCliente - montoEmpresa) <= margenError;
  const esTodoEfectivo = totalTransferenciasCliente === 0;

  const handleRegistrar = async () => {
    setLoading(true);
    setError(null);

    try {
      const montoComprobante = Number(comprobante.monto) || 0;
      const pendienteCalculado = montoComprobante - totalPagado;
      const estadoFinal = pendienteCalculado <= 0 ? 'PAGADA' : 'PENDIENTE';

      const fechaISO = comprobante.fecha.includes('/')
        ? comprobante.fecha.split('/').reverse().join('-')
        : comprobante.fecha;

      const evidenciasParaPayload = [];

      // 1. Subir Evidencia Comprobante (Paso 1)
      if (evidenciaComprobante) {
        const formDataComprobante = new FormData();
        formDataComprobante.append('archivo', evidenciaComprobante);

        const resUploadComprobante = await api.post('/evidencias/upload', formDataComprobante, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const keyComprobante = resUploadComprobante.data?.data?.storage_key;
        if (keyComprobante) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'COMPROBANTE',
            storage_key: keyComprobante,
            fecha_evidencia: fechaISO,
            observacion: 'Comprobante de operación'
          });
        }
      }

      // 2. Subir Evidencia Empresa (Paso 3)
      if (evidenciaEmpresa) {
        const formDataEmpresa = new FormData();
        formDataEmpresa.append('archivo', evidenciaEmpresa);
        
        const resUploadEmpresa = await api.post('/evidencias/upload', formDataEmpresa, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const keyEmpresa = resUploadEmpresa.data?.data?.storage_key;
        if (keyEmpresa) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'EMPRESA',
            storage_key: keyEmpresa,
            fecha_evidencia: fechaISO,
            observacion: 'Comprobante de ingreso a cuenta de la empresa'
          });
        }
      }

      // 3. Subir Evidencias Cliente (Paso 2)
      for (const pago of pagos) {
        if (pago.evidencia?.imagenBase64) {
          const blob = base64ToBlob(pago.evidencia.imagenBase64, 'image/jpeg');
          const file = new File([blob], `evidencia-cliente-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const formDataCliente = new FormData();
          formDataCliente.append('archivo', file);

          const resUploadCliente = await api.post('/evidencias/upload', formDataCliente, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          const keyCliente = resUploadCliente.data?.data?.storage_key;
          if (keyCliente) {
            evidenciasParaPayload.push({
              tipo_evidencia: 'CLIENTE',
              storage_key: keyCliente,
              fecha_evidencia: fechaISO,
              observacion: `Evidencia de pago cliente: ${pago.nombre_medio || 'Efectivo'}`,
              datos_ocr: pago.evidencia.datosOCR ? JSON.stringify(pago.evidencia.datosOCR) : null,
              texto_ocr: pago.evidencia.textoOcr || null
            });
          }
        }
      }

      // 4. Payload Final
      const payload = {
        comprobante: {
          tipo_comprobante: comprobante.tipo_comprobante,
          serie: comprobante.serie,
          numero: comprobante.numero,
          fecha: fechaISO,
          monto: montoComprobante,
          cliente: comprobante.cliente || null,
          vendedor: comprobante.vendedor || null,
          hora: comprobante.hora || null,
          moneda: comprobante.moneda || 'PEN',
          igv: Number(comprobante.igv) || 0,
          op_gravada: Number(comprobante.op_gravada) || 0,
          items: comprobante.items || [] 
        },
        operacion: {
          fecha: fechaISO,
          monto: montoComprobante,
          estado: estadoFinal,
          observacion: '',
        },
        pagos: pagos.map(p => ({
          id_medio_pago: p.id_medio_pago,
          monto: Number(p.monto),
          referencia_bancaria: p.referencia || null,
          observacion: p.observacion || null,
          estado: 'REGISTRADO'
        })),
        evidencias: evidenciasParaPayload
      };

      await api.post('/operaciones/registrar-unificado', payload);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);

    } catch (err) {
      console.error('Error registrando operación:', err);
      setError(err.response?.data?.message || err.message || 'Error al registrar la operación');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Operación registrada!</h2>
        <p className="text-slate-500">Redirigiendo a operaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Paso 4: Resumen y Confirmación</h2>
        <p className="text-slate-500">Revisa los datos antes de guardar definitivamente en el sistema.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium text-sm mb-2">{error}</p>
            <button type="button" onClick={handleRegistrar} className="text-sm text-red-700 underline">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* TARJETA DE RESUMEN DE VERIFICACIÓN */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Resumen de Verificación</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Facturado</p>
            <p className="text-xl font-bold text-slate-900">S/ {montoOperacion.toFixed(2)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Pagado Cliente</p>
            <p className="text-xl font-bold text-slate-900">S/ {totalPagado.toFixed(2)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Detectado en Banco (OCR)</p>
            <p className="text-xl font-bold text-slate-900">
              {montoEmpresa > 0 ? `S/ ${montoEmpresa.toFixed(2)}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* BANNER DE VERIFICACIÓN */}
        {esTodoEfectivo ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 font-medium">
              Operación en efectivo. Se verificará en el Cierre de Caja.
            </p>
          </div>
        ) : montosCoinciden ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 font-medium">
              Verificación Exitosa: Los montos coinciden (Cliente: S/ {totalTransferenciasCliente.toFixed(2)} | Empresa: S/ {montoEmpresa.toFixed(2)})
            </p>
          </div>
        ) : montoEmpresa > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">
              Alerta: El monto del banco (S/ {montoEmpresa.toFixed(2)}) no coincide con las transferencias declaradas (S/ {totalTransferenciasCliente.toFixed(2)})
            </p>
          </div>
        ) : null}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg mb-4">Comprobante</h3>
        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-900">
            {comprobante?.tipo_comprobante || 'Comprobante'} {comprobante?.serie || ''}-{comprobante?.numero || ''}
          </p>
          <p className="text-sm text-slate-600">Fecha: {comprobante?.fecha || 'Pendiente'}</p>
          <p className="text-sm text-slate-600">Cliente: {comprobante?.cliente || 'No registrado'}</p>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Monto total</p>
            <p className="text-2xl font-bold text-brand-orange">S/ {montoOperacion.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Monto operación</p>
            <p className="text-lg font-bold text-slate-900">S/ {montoOperacion.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total pagado</p>
            <p className="text-lg font-bold text-slate-900">S/ {totalPagado.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Pendiente</p>
            <p className="text-lg font-bold text-slate-900">S/ {pendiente.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" /> Atrás
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
          ) : (
            <>Registrar operación <ArrowLeft className="w-5 h-5 rotate-180" /></>
          )}
        </button>
      </div>
    </div>
  );
}