import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  CreditCard,
  Package,
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
  LoaderCircle,
  FileText,
  Banknote,
  Hash,
  Landmark,
  User,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import api from '../../lib/api';
import ocrService from '../../services/ocr.service';

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

const compararMontos = (montoPago, montoEvidencia) => {
  const p = Number(montoPago);
  const e = Number(montoEvidencia);
  if (!Number.isFinite(p) || !Number.isFinite(e)) return false;
  // Tolerancia de ±1 sol por redondeo
  return Math.abs(p - e) <= 1;
};

const evaluarPago = (pago, evidenciaEmpresa) => {
  const medio = String(pago?.medio_pago || pago?.nombre_medio || '').trim();
  const medioLower = medio.toLowerCase();

  // Efectivo no se verifica con OCR
  if (medioLower.includes('efectivo')) {
    return { estado: 'EFECTIVO', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icono: 'info', mensaje: 'Se verifica en el cierre de caja' };
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

  if (!normRefPago && !normRefEmpresa) {
    return { estado: 'SIN_REFERENCIA', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', icono: 'info', mensaje: 'Sin número de operación en pago ni en evidencia' };
  }

  if (refCoincide && montoCoincide) {
    return { estado: 'COINCIDE', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60', icono: 'check', mensaje: 'Monto y referencia coinciden' };
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

function EvidenciaEmpresaPagoForm({ idOperacion, pago, index, onUploaded, onPreview }) {
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
      formulario.append('tipo_evidencia', 'EMPRESA');
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
      await onUploaded(evidencia, pago);
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
        Subir evidencia para Pago #{index + 1} ({medio} - {formatPEN(pago.monto)})
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
              <div className="grid grid-cols-2 gap-2">
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
export function OperacionDetailDrawerPremium({ op, onClose, onEvidenciaSubida }) {
  const open = op !== null;
  const [lastOperation, setLastOperation] = useState(op);
  if (op && op !== lastOperation) setLastOperation(op);
  const initialOpData = op || lastOperation;
  const closeRef = useRef(null);
  const [freshOperation, setFreshOperation] = useState(null);
  const [operationLoadError, setOperationLoadError] = useState(null);
  const [operationRefreshKey, setOperationRefreshKey] = useState(0);

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [visorEsPreview, setVisorEsPreview] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [archivoVisorPreview, setArchivoVisorPreview] = useState(null);
  const [mensajeEvidencia, setMensajeEvidencia] = useState('');
  const [evidenciasLocales, setEvidenciasLocales] = useState([]);

  const idOperacion = Number(
    initialOpData?.id_operacion ??
    initialOpData?.idOperacion ??
    initialOpData?.operacion?.id_operacion
  );
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
    }
  }

  if (!Object.is(previousOperationId, idOperacion)) {
    setPreviousOperationId(idOperacion);
    setArchivoVisorPreview(null);
    setMensajeEvidencia('');
    setEvidenciasLocales([]);
  }

  useEffect(() => {
    if (!open || !Number.isFinite(idOperacion)) return undefined;

    let active = true;
    const cargarOperacionActualizada = async () => {
      setOperationLoadError(null);
      try {
        const [operationResponse, paymentsResponse] = await Promise.all([
          api.get(`/operaciones/${idOperacion}`),
          api.get(`/pagos/operacion/${idOperacion}`),
        ]);
        const operationData = operationResponse.data?.data || operationResponse.data;
        const paymentsData = paymentsResponse.data?.data || paymentsResponse.data;
        if (!Array.isArray(paymentsData)) {
          throw new Error('La respuesta de pagos no tiene el formato esperado.');
        }
        const data = {
          ...(op || {}),
          ...operationData,
          pagos: paymentsData.map((payment) => ({
            ...payment,
            referencia: payment.referencia ?? payment.referencia_bancaria,
          })),
        };
        if (active) {
          setFreshOperation({ id: idOperacion, data });
        }
      } catch (error) {
        console.error('Error al actualizar los pagos de la operación:', error);
        if (active) {
          setOperationLoadError('No se pudieron actualizar los pagos de esta operación.');
        }
      }
    };

    void cargarOperacionActualizada();
    return () => {
      active = false;
    };
  }, [open, idOperacion, op, operationRefreshKey]);

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

  let rawItems = opData.items || dataComprobante.items;

  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }

  const items = Array.isArray(rawItems) ? rawItems : [];

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
  const evidenciasEmpresa = evidencias.filter(
    (evidencia) => evidencia.tipo_evidencia === 'EMPRESA'
  );
  const buscarEvidenciaDePago = (pago, tipo) => {
    const verificacion = verificaciones.find(
      (item) => Number(item.id_pago) === Number(pago?.id_pago)
    );
    const idEvidencia = tipo === 'EMPRESA'
      ? verificacion?.id_evidencia_empresa
      : verificacion?.id_evidencia_cliente;

    if (idEvidencia == null) return null;
    return evidencias.find(
      (evidencia) => Number(evidencia.id_evidencia) === Number(idEvidencia)
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
        !buscarEvidenciaDePago(pago, 'EMPRESA');
    });

  const handleEvidenciaPagoSubida = async (evidencia, pago) => {
    if (evidencia && typeof evidencia === 'object' && evidencia.storage_key) {
      setEvidenciasLocales((actuales) => [...actuales, evidencia]);
    }

    if (evidencia?.id_evidencia != null) {
      setFreshOperation((actual) => {
        if (actual?.id !== idOperacion) return actual;
        const verificacionesActuales = Array.isArray(actual.data.verificaciones)
          ? actual.data.verificaciones
          : [];
        const existe = verificacionesActuales.some(
          (item) => String(item.id_pago) === String(pago.id_pago)
        );
        const verificacionesActualizadas = existe
          ? verificacionesActuales.map((item) => (
            String(item.id_pago) === String(pago.id_pago)
              ? { ...item, id_evidencia_empresa: evidencia.id_evidencia }
              : item
          ))
          : [...verificacionesActuales, {
            id_pago: pago.id_pago,
            id_evidencia_empresa: evidencia.id_evidencia,
          }];
        return {
          ...actual,
          data: { ...actual.data, verificaciones: verificacionesActualizadas },
        };
      });
    }

    setOperationRefreshKey((actual) => actual + 1);
    setMensajeEvidencia('Evidencia de empresa registrada y asociada al pago.');

    if (typeof onEvidenciaSubida === 'function') {
      try {
        await onEvidenciaSubida(idOperacion);
      } catch (error) {
        console.warn('No se pudo notificar al padre:', error);
      }
    }
  };

  const esArchivoPdf = (() => {
    if (!selectedImageUrl && !archivoVisorPreview) return false;
    const mime = String(archivoVisorPreview?.type || '').toLowerCase();
    if (mime === 'application/pdf') return true;
    return String(selectedImageUrl || '').toLowerCase().includes('.pdf');
  })();

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
        className={`absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl shadow-slate-900/20 dark:shadow-black/60 border-l dark:border-slate-700 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <header className="border-b border-slate-100 dark:border-slate-700 px-6 pb-6 pt-5 sm:px-8 bg-white dark:bg-slate-800">
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
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange"
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
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-900/60 px-6 py-6 sm:px-8">
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
                      {formatPEN(igv)}
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
                        <button
                          key={evidencia.id_evidencia || index}
                          type="button"
                          onClick={() => url && abrirVisorEvidencia(url)}
                          disabled={!url}
                          className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-60"
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
                      );
                    })}
                  </div>
                )}

                {pagosEmpresaPendientes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {pagosEmpresaPendientes.map(({ pago, index }) => (
                      <EvidenciaEmpresaPagoForm
                        key={pago.id_pago}
                        idOperacion={idOperacion}
                        pago={pago}
                        index={index}
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
                  Comparación automática entre los pagos registrados y los datos extraídos de la evidencia de la empresa.
                </p>

                <ul className="flex flex-col gap-3">
                  {pagos.map((pago, idx) => {
                    const evidenciaEmpresaPago = buscarEvidenciaDePago(pago, 'EMPRESA');
                    const evidenciaClientePago = buscarEvidenciaDePago(pago, 'CLIENTE');
                    const datosOcrCliente = evidenciaClientePago?.datos_ocr || {};
                    const pagoParaEvaluacion = {
                      ...pago,
                      referencia: pago?.referencia
                        || datosOcrCliente.referencia_bancaria
                        || datosOcrCliente.numero_operacion
                        || null,
                    };
                    const evaluacion = evaluarPago(pagoParaEvaluacion, evidenciaEmpresaPago);
                    const datosOcr = evidenciaEmpresaPago?.datos_ocr || {};
                    const refEmpresa = datosOcr.referencia_bancaria || datosOcr.numero_operacion || null;
                    const montoEmpresa = datosOcr.monto ?? null;
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

                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                          {evaluacion.mensaje}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/40 text-brand-orange dark:text-orange-400">
                  <Package className="h-4 w-4" />
                </span>
                Detalle de Productos ({items.length})
              </h3>

              <ul className="divide-y divide-slate-100 dark:divide-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 shadow-sm dark:shadow-none">
                {items.length > 0 ? (
                  items.map((p, idx) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                          {p.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          Cant: {p.cantidad} · P. Unit:{' '}
                          {formatPEN(p.precio_unitario)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatPEN(p.total)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay productos detallados.
                  </li>
                )}
              </ul>
            </section>

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
                    const puedeVerCliente = !esEfectivo && evidenciaClientePagoUrl;
                    const estadoPago = String(p.estado || 'REGISTRADO').toUpperCase();
                    const pagoVerificado = ['VERIFICADO', 'VERIFICADA', 'COMPLETADO'].includes(estadoPago);
                    const pagoAnulado = estadoPago === 'ANULADO';

                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {p.medio_pago || p.nombre_medio || 'Efectivo'}
                            </p>

                            {puedeVerCliente && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirVisorEvidencia(evidenciaClientePagoUrl)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                title="Ver evidencia del cliente"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver Evidencia
                              </button>
                            )}
                          </div>

                          {p.referencia && p.referencia !== 'None' && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              Ref: {p.referencia}
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

        <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cerrar
          </button>
        </footer>
      </aside>

      {/* VISOR SPLIT-SCREEN RESPONSIVE */}
      {isImageOpen && selectedImageUrl && (
        <div
          className="fixed inset-y-0 left-0 z-[60] flex w-full select-none flex-col items-center justify-center border-r border-slate-700 bg-slate-950/95 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6 lg:right-[500px] lg:w-auto"
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