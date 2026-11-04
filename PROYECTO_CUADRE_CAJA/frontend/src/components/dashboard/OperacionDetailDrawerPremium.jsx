import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  CreditCard,
  Receipt,
  X,
  ZoomIn,
  Image as ImageIcon,
  Eye,
  ZoomOut,
  Sun,
  Moon,
  Clock,
  Upload,
  Pencil,
  Save,
  LoaderCircle,
  FileText,
  Banknote,
  Hash,
  Landmark,
  User,
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import api from '../../lib/api';
import ocrService from '../../services/ocr.service';
import { useAuth } from '../../hooks/useAuth';

function DatoOCR({ icon, label, children }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-600 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 break-words">
        {children}
      </p>
    </div>
  );
}

// ============================================================
// HELPERS DE VALIDACIÓN CRUZADA (NUEVO)
// ============================================================
const normalizarReferencia = (ref) => {
  if (ref === null || ref === undefined) return '';
  let s = String(ref).trim().toUpperCase();
  // Quitar espacios, guiones y ceros iniciales
  s = s.replace(/[\s-]/g, '');
  s = s.replace(/^0+/, '');
  return s;
};

const obtenerReferenciaOCR = (datosOcr) => {
  if (!datosOcr || typeof datosOcr !== 'object') return null;
  for (const referencia of [
    datosOcr.referencia_bancaria,
    datosOcr.numero_operacion,
    datosOcr.nro_operacion,
  ]) {
    if (referencia == null) continue;
    const referenciaNormalizada = String(referencia).trim();
    if (referenciaNormalizada) return referenciaNormalizada;
  }
  return null;
};

const compararMontos = (montoPago, montoEvidencia) => {
  const p = Number(montoPago);
  const e = Number(montoEvidencia);
  if (!Number.isFinite(p) || !Number.isFinite(e)) return false;
  const pagoEnCentimos = Math.round((p + Number.EPSILON) * 100);
  const evidenciaEnCentimos = Math.round((e + Number.EPSILON) * 100);
  return pagoEnCentimos === evidenciaEnCentimos;
};

const evaluarPago = (pago, evidenciaEmpresa) => {
  const medio = String(pago?.medio_pago || pago?.nombre_medio || '').trim();
  const medioLower = medio.toLowerCase();

  // Efectivo no se verifica con OCR
  if (medioLower.includes('efectivo')) {
    return { estado: 'EFECTIVO', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icono: 'info', mensaje: 'Se verifica en el cierre de caja' };
  }

  const pagoVerificadoManualmente =
    ['VERIFICADO', 'VERIFICADA', 'COMPLETADO'].includes(String(pago?.estado || '').toUpperCase()) &&
    String(pago?.observacion || '').includes('Validación manual: referencias distintas, monto coincide');
  if (pagoVerificadoManualmente) {
    return {
      estado: 'VERIFICADO',
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
      icono: 'check',
      mensaje: 'Validación manual aprobada por el administrador',
    };
  }

  // Sin evidencia empresa
  if (!evidenciaEmpresa) {
    return { estado: 'SIN_EVIDENCIA', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icono: 'info', mensaje: 'Sin evidencia de empresa registrada' };
  }

  // Extraer datos del OCR de la evidencia empresa
  const datosOcr = evidenciaEmpresa.datos_ocr || {};
  const refEmpresa = datosOcr.referencia_bancaria || datosOcr.numero_operacion || null;
  const montoEmpresa = datosOcr.monto ?? null;

  const refPago = pago?.referencia || null;

  const normRefPago = normalizarReferencia(refPago);
  const normRefEmpresa = normalizarReferencia(refEmpresa);

  const refCoincide = normRefPago && normRefEmpresa && normRefPago === normRefEmpresa;
  const montoCoincide = compararMontos(pago?.monto, montoEmpresa);

  if (refCoincide && montoCoincide) {
    return { estado: 'COINCIDE', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60', icono: 'check', mensaje: 'Monto y referencia coinciden' };
  }

  if (montoCoincide && !refCoincide) {
    return {
      estado: 'REVISION_MANUAL',
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      icono: 'alert',
      mensaje: 'Monto coincide, pero las referencias son distintas. Requiere validación manual.',
    };
  }

  if (!normRefPago && !normRefEmpresa) {
    return { estado: 'SIN_REFERENCIA', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icono: 'info', mensaje: 'Sin número de operación en pago ni en evidencia' };
  }

  if (refCoincide || montoCoincide) {
    return { estado: 'PARCIAL', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60', icono: 'alert', mensaje: refCoincide ? 'Referencia coincide, monto difiere' : 'Monto coincide, referencia difiere' };
  }

  return { estado: 'DIFERENTE', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60', icono: 'x', mensaje: 'Ni el monto ni la referencia coinciden' };
};

const BadgeEstado = ({ evaluacion }) => {
  const IconMap = { check: CheckCircle, alert: AlertTriangle, x: XCircle, info: Info };
  const Icon = IconMap[evaluacion.icono] || Info;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${evaluacion.color}`}>
      <Icon className="h-3 w-3" />
      {evaluacion.estado.replace('_', ' ')}
    </span>
  );
};

function EvidenciaEmpresaPagoForm({
  idOperacion,
  pago,
  index,
  tipoEvidencia = 'EMPRESA',
  onUploaded,
  onPreview,
}) {
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [procesandoOcr, setProcesandoOcr] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const formatPEN = (value) => `S/ ${Number(value || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setOcr(null);
    setPreview(null);

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Selecciona una imagen o un documento PDF.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no debe superar los 10 MB.');
      event.target.value = '';
      return;
    }

    setArchivo(file);
    if (!file.type.startsWith('image/')) return;

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPreview(dataUrl);
    } catch {
      setError('No se pudo generar la vista previa de la imagen.');
    }

    setProcesandoOcr(true);
    try {
      const response = await ocrService.procesar(file, 'TRANSFERENCIA');
      const rawData = response?.data?.data || response?.data;
      const datosExtraidos = rawData?.datos_extraidos || rawData || null;
      if (datosExtraidos && Object.keys(datosExtraidos).length > 0) setOcr(datosExtraidos);
    } catch (ocrError) {
      console.warn('OCR no concluyente:', ocrError);
    } finally {
      setProcesandoOcr(false);
    }
  };

  const cancelarSeleccion = () => {
    setArchivo(null);
    setPreview(null);
    setOcr(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const subirEvidencia = async () => {
    if (!archivo) {
      setError('Selecciona un archivo antes de subirlo.');
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      const formulario = new FormData();
      formulario.append('archivo', archivo);
      formulario.append('id_operacion', String(idOperacion));
      formulario.append('id_pago', String(pago.id_pago));
      formulario.append('tipo_evidencia', tipoEvidencia);
      const ahora = new Date();
      const fechaLocal = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, '0'),
        String(ahora.getDate()).padStart(2, '0'),
      ].join('-');
      formulario.append('fecha_evidencia', fechaLocal);
      if (ocr) formulario.append('datos_ocr', JSON.stringify(ocr));

      const response = await api.post('/evidencias', formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const evidencia = response.data?.data?.evidencia || response.data?.data;
      await onUploaded(evidencia, pago, tipoEvidencia);
      setArchivo(null);
      setPreview(null);
      setOcr(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.message
        || uploadError.response?.data?.error
        || 'No se pudo subir la evidencia. Inténtalo nuevamente.'
      );
    } finally {
      setSubiendo(false);
    }
  };

  const medio = pago.medio_pago || pago.nombre_medio || 'Medio de pago';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Subir evidencia {tipoEvidencia === 'CLIENTE' ? 'del cliente' : 'de la empresa'} para Pago #{index + 1} ({medio} - {formatPEN(pago.monto)})
      </h4>

      {!archivo ? (
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Seleccionar archivo (imagen o PDF)
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:cursor-pointer file:border-0 file:bg-orange-50 dark:file:bg-orange-950/40 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-brand-orange dark:file:text-orange-400 hover:file:bg-orange-100 dark:hover:file:bg-orange-900/50"
          />
        </label>
      ) : (
        <>
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
            {archivo.type === 'application/pdf'
              ? <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              : <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />}
            <div className="min-w-0 flex-1">
              <p className="break-all text-xs font-medium text-slate-700 dark:text-slate-200">{archivo.name}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {(archivo.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button type="button" onClick={cancelarSeleccion} disabled={subiendo} title="Quitar archivo">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {preview && (
            <button type="button" onClick={() => onPreview(preview, archivo)} className="mb-3 block w-full cursor-zoom-in">
              <img src={preview} alt={`Vista previa de evidencia del pago ${index + 1}`} className="max-h-64 w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain" />
            </button>
          )}

          {procesandoOcr && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 text-sm text-blue-800 dark:text-blue-300">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Procesando OCR automáticamente...
            </div>
          )}

          {!procesandoOcr && ocr && (
            <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
              <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Datos extraídos por OCR</h5>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ocr.monto != null && <DatoOCR icon={<Banknote className="h-3.5 w-3.5 text-emerald-500" />} label="Monto">{formatPEN(ocr.monto)}</DatoOCR>}
                {ocr.fecha_operacion && <DatoOCR icon={<Calendar className="h-3.5 w-3.5 text-blue-500" />} label="Fecha">{ocr.fecha_operacion}</DatoOCR>}
                {(ocr.referencia_bancaria || ocr.numero_operacion) && <DatoOCR icon={<Hash className="h-3.5 w-3.5 text-purple-500" />} label="N.º operación">{ocr.referencia_bancaria || ocr.numero_operacion}</DatoOCR>}
                {(ocr.aplicacion_banco || ocr.banco) && <DatoOCR icon={<Landmark className="h-3.5 w-3.5 text-indigo-500" />} label="Banco">{ocr.aplicacion_banco || ocr.banco}</DatoOCR>}
                {ocr.destinatario && <DatoOCR icon={<User className="h-3.5 w-3.5 text-orange-500" />} label="Beneficiario">{ocr.destinatario}</DatoOCR>}
              </div>
            </div>
          )}

          {!procesandoOcr && !ocr && archivo.type.startsWith('image/') && (
            <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              El OCR no pudo extraer datos de esta imagen. Puedes subirla igual; quedará disponible para revisión manual.
            </div>
          )}

          <button type="button" onClick={subirEvidencia} disabled={subiendo || procesandoOcr} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50">
            {subiendo ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Subiendo evidencia...</> : <><Upload className="h-4 w-4" /> Confirmar y subir</>}
          </button>
        </>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 dark:border-rose-800/60 bg-red-50 dark:bg-rose-950/40 p-3 text-sm text-red-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function OperacionDetailDrawerPremium({
  op,
  onClose,
  onEvidenciaSubida,
  onRegistroActualizado,
}) {
  const { user } = useAuth();
  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';
  const open = op !== null;
  const [lastOperation, setLastOperation] = useState(op);
  if (op && op !== lastOperation) setLastOperation(op);
  const initialOpData = op || lastOperation;
  const closeRef = useRef(null);
  const [freshOperation, setFreshOperation] = useState(null);
  const [operationLoadError, setOperationLoadError] = useState(null);
  const [operationRefreshKey, setOperationRefreshKey] = useState(0);
  const operationLoadRequestRef = useRef(0);

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [visorEsPreview, setVisorEsPreview] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [archivoVisorPreview, setArchivoVisorPreview] = useState(null);
  const [mensajeEvidencia, setMensajeEvidencia] = useState('');
  const [evidenciasLocales, setEvidenciasLocales] = useState([]);
  const [pagoAReemplazar, setPagoAReemplazar] = useState(null);
  const [pagoEnValidacion, setPagoEnValidacion] = useState(null);
  const [errorValidacionManual, setErrorValidacionManual] = useState(null);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [guardandoRegistro, setGuardandoRegistro] = useState(false);
  const [errorEdicionRegistro, setErrorEdicionRegistro] = useState(null);
  const [mediosPagoDisponibles, setMediosPagoDisponibles] = useState([]);
  const [pagosEdicion, setPagosEdicion] = useState([]);
  const [formularioEdicionRegistro, setFormularioEdicionRegistro] = useState({
    monto_comprobante: '',
    id_pago: '',
    monto_pago: '',
    id_medio_pago: '',
    referencia_bancaria: '',
    observacion: '',
  });

  const idOperacion = Number(
    initialOpData?.id_operacion ??
    initialOpData?.idOperacion ??
    initialOpData?.operacion?.id_operacion
  );
  const cargarOperacionActualizada = useCallback(async () => {
    const [operationResponse, paymentsResponse, evidenceResponse] = await Promise.all([
      api.get(`/operaciones/${idOperacion}`),
      api.get(`/pagos/operacion/${idOperacion}`),
      api.get(`/evidencias/operacion/${idOperacion}`),
    ]);
    const operationData = operationResponse.data?.data || operationResponse.data;
    const paymentsData = paymentsResponse.data?.data || paymentsResponse.data;
    const evidenceData = evidenceResponse.data?.data || evidenceResponse.data;
    if (!Array.isArray(paymentsData)) {
      throw new Error('La respuesta de pagos no tiene el formato esperado.');
    }
    if (!Array.isArray(evidenceData)) {
      throw new Error('La respuesta de evidencias no tiene el formato esperado.');
    }

    return {
      ...(op || lastOperation || {}),
      ...operationData,
      evidencias: evidenceData,
      pagos: paymentsData.map((payment) => ({
        ...payment,
        referencia: payment.referencia ?? payment.referencia_bancaria,
      })),
    };
  }, [idOperacion, lastOperation, op]);
  const opData = freshOperation?.id === idOperacion
    ? freshOperation.data
    : initialOpData;
  const [previousOpen, setPreviousOpen] = useState(open);
  const [previousOperationId, setPreviousOperationId] = useState(idOperacion);

  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (!open) {
      setIsImageOpen(false);
      setSelectedImageUrl(null);
      setVisorEsPreview(false);
      setArchivoVisorPreview(null);
      setZoom(false);
      setPagoAReemplazar(null);
    }
  }

  if (!Object.is(previousOperationId, idOperacion)) {
    setPreviousOperationId(idOperacion);
    setArchivoVisorPreview(null);
    setMensajeEvidencia('');
    setEvidenciasLocales([]);
    setPagoAReemplazar(null);
  }

  useEffect(() => {
    if (!open || !Number.isFinite(idOperacion)) return undefined;

    let active = true;
    const requestId = ++operationLoadRequestRef.current;
    const refrescarOperacion = async () => {
      setOperationLoadError(null);
      try {
        const data = await cargarOperacionActualizada();
        if (active && requestId === operationLoadRequestRef.current) {
          setFreshOperation({ id: idOperacion, data });
        }
      } catch (error) {
        console.error('Error al actualizar los pagos de la operación:', error);
        if (active && requestId === operationLoadRequestRef.current) {
          setOperationLoadError('No se pudieron actualizar los pagos de esta operación.');
        }
      }
    };

    void refrescarOperacion();
    return () => {
      active = false;
    };
  }, [open, idOperacion, cargarOperacionActualizada, operationRefreshKey]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isImageOpen) {
          setIsImageOpen(false);
          setSelectedImageUrl(null);
          setVisorEsPreview(false);
          setArchivoVisorPreview(null);
          setZoom(false);
        } else {
          onClose();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, isImageOpen]);

  if (!opData) return null;

  const formatPEN = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTurnoBadge = (hora) => {
    if (!hora) return null;
    const horaComparar = hora.substring(0, 8) || hora;

    if (horaComparar <= '14:00:00') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
          <Sun className="h-3.5 w-3.5" />
          Mañana
        </span>
      );
    }

    if (horaComparar > '14:00:00' && horaComparar <= '20:00:00') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
          <Moon className="h-3.5 w-3.5" />
          Tarde
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        Fuera de turno
      </span>
    );
  };

  const dataComprobante = opData.comprobante || opData;

  const montoFinal =
    opData.monto ||
    opData.total ||
    opData.monto_operacion ||
    dataComprobante.monto ||
    dataComprobante.total ||
    0;

  const estadoFinal =
    opData.estado || opData.status || opData.estado_operacion || 'PENDIENTE';

  const estadoUpper = String(estadoFinal).toUpperCase();

  const isPagada = ['PAGADA', 'VERIFICADA', 'COMPLETADO', 'PAGADO'].includes(
    estadoUpper
  );

  const tipoComp =
    dataComprobante.tipo_comprobante || opData.tipo_comprobante || 'DOC';
  const serieComp = dataComprobante.serie || opData.serie || '';
  const numComp = dataComprobante.numero || opData.numero || '';

  const comprobante = `${tipoComp} ${serieComp ? `${serieComp}-` : ''}${numComp}`;

  const nombreUsuario =
    opData.usuario ||
    `${opData.nombres || ''} ${opData.apellidos || ''}`.trim() ||
    'Sistema';

  const cliente = dataComprobante.cliente || opData.cliente || 'No registrado';
  const vendedor = dataComprobante.vendedor || opData.vendedor || '-';
  const fecha = dataComprobante.fecha || opData.fecha || '';
  const hora = dataComprobante.hora || opData.hora || '';

  const opGravada = dataComprobante.op_gravada ?? opData.op_gravada;
  const igv = dataComprobante.igv ?? opData.igv;
  const totalNumerico = montoFinal == null || String(montoFinal).trim() === ''
    ? null
    : Number(montoFinal);
  const opGravadaNumerica = opGravada == null || String(opGravada).trim() === ''
    ? null
    : Number(opGravada);
  const igvNumerico = igv == null || String(igv).trim() === ''
    ? null
    : Number(igv);
  const baseYTotalValidos = opGravadaNumerica !== null &&
    Number.isFinite(opGravadaNumerica) &&
    opGravadaNumerica >= 0 &&
    totalNumerico !== null &&
    Number.isFinite(totalNumerico) &&
    totalNumerico >= opGravadaNumerica;
  const igvCalculadoDesdeTotal = baseYTotalValidos
    ? Math.round((totalNumerico - opGravadaNumerica + Number.EPSILON) * 100) / 100
    : null;
  const igvCalculadoDesdeTotalBruto = totalNumerico !== null &&
    Number.isFinite(totalNumerico) &&
    totalNumerico >= 0
    ? Math.round((totalNumerico * 0.18 / 1.18 + Number.EPSILON) * 100) / 100
    : null;
  const igvVisualizado = Number.isFinite(igvNumerico) &&
    igvNumerico > 0 &&
    (opGravadaNumerica === null ||
      !Number.isFinite(opGravadaNumerica) ||
      igvNumerico !== opGravadaNumerica)
    ? igvNumerico
    : (igvCalculadoDesdeTotal > 0
      ? igvCalculadoDesdeTotal
      : igvCalculadoDesdeTotalBruto ?? igv);

  const pagos = Array.isArray(opData.pagos)
    ? opData.pagos
    : Array.isArray(opData.payments)
      ? opData.payments
      : [];

  const hayPagoNoEfectivo = pagos.some((p) => {
    const medioPago = String(p.medio_pago || p.nombre_medio || '')
      .trim()
      .toLowerCase();

    return medioPago !== '' && !medioPago.includes('efectivo');
  });

  const evidenciasOriginales = Array.isArray(opData.evidencias)
    ? opData.evidencias
    : [];

  const evidencias = [
    ...evidenciasOriginales.filter(
      (original) =>
        !evidenciasLocales.some(
          (local) =>
            local.tipo_evidencia === original.tipo_evidencia &&
            local.id_evidencia === original.id_evidencia
        )
    ),
    ...evidenciasLocales,
  ];

  const verificaciones = Array.isArray(opData.verificaciones)
    ? opData.verificaciones
    : [];
  const obtenerEvidenciasVinculadas = (campoIdEvidencia) => [
    ...new Map(
      verificaciones
        .map((verificacion) => evidencias.find(
          (evidencia) => String(evidencia.id_evidencia) === String(verificacion[campoIdEvidencia])
        ))
        .filter(Boolean)
        .map((evidencia) => [String(evidencia.id_evidencia), evidencia])
    ).values(),
  ];
  const evidenciasEmpresa = obtenerEvidenciasVinculadas('id_evidencia_empresa');
  const evidenciasCliente = obtenerEvidenciasVinculadas('id_evidencia_cliente');
  const buscarEvidenciaDePago = (pago, tipo) => {
    const verificacion = verificaciones.find(
      (item) => Number(item.id_pago) === Number(pago?.id_pago)
    );
    const idEvidencia = tipo === 'EMPRESA'
      ? verificacion?.id_evidencia_empresa
      : verificacion?.id_evidencia_cliente;

    if (idEvidencia == null) return null;
    const evidenciasVinculadas = tipo === 'EMPRESA' ? evidenciasEmpresa : evidenciasCliente;
    return evidenciasVinculadas.find(
      (evidencia) => String(evidencia.id_evidencia) === String(idEvidencia)
    ) || null;
  };

  const getEvidenciaUrl = (evidenciaObj) => {
    if (!evidenciaObj) return null;
    const url = evidenciaObj.url_firmada || evidenciaObj.url || evidenciaObj.storage_key;
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return null;
  };

  // ============================================================
  // CONTROL DEL VISOR
  // ============================================================

  const abrirVisorPreview = (dataUrl, file) => {
    setSelectedImageUrl(dataUrl);
    setVisorEsPreview(true);
    setArchivoVisorPreview(file);
    setIsImageOpen(true);
    setZoom(false);
  };

  const abrirVisorEvidencia = (url) => {
    setSelectedImageUrl(url);
    setVisorEsPreview(false);
    setArchivoVisorPreview(null);
    setIsImageOpen(true);
    setZoom(false);
  };

  const cerrarVisor = () => {
    setIsImageOpen(false);
    setSelectedImageUrl(null);
    setVisorEsPreview(false);
    setArchivoVisorPreview(null);
    setZoom(false);
  };

  const pagosEmpresaPendientes = pagos
    .map((pago, index) => ({ pago, index }))
    .filter(({ pago }) => {
      const medioPago = String(pago.medio_pago || pago.nombre_medio || '')
        .trim()
        .toLowerCase();
      return medioPago !== '' &&
        !medioPago.includes('efectivo') &&
        (
          (
            pagoAReemplazar?.tipoEvidencia === 'EMPRESA' &&
            String(pago.id_pago) === String(pagoAReemplazar.pago.id_pago)
          ) ||
          !buscarEvidenciaDePago(pago, 'EMPRESA')
        );
    });

  const handleEvidenciaPagoSubida = async (evidencia, pago, tipoEvidencia) => {
    setPagoAReemplazar(null);
    if (evidencia && typeof evidencia === 'object' && evidencia.storage_key) {
      setEvidenciasLocales((actuales) => [
        ...actuales.filter(
          (actual) => String(actual.id_evidencia) !== String(evidencia.id_evidencia)
        ),
        evidencia,
      ]);
    }

    const campoIdEvidencia = tipoEvidencia === 'EMPRESA'
      ? 'id_evidencia_empresa'
      : 'id_evidencia_cliente';
    const requestId = ++operationLoadRequestRef.current;
    setFreshOperation((actual) => {
      const datosActuales = actual?.id === idOperacion
        ? actual.data
        : initialOpData;
      if (!datosActuales) return actual;

      const verificacionesActuales = Array.isArray(datosActuales.verificaciones)
        ? datosActuales.verificaciones
        : [];
      const existe = verificacionesActuales.some(
        (item) => String(item.id_pago) === String(pago.id_pago)
      );
      const verificacionesActualizadas = evidencia?.id_evidencia == null
        ? verificacionesActuales
        : existe
          ? verificacionesActuales.map((item) => (
            String(item.id_pago) === String(pago.id_pago)
              ? { ...item, [campoIdEvidencia]: evidencia.id_evidencia }
              : item
          ))
          : [...verificacionesActuales, {
            id_pago: pago.id_pago,
            [campoIdEvidencia]: evidencia.id_evidencia,
          }];
      const evidenciasActuales = Array.isArray(datosActuales.evidencias)
        ? datosActuales.evidencias
        : [];
      const evidenciasActualizadas = evidencia?.id_evidencia == null
        ? evidenciasActuales
        : [
          ...evidenciasActuales.filter(
            (item) => String(item.id_evidencia) !== String(evidencia.id_evidencia)
          ),
          evidencia,
        ];

      return {
        id: idOperacion,
        data: {
          ...datosActuales,
          evidencias: evidenciasActualizadas,
          verificaciones: verificacionesActualizadas,
        },
      };
    });

    setOperationLoadError(null);
    try {
      const operacionActualizada = await cargarOperacionActualizada();
      if (requestId === operationLoadRequestRef.current) {
        setFreshOperation({ id: idOperacion, data: operacionActualizada });
      }
    } catch (error) {
      console.error('Error al actualizar los datos después de subir evidencia:', error);
      if (requestId === operationLoadRequestRef.current) {
        setOperationLoadError('La evidencia se guardó, pero no se pudieron actualizar los datos. Intenta recargar la operación.');
      }
    }

    setMensajeEvidencia(`Evidencia ${tipoEvidencia === 'CLIENTE' ? 'del cliente' : 'de la empresa'} registrada y asociada al pago.`);

    if (typeof onEvidenciaSubida === 'function') {
      try {
        await onEvidenciaSubida(idOperacion);
      } catch (error) {
        console.warn('No se pudo notificar al padre:', error);
      }
    }
  };

  const handleForzarValidacion = async (pago) => {
    setPagoEnValidacion(pago.id_pago);
    setErrorValidacionManual(null);
    try {
      const observacion = 'Validación manual: referencias distintas, monto coincide';
      await api.put(`/pagos/${pago.id_pago}`, {
        id_medio_pago: pago.id_medio_pago,
        monto: Number(pago.monto),
        referencia_bancaria: pago.referencia || null,
        observacion,
        estado: 'VERIFICADO',
      });

      setFreshOperation((actual) => {
        const data = actual?.id === idOperacion ? actual.data : opData;
        const pagosActualizados = (Array.isArray(data.pagos) ? data.pagos : []).map((pagoActual) => (
          String(pagoActual.id_pago) === String(pago.id_pago)
            ? { ...pagoActual, estado: 'VERIFICADO', observacion }
            : pagoActual
        ));
        return {
          id: idOperacion,
          data: { ...data, pagos: pagosActualizados },
        };
      });
      setOperationRefreshKey((actual) => actual + 1);
    } catch (error) {
      console.error('Error al forzar validación manual del pago:', error);
      setErrorValidacionManual({
        pagoId: pago.id_pago,
        mensaje: error.response?.data?.message || 'No se pudo verificar el pago. Intenta nuevamente.',
      });
    } finally {
      setPagoEnValidacion(null);
    }
  };

  const esArchivoPdf = (() => {
    if (!selectedImageUrl && !archivoVisorPreview) return false;
    const mime = String(archivoVisorPreview?.type || '').toLowerCase();
    if (mime === 'application/pdf') return true;
    return String(selectedImageUrl || '').toLowerCase().includes('.pdf');
  })();

  const abrirEdicionRegistro = async () => {
    setErrorEdicionRegistro(null);
    try {
      const [mediosResponse, pagosResponse] = await Promise.all([
        api.get('/medios-pago'),
        api.get(`/pagos/operacion/${idOperacion}`),
      ]);
      const medios = mediosResponse.data?.data || mediosResponse.data || [];
      const pagosActualizados = pagosResponse.data?.data || pagosResponse.data;
      if (!Array.isArray(medios)) {
        throw new Error('No se pudo obtener la lista de medios de pago.');
      }
      if (!Array.isArray(pagosActualizados)) {
        throw new Error('No se pudo obtener la lista completa de pagos de esta operación.');
      }
      const pagosNormalizados = pagosActualizados.map((pago) => ({
        ...pago,
        referencia: pago.referencia ?? pago.referencia_bancaria,
      }));
      const pagosEditables = pagosNormalizados.filter((pago) =>
        String(pago.estado || '').toUpperCase() !== 'ANULADO'
      );
      if (pagosEditables.length === 0) {
        throw new Error('Esta operación no tiene pagos editables.');
      }
      const pagoInicial = pagosEditables[0];
      setMediosPagoDisponibles(medios);
      setPagosEdicion(pagosNormalizados);
      setFormularioEdicionRegistro({
        monto_comprobante: String(montoFinal ?? ''),
        id_pago: pagoInicial ? String(pagoInicial.id_pago) : '',
        monto_pago: pagoInicial ? String(pagoInicial.monto ?? '') : '',
        id_medio_pago: pagoInicial ? String(pagoInicial.id_medio_pago ?? '') : '',
        referencia_bancaria: String(
          pagoInicial?.referencia_bancaria ?? pagoInicial?.referencia ?? ''
        ),
        observacion: String(pagoInicial?.observacion ?? ''),
      });
      setModalEdicionAbierto(true);
    } catch (error) {
      setErrorEdicionRegistro(
        error.response?.data?.message || error.message || 'No se pudo preparar la edición.'
      );
    }
  };

  const cambiarPagoEdicion = (idPago) => {
    const pagoSeleccionado = pagosEdicion.find((pago) => String(pago.id_pago) === String(idPago));
    setFormularioEdicionRegistro((actual) => ({
      ...actual,
      id_pago: idPago,
      monto_pago: String(pagoSeleccionado?.monto ?? ''),
      id_medio_pago: String(pagoSeleccionado?.id_medio_pago ?? ''),
      referencia_bancaria: String(
        pagoSeleccionado?.referencia_bancaria ?? pagoSeleccionado?.referencia ?? ''
      ),
      observacion: String(pagoSeleccionado?.observacion ?? ''),
    }));
  };

  const guardarEdicionRegistro = async (event) => {
    event.preventDefault();
    setErrorEdicionRegistro(null);
    setGuardandoRegistro(true);
    try {
      const response = await api.put(`/operaciones/${idOperacion}/registro`, {
        monto_comprobante: Number(formularioEdicionRegistro.monto_comprobante),
        id_pago: Number(formularioEdicionRegistro.id_pago),
        monto_pago: Number(formularioEdicionRegistro.monto_pago),
        id_medio_pago: Number(formularioEdicionRegistro.id_medio_pago),
        referencia_bancaria: formularioEdicionRegistro.referencia_bancaria.trim() || null,
        observacion: formularioEdicionRegistro.observacion.trim() || null,
      });
      const resultado = response.data?.data;
      if (!resultado?.pago || !resultado?.operacion) {
        throw new Error('El servidor guardó una respuesta incompleta al actualizar el registro.');
      }

      const operacionRefrescada = await cargarOperacionActualizada();
      setFreshOperation({ id: idOperacion, data: operacionRefrescada });

      const refrescoCorrecto = await onRegistroActualizado?.(idOperacion);
      if (refrescoCorrecto === false) {
        throw new Error('El registro se guardó, pero no se pudo actualizar la tabla de operaciones.');
      }
      setModalEdicionAbierto(false);
    } catch (error) {
      setErrorEdicionRegistro(
        error.response?.data?.message || error.message || 'No se pudieron guardar los cambios.'
      );
    } finally {
      setGuardandoRegistro(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
          }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de operación"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col border-l bg-white text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:shadow-black/60 ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <header className="shrink-0 border-b border-slate-100 bg-white px-4 pb-4 pt-4 dark:border-slate-700 dark:bg-slate-800 sm:px-8 sm:pb-6 sm:pt-5">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${isPagada
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-600/20 dark:ring-amber-500/30'
                }`}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {estadoFinal}
            </span>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-orange dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {comprobante}
          </h2>

          <div className="mt-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="tabular-nums text-sm text-slate-500 dark:text-slate-400">
              {fecha} {hora ? `· ${hora.substring(0, 5)}` : ''}
            </span>
            {getTurnoBadge(hora)}
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monto total
          </p>
          <p className="mt-1 text-4xl font-black tracking-tight text-brand-orange dark:text-orange-400 tabular-nums">
            {formatPEN(montoFinal)}
          </p>
          {esAdmin && (
            <button
              type="button"
              onClick={abrirEdicionRegistro}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-orange/30 bg-orange-50 px-4 py-2 text-sm font-bold text-brand-orange transition hover:bg-orange-100 dark:border-orange-800/60 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/60"
            >
              <Pencil className="h-4 w-4" />
              Editar Registro
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-900/60 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5">
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Cliente</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {cliente}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Vendedor
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {vendedor}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Usuario registrador
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {nombreUsuario}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-slate-100 dark:border-slate-600 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Receipt className="h-3.5 w-3.5" />
                  Totales
                </h3>

                <dl className="flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">Op. Gravada</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatPEN(opGravada)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">IGV (18%)</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatPEN(igvVisualizado)}
                    </dd>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                    <dt className="font-semibold text-slate-900 dark:text-slate-100">Total</dt>
                    <dd className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatPEN(montoFinal)}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {hayPagoNoEfectivo && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-none">
                <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-brand-orange dark:text-orange-400">
                      <Upload className="h-4 w-4" />
                    </span>
                    Evidencia de la empresa
                  </span>
                  {pagosEmpresaPendientes.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700/50">
                      <Clock className="h-3 w-3" />
                      {pagosEmpresaPendientes.length} PENDIENTE{pagosEmpresaPendientes.length > 1 ? 'S' : ''}
                    </span>
                  )}
                </h3>

                <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Adjunta una evidencia por cada pago. El OCR extraerá los datos automáticamente para la validación cruzada.
                </p>

                {evidenciasEmpresa.length > 0 && (
                  <div className="mb-4 flex flex-col gap-2">
                    {evidenciasEmpresa.map((evidencia, index) => {
                      const pagoVinculado = pagos.find(
                        (pago) => String(verificaciones.find(
                          (item) => String(item.id_evidencia_empresa) === String(evidencia.id_evidencia)
                        )?.id_pago) === String(pago.id_pago)
                      );
                      const url = getEvidenciaUrl(evidencia);
                      return (
                        <div
                          key={evidencia.id_evidencia || index}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => url && abrirVisorEvidencia(url)}
                            disabled={!url}
                            className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <Eye className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                Evidencia #{index + 1} · {pagoVinculado ? `Pago de ${formatPEN(pagoVinculado.monto)}` : 'Pago asociado'}
                              </span>
                            </span>
                            {evidencia.datos_ocr?.monto != null && (
                              <span className="shrink-0 tabular-nums">{formatPEN(evidencia.datos_ocr.monto)}</span>
                            )}
                          </button>
                          {pagoVinculado && (
                            <button
                              type="button"
                              onClick={() => setPagoAReemplazar({
                                pago: pagoVinculado,
                                tipoEvidencia: 'EMPRESA',
                              })}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                              aria-label={`Reemplazar evidencia del pago ${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Reemplazar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pagosEmpresaPendientes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {pagosEmpresaPendientes.map(({ pago, index }) => (
                      <EvidenciaEmpresaPagoForm
                        key={`empresa-${pago.id_pago}`}
                        idOperacion={idOperacion}
                        pago={pago}
                        index={index}
                        tipoEvidencia="EMPRESA"
                        onUploaded={handleEvidenciaPagoSubida}
                        onPreview={abrirVisorPreview}
                      />
                    ))}
                  </div>
                ) : evidenciasEmpresa.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No hay pagos pendientes de evidencia de empresa.
                  </p>
                ) : null}

                {mensajeEvidencia && (
                  <p role="status" className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {mensajeEvidencia}
                  </p>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* ============================================================ */}
            {/* NUEVA SECCIÓN: VALIDACIÓN CRUZADA DE PAGOS                     */}
            {/* ============================================================ */}
            {pagos.length > 0 && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-none">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                  Validación de Pagos
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Comparación automática entre los pagos registrados y los datos OCR de las evidencias del cliente y de la empresa.
                </p>

                <ul className="flex flex-col gap-3">
                  {pagos.map((pago, idx) => {
                    const evidenciaEmpresaPago = buscarEvidenciaDePago(pago, 'EMPRESA');
                    const evidenciaClientePago = buscarEvidenciaDePago(pago, 'CLIENTE');
                    const datosOcrCliente = evidenciaClientePago?.datos_ocr || {};
                    const referenciaClienteOCR = obtenerReferenciaOCR(datosOcrCliente);
                    const pagoParaEvaluacion = {
                      ...pago,
                      referencia: referenciaClienteOCR || pago?.referencia || null,
                    };
                    const evaluacion = evaluarPago(pagoParaEvaluacion, evidenciaEmpresaPago);
                    const datosOcr = evidenciaEmpresaPago?.datos_ocr || {};
                    const refEmpresa = datosOcr.referencia_bancaria || datosOcr.numero_operacion || null;
                    const montoEmpresa = datosOcr.monto ?? null;
                    const datosOcrClientePago = evidenciaClientePago?.datos_ocr || {};
                    const montosOcr = [
                      { tipo: 'empresa', etiqueta: 'Evidencia de empresa', monto: montoEmpresa },
                      { tipo: 'cliente', etiqueta: 'Evidencia del cliente', monto: datosOcrClientePago.monto },
                    ].filter(({ monto }) => (
                      monto !== null &&
                      monto !== undefined &&
                      String(monto).trim() !== '' &&
                      Number.isFinite(Number(monto))
                    ));
                    const refPago = pagoParaEvaluacion.referencia;

                    return (
                      <li key={idx} className="rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {pago.medio_pago || pago.nombre_medio || 'Efectivo'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {formatPEN(pago.monto)}
                            </p>
                          </div>
                          <BadgeEstado evaluacion={evaluacion} />
                        </div>

                        {evaluacion.estado !== 'EFECTIVO' && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Ref. Cliente</p>
                              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                                {refPago || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-0.5">Ref. Empresa</p>
                              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                                {refEmpresa || '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        {evaluacion.estado === 'EFECTIVO' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            El efectivo se verifica durante el cierre de caja.
                          </p>
                        )}

                        {evaluacion.estado !== 'EFECTIVO' && montoEmpresa != null && (
                          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Monto evidencia empresa</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {formatPEN(montoEmpresa)}
                            </p>
                          </div>
                        )}

                        {evaluacion.estado !== 'EFECTIVO' && montosOcr.map(({ tipo, etiqueta, monto }) => {
                          const montoCoincide = compararMontos(pago.monto, monto);
                          return (
                            <div
                              key={`${tipo}-${pago.id_pago}`}
                              role={montoCoincide ? 'status' : 'alert'}
                              className={`mt-2 rounded-lg border p-3 ${
                                montoCoincide
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-300'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {montoCoincide ? (
                                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : (
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold">
                                    {montoCoincide
                                      ? 'Monto coincide'
                                      : `ALERTA: Discrepancia de monto. El pago registrado es ${formatPEN(pago.monto)} pero la evidencia muestra ${formatPEN(monto)}.`}
                                  </p>
                                  <p className="mt-1 text-[11px] opacity-80">{etiqueta}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                          {evaluacion.mensaje}
                        </p>

                        {esAdmin && evaluacion.estado === 'REVISION_MANUAL' && (
                          <button
                            type="button"
                            onClick={() => handleForzarValidacion(pago)}
                            disabled={pagoEnValidacion != null}
                            className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-500 px-3 text-xs font-bold text-white transition-colors hover:bg-amber-600 dark:border-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {String(pagoEnValidacion) === String(pago.id_pago)
                              ? <LoaderCircle className="h-4 w-4 animate-spin" />
                              : <ShieldCheck className="h-4 w-4" />}
                            Forzar Validación
                          </button>
                        )}
                        {errorValidacionManual && String(errorValidacionManual.pagoId) === String(pago.id_pago) && (
                          <p role="alert" className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                            {errorValidacionManual.mensaje}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-brand-orange dark:text-orange-400">
                  <CreditCard className="h-4 w-4" />
                </span>
                Pagos Asociados ({pagos.length})
              </h3>

              <ul className="divide-y divide-slate-100 dark:divide-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 shadow-sm dark:shadow-none">
                {operationLoadError && (
                  <li className="flex items-center justify-between gap-3 py-3 text-xs text-rose-700 dark:text-rose-300">
                    <span>{operationLoadError}</span>
                    <button
                      type="button"
                      onClick={() => setOperationRefreshKey((key) => key + 1)}
                      className="font-semibold underline underline-offset-2"
                    >
                      Reintentar
                    </button>
                  </li>
                )}
                {pagos.length > 0 ? (
                  pagos.map((p, idx) => {
                    const medio = String(
                      p.medio_pago || p.nombre_medio || ''
                    ).toLowerCase();
                    const esEfectivo = medio.includes('efectivo');
                    const evidenciaClientePago = buscarEvidenciaDePago(p, 'CLIENTE');
                    const evidenciaClientePagoUrl = getEvidenciaUrl(evidenciaClientePago);
                    const datosOcrCliente = evidenciaClientePago?.datos_ocr || {};
                    const referenciaCliente =
                      p.referencia || obtenerReferenciaOCR(datosOcrCliente);
                    const puedeVerCliente = !esEfectivo && evidenciaClientePagoUrl;
                    const estadoPago = String(p.estado || 'REGISTRADO').toUpperCase();
                    const pagoVerificado = ['VERIFICADO', 'VERIFICADA', 'COMPLETADO'].includes(estadoPago);
                    const pagoAnulado = estadoPago === 'ANULADO';

                    return (
                      <li
                        key={idx}
                        className="py-4"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {p.medio_pago || p.nombre_medio || 'Efectivo'}
                              </p>

                              {referenciaCliente && referenciaCliente !== 'None' && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  Ref: {referenciaCliente}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatPEN(p.monto)}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                pagoVerificado
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : pagoAnulado
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {pagoVerificado ? 'Verificado' : pagoAnulado ? 'Anulado' : 'Pendiente'}
                              </span>
                            </div>
                          </div>

                          {!esEfectivo && (
                            <div className="flex flex-wrap items-center gap-2">
                              {puedeVerCliente && (
                                <button
                                  type="button"
                                  onClick={() => abrirVisorEvidencia(evidenciaClientePagoUrl)}
                                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                  title="Ver evidencia del cliente"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver Evidencia
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setPagoAReemplazar({
                                  pago: p,
                                  tipoEvidencia: 'CLIENTE',
                                })}
                                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                                aria-label={`Reemplazar evidencia del cliente del pago ${idx + 1}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Reemplazar
                              </button>
                            </div>
                          )}
                        </div>
                        {pagoAReemplazar?.tipoEvidencia === 'CLIENTE' &&
                          String(pagoAReemplazar.pago.id_pago) === String(p.id_pago) && (
                            <div className="mt-3">
                              <EvidenciaEmpresaPagoForm
                                key={`cliente-${p.id_pago}`}
                                idOperacion={idOperacion}
                                pago={p}
                                index={idx}
                                tipoEvidencia="CLIENTE"
                                onUploaded={handleEvidenciaPagoSubida}
                                onPreview={abrirVisorPreview}
                              />
                            </div>
                          )}
                      </li>
                    );
                  })
                ) : (
                  <li className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay pagos registrados.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:px-8 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cerrar
          </button>
        </footer>
      </aside>

      {modalEdicionAbierto && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !guardandoRegistro) {
              setModalEdicionAbierto(false);
            }
          }}
        >
          <form
            onSubmit={guardarEdicionRegistro}
            className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
                  Editar registro de operación
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Los cambios actualizan el comprobante y el pago existente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicionAbierto(false)}
                disabled={guardandoRegistro}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Cerrar edición"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorEdicionRegistro && (
              <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                {errorEdicionRegistro}
              </p>
            )}

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Monto del comprobante (S/)
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={formularioEdicionRegistro.monto_comprobante}
                  onChange={(event) => setFormularioEdicionRegistro((actual) => ({
                    ...actual,
                    monto_comprobante: event.target.value,
                  }))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Pago que se corrige
                </span>
                <select
                  required
                  value={formularioEdicionRegistro.id_pago}
                  onChange={(event) => cambiarPagoEdicion(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {pagosEdicion.filter((pago) => String(pago.estado || '').toUpperCase() !== 'ANULADO')
                    .map((pago) => (
                      <option key={pago.id_pago} value={pago.id_pago}>
                        {(pago.medio_pago || pago.nombre_medio || 'Pago')} · {formatPEN(pago.monto)}
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Monto del pago (S/)
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={formularioEdicionRegistro.monto_pago}
                    onChange={(event) => setFormularioEdicionRegistro((actual) => ({
                      ...actual,
                      monto_pago: event.target.value,
                    }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Medio de pago
                  </span>
                  <select
                    required
                    value={formularioEdicionRegistro.id_medio_pago}
                    onChange={(event) => setFormularioEdicionRegistro((actual) => ({
                      ...actual,
                      id_medio_pago: event.target.value,
                    }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecciona un medio</option>
                    {mediosPagoDisponibles.filter((medio) => medio.estado !== false)
                      .map((medio) => (
                        <option key={medio.id_medio_pago} value={medio.id_medio_pago}>
                          {medio.nombre}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Referencia bancaria
                </span>
                <input
                  type="text"
                  maxLength={100}
                  value={formularioEdicionRegistro.referencia_bancaria}
                  onChange={(event) => setFormularioEdicionRegistro((actual) => ({
                    ...actual,
                    referencia_bancaria: event.target.value,
                  }))}
                  placeholder="Número de operación o referencia"
                  disabled={mediosPagoDisponibles.find(
                    (medio) => String(medio.id_medio_pago) === String(formularioEdicionRegistro.id_medio_pago)
                  )?.es_efectivo === true}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Observación
                </span>
                <textarea
                  maxLength={500}
                  rows={3}
                  value={formularioEdicionRegistro.observacion}
                  onChange={(event) => setFormularioEdicionRegistro((actual) => ({
                    ...actual,
                    observacion: event.target.value,
                  }))}
                  placeholder="Observación del pago (opcional)"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-orange dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                El total de los pagos activos no puede superar el monto del comprobante. Si cambias la referencia de un pago virtual, quedará pendiente de nueva conciliación.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalEdicionAbierto(false)}
                disabled={guardandoRegistro}
                className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoRegistro || pagos.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardandoRegistro
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />}
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISOR SPLIT-SCREEN RESPONSIVE */}
      {isImageOpen && selectedImageUrl && (
        <div
          className="fixed inset-y-0 left-0 z-[60] flex w-full select-none flex-col items-center justify-center border-r border-slate-700 bg-slate-950/95 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6 xl:right-[500px] xl:w-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {visorEsPreview && (
            <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-xl">
              Vista previa — aún no se ha subido
            </div>
          )}

          <button
            type="button"
            onClick={cerrarVisor}
            className="absolute right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-slate-700 active:scale-95"
            title="Cerrar visor"
          >
            <X className="h-5 w-5" />
          </button>

          {!esArchivoPdf && (
            <button
              type="button"
              onClick={() => setZoom(!zoom)}
              className="absolute left-4 top-4 z-40 flex items-center gap-2 rounded-full bg-slate-800/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-slate-700"
            >
              {zoom ? (
                <>
                  <ZoomOut className="h-4 w-4 text-brand-orange" />
                  <span>Zoom 150% (Clic para alejar)</span>
                </>
              ) : (
                <>
                  <ZoomIn className="h-4 w-4 text-brand-orange" />
                  <span>100% (Clic para ampliar)</span>
                </>
              )}
            </button>
          )}

          <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
            {esArchivoPdf ? (
              <iframe
                src={selectedImageUrl}
                title="Evidencia documental"
                className="h-[85vh] w-full rounded-lg bg-white"
              />
            ) : (
              <img
                src={selectedImageUrl}
                alt="Evidencia de la operación"
                onClick={() => setZoom(!zoom)}
                className={`max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out ${zoom ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                  }`}
              />
            )}
          </div>

          <p className="mt-2 text-xs font-medium text-slate-400">
            {esArchivoPdf
              ? 'Documento PDF'
              : zoom
                ? 'Haz clic en la imagen para alejar'
                : 'Haz clic en la imagen para hacer zoom'}
          </p>
        </div>
      )}
    </div>
  );
}