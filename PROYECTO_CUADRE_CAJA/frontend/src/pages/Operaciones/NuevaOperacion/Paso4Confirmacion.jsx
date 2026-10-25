import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Clock,
} from 'lucide-react';
import api from '../../../lib/api';

const base64ToBlob = (base64, contentType = 'image/jpeg') => {
  const partes = base64.split(',');
  const contenido = partes.length > 1 ? partes[1] : partes[0];
  const byteCharacters = atob(contenido);
  const byteArrays = [];

  for (
    let offset = 0;
    offset < byteCharacters.length;
    offset += 512
  ) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

const normalizarTexto = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const obtenerMedioPago = (pago) =>
  normalizarTexto(
    pago?.nombre_medio ||
    pago?.medio_pago ||
    pago?.medioPago ||
    pago?.nombre_medio_pago ||
    ''
  );

const esMedioBancario = (pago) => {
  const medio = obtenerMedioPago(pago);

  return (
    medio.includes('transferencia') ||
    medio.includes('deposito') ||
    medio.includes('yape') ||
    medio.includes('plin') ||
    medio.includes('billetera') ||
    medio.includes('banco')
  );
};

export function Paso4Confirmacion({
  comprobante,
  pagos = [],
  evidenciaComprobante,
  evidenciaEmpresa,
  ocrEmpresa,
  onBack,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const listaPagos = Array.isArray(pagos) ? pagos : [];

  const montoOperacion = Number.parseFloat(comprobante?.monto) || 0;

  const totalPagado = listaPagos.reduce(
    (sum, pago) => sum + (Number.parseFloat(pago?.monto) || 0),
    0
  );

  const pendiente = Math.max(0, montoOperacion - totalPagado);

  const estadoOperacion =
    pendiente <= 0 ? 'PAGADA' : 'PENDIENTE';

  // Identificar los pagos bancarios declarados por el usuario.
  const pagosTransferencia = listaPagos.filter(esMedioBancario);

  const totalTransferenciasCliente = pagosTransferencia.reduce(
    (sum, pago) => sum + (Number.parseFloat(pago?.monto) || 0),
    0
  );

  const montoEmpresa =
    ocrEmpresa?.monto != null && ocrEmpresa.monto !== ''
      ? Number.parseFloat(ocrEmpresa.monto) || 0
      : 0;

  const margenError = 1;

  const hayPagoBancario = pagosTransferencia.length > 0;

  const esTodoEfectivo =
    listaPagos.length > 0 &&
    listaPagos.every((pago) => {
      const medio = obtenerMedioPago(pago);
      return medio.includes('efectivo');
    });

  const hayEvidenciaEmpresa = Boolean(evidenciaEmpresa);

  const montosCoinciden =
    hayPagoBancario &&
    montoEmpresa > 0 &&
    Math.abs(totalTransferenciasCliente - montoEmpresa) <= margenError;

  const hayDiferenciaMontos =
    hayPagoBancario &&
    montoEmpresa > 0 &&
    !montosCoinciden;

  const estadoConfirmacion = esTodoEfectivo
    ? 'EFECTIVO'
    : montosCoinciden
      ? 'MONTOS_COINCIDEN'
      : hayDiferenciaMontos
        ? 'DIFERENCIA'
        : 'PENDIENTE';

  const textoConfirmacion = {
    EFECTIVO:
      'El pago en efectivo se verificará durante el cierre de caja.',
    MONTOS_COINCIDEN:
      'Los montos declarados coinciden con el comprobante adjunto. El ingreso aún debe ser verificado por la empresa.',
    DIFERENCIA:
      'El monto identificado en el comprobante adjunto no coincide con el total de los pagos bancarios declarados. Se requiere revisión.',
    PENDIENTE: hayEvidenciaEmpresa
      ? 'Comprobante de ingreso adjunto. La confirmación del ingreso a la cuenta de la empresa está pendiente.'
      : 'Pendiente de confirmación del ingreso en la cuenta de la empresa. Puedes adjuntar el comprobante bancario posteriormente.',
  }[estadoConfirmacion];

  const handleRegistrar = async () => {
    setLoading(true);
    setError(null);

    try {
      if (listaPagos.length === 0) {
        setError('La operación debe tener al menos un pago asociado.');
        return;
      }

      const montoComprobante = Number(comprobante?.monto) || 0;
      const pendienteCalculado = montoComprobante - totalPagado;

      const estadoFinal =
        pendienteCalculado <= 0 ? 'PAGADA' : 'PENDIENTE';

      const fechaOriginal = comprobante?.fecha || '';
      const fechaISO = fechaOriginal.includes('/')
        ? fechaOriginal.split('/').reverse().join('-')
        : fechaOriginal;

      const evidenciasParaPayload = [];

      // 1. Evidencia del comprobante.
      if (evidenciaComprobante) {
        const formDataComprobante = new FormData();
        formDataComprobante.append('archivo', evidenciaComprobante);

        const resUploadComprobante = await api.post(
          '/evidencias/upload',
          formDataComprobante,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        const keyComprobante =
          resUploadComprobante.data?.data?.storage_key;

        if (keyComprobante) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'COMPROBANTE',
            storage_key: keyComprobante,
            fecha_evidencia: fechaISO,
            observacion: 'Comprobante de operación',
          });
        }
      }

      // 2. Evidencia del ingreso de la empresa.
      if (evidenciaEmpresa) {
        const formDataEmpresa = new FormData();
        formDataEmpresa.append('archivo', evidenciaEmpresa);

        const resUploadEmpresa = await api.post(
          '/evidencias/upload',
          formDataEmpresa,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        const keyEmpresa =
          resUploadEmpresa.data?.data?.storage_key;

        if (keyEmpresa) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'EMPRESA',
            storage_key: keyEmpresa,
            fecha_evidencia: fechaISO,
            observacion:
              'Comprobante de ingreso a la cuenta de la empresa',
            // NUEVO: persistir el OCR extraído en el Paso 3.
            // Si el usuario subió PDF o el OCR falló, se envía null
            // y la evidencia se guarda igual para revisión manual.
            datos_ocr: ocrEmpresa ? JSON.stringify(ocrEmpresa) : null,
            texto_ocr: null, // el OCR del Paso 3 no devuelve texto crudo
          });
        }
      }

      // 3. Evidencias aportadas por el cliente.
      for (const pago of listaPagos) {
        if (pago?.evidencia?.imagenBase64) {
          const blob = base64ToBlob(
            pago.evidencia.imagenBase64,
            'image/jpeg'
          );

          const file = new File(
            [blob],
            `evidencia-cliente-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );

          const formDataCliente = new FormData();
          formDataCliente.append('archivo', file);

          const resUploadCliente = await api.post(
            '/evidencias/upload',
            formDataCliente,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            }
          );

          const keyCliente =
            resUploadCliente.data?.data?.storage_key;

          if (keyCliente) {
            evidenciasParaPayload.push({
              tipo_evidencia: 'CLIENTE',
              storage_key: keyCliente,
              fecha_evidencia: fechaISO,
              observacion: `Evidencia de pago del cliente: ${pago.nombre_medio || pago.medio_pago || 'No especificado'
                }`,
              datos_ocr: pago.evidencia.datosOCR
                ? JSON.stringify(pago.evidencia.datosOCR)
                : null,
              texto_ocr: pago.evidencia.textoOcr || null,
            });
          }
        }
      }

      // 4. Datos de la operación.
      const payload = {
        comprobante: {
          tipo_comprobante: comprobante?.tipo_comprobante,
          serie: comprobante?.serie,
          numero: comprobante?.numero,
          fecha: fechaISO,
          monto: montoComprobante,
          cliente: comprobante?.cliente || null,
          vendedor: comprobante?.vendedor || null,
          hora: comprobante?.hora || null,
          moneda: comprobante?.moneda || 'PEN',
          igv: Number(comprobante?.igv) || 0,
          op_gravada: Number(comprobante?.op_gravada) || 0,
          items: comprobante?.items || [],
        },
        operacion: {
          fecha: fechaISO,
          monto: montoComprobante,
          estado: estadoFinal,
          observacion: '',
        },
        pagos: listaPagos.map((pago) => ({
          id_medio_pago: pago.id_medio_pago,
          monto: Number(pago.monto),
          referencia_bancaria: pago.referencia || null,
          observacion: pago.observacion || null,
        })),
        evidencias: evidenciasParaPayload,
      };

      await api.post('/operaciones/registrar-unificado', payload);

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error('Error registrando operación:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Error al registrar la operación.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          ¡Operación registrada!
        </h2>

        <p className="text-slate-500">
          La operación se registró correctamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 4: Resumen y Confirmación
        </h2>

        <p className="text-slate-500">
          Revisa los datos antes de guardar definitivamente en el sistema.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />

          <div className="flex-1">
            <p className="text-red-800 font-medium text-sm mb-2">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRegistrar}
              disabled={loading}
              className="text-sm text-red-700 underline disabled:opacity-50"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Resumen de importes y estado del ingreso */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg mb-4">
          Resumen de verificación
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Total facturado
            </p>
            <p className="text-xl font-bold text-slate-900">
              S/ {montoOperacion.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Total pagado por el cliente
            </p>
            <p className="text-xl font-bold text-slate-900">
              S/ {totalPagado.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Confirmación del ingreso en la empresa
            </p>

            <p className="text-sm font-semibold text-slate-700">
              {esTodoEfectivo
                ? 'Se verificará en el cierre de caja.'
                : hayEvidenciaEmpresa
                  ? 'Comprobante adjunto; pendiente de verificación.'
                  : 'Pendiente de confirmación del ingreso.'}
            </p>
          </div>
        </div>

        {esTodoEfectivo ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-blue-800 font-medium">
              El pago se realizó en efectivo. No se requiere una captura
              bancaria; el efectivo se verificará durante el cierre de caja.
            </p>
          </div>
        ) : montosCoinciden ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-amber-800 font-medium">
              {textoConfirmacion}
            </p>
          </div>
        ) : hayDiferenciaMontos ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-red-800 font-medium">
              {textoConfirmacion}
              {' '}Pagos bancarios declarados: S/{' '}
              {totalTransferenciasCliente.toFixed(2)}.
              {' '}Monto identificado: S/ {montoEmpresa.toFixed(2)}.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

            <p className="text-sm text-amber-800 font-medium">
              {textoConfirmacion}
            </p>
          </div>
        )}
      </div>

      {/* Información del comprobante */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-lg mb-4">
          Comprobante
        </h3>

        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-900">
            {comprobante?.tipo_comprobante || 'Comprobante'}{' '}
            {comprobante?.serie || ''}-{comprobante?.numero || ''}
          </p>

          <p className="text-sm text-slate-600">
            Fecha: {comprobante?.fecha || 'Pendiente'}
          </p>

          <p className="text-sm text-slate-600">
            Cliente: {comprobante?.cliente || 'No registrado'}
          </p>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
              Monto total
            </p>

            <p className="text-2xl font-bold text-brand-orange">
              S/ {montoOperacion.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Totales de la operación */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">
              Monto operación
            </p>
            <p className="text-lg font-bold text-slate-900">
              S/ {montoOperacion.toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">
              Total pagado
            </p>
            <p className="text-lg font-bold text-slate-900">
              S/ {totalPagado.toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">
              Pendiente
            </p>
            <p className="text-lg font-bold text-slate-900">
              S/ {pendiente.toFixed(2)}
            </p>
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
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>

        <button
          type="button"
          onClick={handleRegistrar}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              Registrar operación
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}