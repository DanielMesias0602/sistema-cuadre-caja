import { useState, useRef } from 'react';
import {
  ArrowLeft, UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle,
  Info, Banknote, Calendar, Hash, User, CreditCard, AlertCircle, Clock,
  Building2, FileText,
} from 'lucide-react';
import ocrService from '../../../services/ocr.service';

const ICONOS = {
  banknote: Banknote, calendar: Calendar, hash: Hash, user: User,
  building: Building2, creditCard: CreditCard, clock: Clock, file: FileText,
};
const COLORES = {
  emerald: 'text-emerald-500', blue: 'text-blue-500', purple: 'text-purple-500',
  indigo: 'text-indigo-500', orange: 'text-orange-500', teal: 'text-teal-500', slate: 'text-slate-500 dark:text-slate-500',
};

const getCamposOCR = (datosOCR) => {
  if (!datosOCR) return [];
  const banco = String(datosOCR.aplicacion_banco || datosOCR.banco || '').toLowerCase();
  const campos = [];
  if (datosOCR.monto != null) campos.push({ icon: 'banknote', label: 'Monto', value: `S/ ${Number(datosOCR.monto).toFixed(2)}`, color: 'emerald' });
  if (datosOCR.fecha_operacion) campos.push({ icon: 'calendar', label: 'Fecha', value: datosOCR.fecha_operacion, color: 'blue' });
  if (datosOCR.hora_operacion) campos.push({ icon: 'clock', label: 'Hora', value: datosOCR.hora_operacion, color: 'teal' });
  const cuentaEmpresa = datosOCR.cuenta_movimiento?.numero || null;

  if (banco.includes('yape') || banco.includes('plin')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco / App', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    if (datosOCR.destinatario) campos.push({ icon: 'user', label: 'Destinatario', value: datosOCR.destinatario, color: 'orange' });
  } else if (banco.includes('bbva') || banco.includes('bcp') || banco.includes('interbank') || banco.includes('transferencia')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    if (datosOCR.tipo_cuenta_origen) campos.push({ icon: 'creditCard', label: 'Tipo cuenta', value: datosOCR.tipo_cuenta_origen, color: 'slate' });
    if (datosOCR.cuenta_origen) campos.push({ icon: 'creditCard', label: 'Cuenta origen', value: datosOCR.cuenta_origen, color: 'slate' });
    if (datosOCR.cuenta_destino && datosOCR.cuenta_destino !== cuentaEmpresa) campos.push({ icon: 'creditCard', label: 'Cuenta destino', value: datosOCR.cuenta_destino, color: 'slate' });
    if (datosOCR.destinatario) campos.push({ icon: 'user', label: 'Beneficiario', value: datosOCR.destinatario, color: 'orange' });
  } else if (banco.includes('tarjeta')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
  }
  if (datosOCR.referencia_bancaria || datosOCR.numero_operacion) campos.push({ icon: 'hash', label: 'Nro. operación', value: datosOCR.referencia_bancaria || datosOCR.numero_operacion, color: 'purple' });
  if (datosOCR.descripcion) campos.push({ icon: 'file', label: 'Descripción', value: datosOCR.descripcion, color: 'slate' });
  if (datosOCR.sucursal_agencia) campos.push({ icon: 'building', label: 'Sucursal', value: datosOCR.sucursal_agencia, color: 'slate' });
  if (cuentaEmpresa) campos.push({ icon: 'creditCard', label: 'Cuenta empresa', value: cuentaEmpresa, color: 'slate' });
  if (datosOCR.estado_transferencia) campos.push({ icon: 'check', label: 'Estado', value: datosOCR.estado_transferencia, color: 'emerald' });
  return campos;
};

function CampoOCRDinamico({ icon, label, value, color }) {
  const Icon = ICONOS[icon] || Info;
  const colorClass = COLORES[color] || 'text-slate-500';
  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700 min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colorClass}`} />
        <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      </div>
      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 break-words">{value}</p>
    </div>
  );
}

export function Paso3EvidenciaEmpresa({ datosIniciales = {}, pagos = [], onDataChange, onNext, onBack }) {
  const [evidencia, setEvidencia] = useState(datosIniciales.evidenciaEmpresa || null);
  const [preview, setPreview] = useState(datosIniciales.previewEmpresa || null);
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState(datosIniciales.ocrEmpresa || null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const normalizarMedio = (valor) =>
    String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  const esEfectivo = (pago) => {
    const medio = normalizarMedio(
      pago?.medio_pago || pago?.nombre_medio || pago?.medioPago || pago?.nombre_medio_pago || ''
    );
    return medio.includes('efectivo');
  };

  const requiereEvidenciaBancaria = Array.isArray(pagos) &&
    pagos.some((pago) => {
      const medio = pago?.medio_pago || pago?.nombre_medio || pago?.medioPago || pago?.nombre_medio_pago || '';
      return String(medio).trim() !== '' && !esEfectivo(pago);
    });

  const notificarCambio = (cambios) => onDataChange?.(cambios);

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
    notificarCambio({ evidenciaEmpresa: file, previewEmpresa: null, ocrEmpresa: null });
    if (!esImagen) {
      setLoading(false);
      notificarCambio({ evidenciaEmpresa: file, previewEmpresa: null, ocrEmpresa: null });
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer'));
        reader.readAsDataURL(file);
      });
      setPreview(dataUrl);
      notificarCambio({ evidenciaEmpresa: file, previewEmpresa: dataUrl, ocrEmpresa: null });
      try {
        const response = await ocrService.procesar(file, 'TRANSFERENCIA');
        const rawData = response?.data?.data || response?.data;
        const datosExtraidos = rawData?.datos_extraidos || rawData || null;
        setOcrData(datosExtraidos);
        notificarCambio({ evidenciaEmpresa: file, previewEmpresa: dataUrl, ocrEmpresa: datosExtraidos });
      } catch (ocrError) {
        console.error('Error OCR:', ocrError);
        setError('No se pudo procesar la imagen con OCR. Puedes continuar sin datos extraídos.');
      }
    } catch (readError) {
      console.error('Error lectura:', readError);
      setError('No se pudo leer el archivo seleccionado.');
      setEvidencia(null);
      setPreview(null);
      setOcrData(null);
      notificarCambio({ evidenciaEmpresa: null, previewEmpresa: null, ocrEmpresa: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setEvidencia(null);
    setPreview(null);
    setOcrData(null);
    setError(null);
    notificarCambio({ evidenciaEmpresa: null, previewEmpresa: null, ocrEmpresa: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNext = () => {
    onNext?.({ evidenciaEmpresa: evidencia, previewEmpresa: preview, ocrEmpresa: ocrData });
  };

  const camposOCR = ocrData ? getCamposOCR(ocrData) : [];

  return (
    <div className="space-y-4 sm:space-y-6 dark:bg-slate-900">
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-2">
          Paso 3: Evidencia de la Empresa
        </h2>
        <p className="text-xs sm:text-base text-slate-500 dark:text-slate-400 px-2">
          {requiereEvidenciaBancaria
            ? 'Adjunta la captura del movimiento bancario para respaldar los pagos no realizados en efectivo.'
            : 'Esta operación no requiere captura bancaria si todos los pagos son en efectivo.'}
        </p>
      </div>

      {requiereEvidenciaBancaria && !evidencia && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 sm:p-4 max-w-2xl mx-auto flex items-start gap-2 sm:gap-3">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
            <strong>Evidencia bancaria pendiente.</strong> Puedes registrar la operación y adjuntar el comprobante posteriormente.
          </p>
        </div>
      )}

      {!requiereEvidenciaBancaria && !evidencia && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3 sm:p-4 max-w-2xl mx-auto flex items-start gap-2 sm:gap-3">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
            No necesitas subir una captura bancaria para pagos en efectivo.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3 sm:p-4 max-w-2xl mx-auto flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-300 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {ocrData && camposOCR.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600 rounded-2xl p-3 sm:p-6 max-w-2xl mx-auto shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-lg">Datos extraídos por OCR</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Verifica que coincidan con la captura.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
            {camposOCR.map((campo, i) => (
              <CampoOCRDinamico key={i} {...campo} />
            ))}
          </div>
        </div>
      )}

      {(requiereEvidenciaBancaria || evidencia) && (
        <div className="bg-white dark:bg-slate-800/60 p-3 sm:p-6 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-600 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20">
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-brand-orange animate-spin mb-3 sm:mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">Procesando evidencia...</p>
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
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm sm:text-base text-center">
                {requiereEvidenciaBancaria ? 'Adjuntar captura bancaria (opcional)' : 'Adjuntar archivo (opcional)'}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">PNG, JPG o PDF · Máx. 10 MB</p>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-start gap-2 mb-3 sm:mb-4 bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 p-2.5 sm:p-3 rounded-lg border border-green-200 dark:border-emerald-800/60">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm font-medium break-words min-w-0">
                  {evidencia.name}
                </span>
              </div>
              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa"
                  className="w-full max-h-[220px] sm:max-h-96 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-700">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-slate-500 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">El archivo está seleccionado. Sin vista previa.</p>
                </div>
              )}
              <button
                type="button"
                onClick={removeImage}
                aria-label="Quitar evidencia"
                className="absolute top-14 right-2 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 p-1.5 sm:p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-900/60 transition shadow-sm dark:shadow-none"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
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

      {/* Nav — Continuar arriba en móvil */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 max-w-2xl mx-auto mt-4 sm:mt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 rounded-xl font-semibold text-sm transition"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold text-sm transition shadow-md dark:shadow-none disabled:opacity-50"
        >
          Continuar
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}