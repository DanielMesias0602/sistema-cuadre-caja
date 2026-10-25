import { useState, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle,
  Info,
  Banknote,
  Calendar,
  Hash,
  Landmark,
  User,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react';
import ocrService from '../../../services/ocr.service';

export function Paso3EvidenciaEmpresa({
  datosIniciales = {},
  pagos = [],
  onDataChange,
  onNext,
  onBack,
}) {
  const [evidencia, setEvidencia] = useState(
    datosIniciales.evidenciaEmpresa || null
  );
  const [preview, setPreview] = useState(
    datosIniciales.previewEmpresa || null
  );
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState(
    datosIniciales.ocrEmpresa || null
  );
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Normaliza el medio de pago para tolerar diferencias de mayúsculas,
  // espacios y acentos.
  const normalizarMedio = (valor) =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const esEfectivo = (pago) => {
    const medio = normalizarMedio(
      pago?.medio_pago ||
      pago?.nombre_medio ||
      pago?.medioPago ||
      pago?.nombre_medio_pago ||
      ''
    );

    return medio.includes('efectivo');
  };

  // Solo se requiere evidencia bancaria si hay al menos un pago
  // cuyo medio esté identificado y no sea efectivo.
  const requiereEvidenciaBancaria = Array.isArray(pagos) &&
    pagos.some((pago) => {
      const medio = (
        pago?.medio_pago ||
        pago?.nombre_medio ||
        pago?.medioPago ||
        pago?.nombre_medio_pago ||
        ''
      );

      // No clasificar un medio desconocido como transferencia.
      return String(medio).trim() !== '' && !esEfectivo(pago);
    });

  const notificarCambio = (cambios) => {
    onDataChange?.(cambios);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const esImagen = file.type.startsWith('image/');
    const esPdf = file.type === 'application/pdf';

    if (!esImagen && !esPdf) {
      setError('Selecciona una imagen o un archivo PDF válido.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10 MB.');
      e.target.value = '';
      return;
    }

    setEvidencia(file);
    setError(null);
    setOcrData(null);
    setPreview(null);

    notificarCambio({
      evidenciaEmpresa: file,
      previewEmpresa: null,
      ocrEmpresa: null,
    });

    // OCR solo admite imágenes en este flujo. Para PDF se conserva
    // el archivo y se permite continuar sin extracción automática.
    if (!esImagen) {
      setLoading(false);
      notificarCambio({
        evidenciaEmpresa: file,
        previewEmpresa: null,
        ocrEmpresa: null,
      });
      return;
    }

    setLoading(true);

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error('No se pudo leer el archivo seleccionado.'));

        reader.readAsDataURL(file);
      });

      setPreview(dataUrl);

      notificarCambio({
        evidenciaEmpresa: file,
        previewEmpresa: dataUrl,
        ocrEmpresa: null,
      });

      try {
        const response = await ocrService.procesar(file, 'TRANSFERENCIA');
        const rawData = response?.data?.data || response?.data;
        const datosExtraidos =
          rawData?.datos_extraidos || rawData || null;

        setOcrData(datosExtraidos);

        notificarCambio({
          evidenciaEmpresa: file,
          previewEmpresa: dataUrl,
          ocrEmpresa: datosExtraidos,
        });
      } catch (ocrError) {
        console.error('Error procesando OCR:', ocrError);
        setError(
          'No se pudo procesar la imagen con OCR. Puedes continuar; la evidencia se conservará sin datos extraídos.'
        );
      }
    } catch (readError) {
      console.error('Error leyendo evidencia:', readError);
      setError('No se pudo leer el archivo seleccionado.');
      setEvidencia(null);
      setPreview(null);
      setOcrData(null);

      notificarCambio({
        evidenciaEmpresa: null,
        previewEmpresa: null,
        ocrEmpresa: null,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setEvidencia(null);
    setPreview(null);
    setOcrData(null);
    setError(null);

    notificarCambio({
      evidenciaEmpresa: null,
      previewEmpresa: null,
      ocrEmpresa: null,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = () => {
    onNext?.({
      evidenciaEmpresa: evidencia,
      previewEmpresa: preview,
      ocrEmpresa: ocrData,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 3: Evidencia de la Empresa
        </h2>

        <p className="text-slate-500">
          {requiereEvidenciaBancaria
            ? 'Adjunta la captura del movimiento bancario para respaldar los pagos no realizados en efectivo.'
            : 'Esta operación no requiere captura bancaria si todos los pagos son en efectivo.'}
        </p>
      </div>

      {requiereEvidenciaBancaria && !evidencia && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-2xl mx-auto flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Evidencia bancaria pendiente.</strong> Puedes registrar
            la operación y adjuntar el comprobante posteriormente. El pago
            no se considera verificado por este motivo.
          </p>
        </div>
      )}

      {!requiereEvidenciaBancaria && !evidencia && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-2xl mx-auto flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            No necesitas subir una captura bancaria para pagos en efectivo.
            El efectivo se verificará durante el <strong>Cierre de Caja</strong>.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-2xl mx-auto flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {ocrData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Datos extraídos por OCR
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Verifica que coincidan con la captura.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {ocrData.monto != null && (
              <DatoOCR icon={<Banknote className="w-4 h-4 text-emerald-500" />} label="Monto">
                S/ {Number(ocrData.monto).toFixed(2)}
              </DatoOCR>
            )}

            {ocrData.fecha_operacion && (
              <DatoOCR icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Fecha operación">
                {ocrData.fecha_operacion}
              </DatoOCR>
            )}

            {(ocrData.referencia_bancaria || ocrData.numero_operacion) && (
              <DatoOCR icon={<Hash className="w-4 h-4 text-purple-500" />} label="N.º operación">
                {ocrData.referencia_bancaria || ocrData.numero_operacion}
              </DatoOCR>
            )}

            {(ocrData.aplicacion_banco || ocrData.banco) && (
              <DatoOCR icon={<Landmark className="w-4 h-4 text-indigo-500" />} label="Banco / Aplicación">
                {ocrData.aplicacion_banco || ocrData.banco}
              </DatoOCR>
            )}

            {ocrData.destinatario && (
              <DatoOCR icon={<User className="w-4 h-4 text-orange-500" />} label="Beneficiario">
                {ocrData.destinatario}
              </DatoOCR>
            )}

            {ocrData.cuenta_destino && (
              <DatoOCR icon={<CreditCard className="w-4 h-4 text-slate-500" />} label="Cuenta destino">
                {ocrData.cuenta_destino}
              </DatoOCR>
            )}

            {ocrData.hora_operacion && (
              <DatoOCR icon={<Clock className="w-4 h-4 text-teal-500" />} label="Hora operación">
                {ocrData.hora_operacion}
              </DatoOCR>
            )}

            {ocrData.estado_transferencia && (
              <DatoOCR icon={<CheckCircle className="w-4 h-4 text-rose-500" />} label="Estado">
                {ocrData.estado_transferencia}
              </DatoOCR>
            )}
          </div>
        </div>
      )}

      {/* CAMBIO: solo mostrar el bloque de archivo si se requiere
          evidencia bancaria (hay pago no efectivo) o si el usuario
          ya seleccionó un archivo (para que pueda verlo/quitarlo). */}
      {(requiereEvidenciaBancaria || evidencia) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-orange animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Procesando evidencia...</p>
            </div>
          ) : !evidencia ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="border-2 border-dashed border-slate-300 hover:bg-slate-50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>

              <p className="font-semibold text-slate-700">
                {requiereEvidenciaBancaria
                  ? 'Adjuntar captura bancaria (opcional)'
                  : 'Adjuntar archivo (opcional)'}
              </p>

              <p className="text-sm text-slate-400 mt-1">
                PNG, JPG o PDF · Máx. 10 MB
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 mb-4 bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Archivo seleccionado: {evidencia.name}
                </span>
              </div>

              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa de evidencia"
                  className="w-full max-h-96 object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
              ) : (
                <div className="flex items-center gap-3 p-5 bg-slate-50 rounded-lg border border-slate-200">
                  <ImageIcon className="w-6 h-6 text-slate-500" />
                  <p className="text-sm text-slate-600">
                    El archivo está seleccionado. No hay vista previa disponible.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={removeImage}
                aria-label="Quitar evidencia"
                className="absolute top-14 right-2 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      )}

      <div className="flex justify-between max-w-2xl mx-auto mt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50"
        >
          Continuar
          <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}

function DatoOCR({ icon, label, children }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900 break-words">
        {children}
      </p>
    </div>
  );
}