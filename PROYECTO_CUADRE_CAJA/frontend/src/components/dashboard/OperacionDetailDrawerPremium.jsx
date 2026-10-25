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
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
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
    return { estado: 'EFECTIVO', color: 'bg-slate-50 text-slate-700 border-slate-200', icono: 'info', mensaje: 'Se verifica en el cierre de caja' };
  }

  // Sin evidencia empresa
  if (!evidenciaEmpresa) {
    return { estado: 'SIN_EVIDENCIA', color: 'bg-slate-50 text-slate-700 border-slate-200', icono: 'info', mensaje: 'Sin evidencia de empresa registrada' };
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
    return { estado: 'SIN_REFERENCIA', color: 'bg-slate-50 text-slate-700 border-slate-200', icono: 'info', mensaje: 'Sin número de operación en pago ni en evidencia' };
  }

  if (refCoincide && montoCoincide) {
    return { estado: 'COINCIDE', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icono: 'check', mensaje: 'Monto y referencia coinciden' };
  }

  if (refCoincide || montoCoincide) {
    return { estado: 'PARCIAL', color: 'bg-amber-50 text-amber-700 border-amber-200', icono: 'alert', mensaje: refCoincide ? 'Referencia coincide, monto difiere' : 'Monto coincide, referencia difiere' };
  }

  return { estado: 'DIFERENTE', color: 'bg-rose-50 text-rose-700 border-rose-200', icono: 'x', mensaje: 'Ni el monto ni la referencia coinciden' };
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

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function OperacionDetailDrawerPremium({ op, onClose, onEvidenciaSubida }) {
  const open = op !== null;
  const lastOperation = useRef(op);

  if (op) lastOperation.current = op;

  const opData = lastOperation.current;
  const closeRef = useRef(null);
  const fileInputEmpresaRef = useRef(null);

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [visorEsPreview, setVisorEsPreview] = useState(false);
  const [zoom, setZoom] = useState(false);

  const [archivoEmpresa, setArchivoEmpresa] = useState(null);
  const [previewEmpresa, setPreviewEmpresa] = useState(null);
  const [ocrEmpresa, setOcrEmpresa] = useState(null);
  const [procesandoOcr, setProcesandoOcr] = useState(false);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [mensajeEvidencia, setMensajeEvidencia] = useState('');
  const [errorEvidencia, setErrorEvidencia] = useState('');
  const [evidenciasLocales, setEvidenciasLocales] = useState([]);

  const idOperacion = Number(
    opData?.id_operacion ??
    opData?.idOperacion ??
    opData?.operacion?.id_operacion
  );

  useEffect(() => {
    if (!open) {
      setIsImageOpen(false);
      setSelectedImageUrl(null);
      setVisorEsPreview(false);
      setZoom(false);
      return;
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isImageOpen) {
          cerrarVisor();
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

  useEffect(() => {
    setArchivoEmpresa(null);
    setPreviewEmpresa(null);
    setOcrEmpresa(null);
    setProcesandoOcr(false);
    setMensajeEvidencia('');
    setErrorEvidencia('');
    setEvidenciasLocales([]);
    if (fileInputEmpresaRef.current) {
      fileInputEmpresaRef.current.value = '';
    }
  }, [idOperacion]);

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
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
          <Sun className="h-3.5 w-3.5" />
          Mañana
        </span>
      );
    }

    if (horaComparar > '14:00:00' && horaComparar <= '20:00:00') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
          <Moon className="h-3.5 w-3.5" />
          Tarde
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
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

  // CAMBIO: separar evidencias por tipo para la validación cruzada
  const evidenciaEmpresaObj = [...evidencias]
    .reverse()
    .find((e) => e.tipo_evidencia === 'EMPRESA');

  const evidenciaClienteObj = [...evidencias]
    .reverse()
    .find((e) => e.tipo_evidencia === 'CLIENTE');

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

  const abrirVisorPreview = (dataUrl) => {
    setSelectedImageUrl(dataUrl);
    setVisorEsPreview(true);
    setIsImageOpen(true);
    setZoom(false);
  };

  const abrirVisorEvidencia = (url) => {
    setSelectedImageUrl(url);
    setVisorEsPreview(false);
    setIsImageOpen(true);
    setZoom(false);
  };

  const cerrarVisor = () => {
    setIsImageOpen(false);
    setSelectedImageUrl(null);
    setVisorEsPreview(false);
    setZoom(false);
  };

  // ============================================================
  // SELECCIÓN DE ARCHIVO + OCR AUTOMÁTICO
  // ============================================================

  const handleFileChangeEmpresa = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorEvidencia('');
    setMensajeEvidencia('');
    setOcrEmpresa(null);
    setPreviewEmpresa(null);

    const esImagen = file.type.startsWith('image/');
    const esPdf = file.type === 'application/pdf';

    if (!esImagen && !esPdf) {
      setErrorEvidencia('Selecciona una imagen o un documento PDF.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorEvidencia('El archivo no debe superar los 10 MB.');
      e.target.value = '';
      return;
    }

    setArchivoEmpresa(file);

    if (!esImagen) {
      return;
    }

    let dataUrl = null;
    try {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPreviewEmpresa(dataUrl);
      abrirVisorPreview(dataUrl);
    } catch {
      // Sin preview, no bloquea
    }

    setProcesandoOcr(true);
    try {
      const response = await ocrService.procesar(file, 'TRANSFERENCIA');
      const rawData = response?.data?.data || response?.data;
      const datosExtraidos = rawData?.datos_extraidos || rawData || null;

      if (datosExtraidos && Object.keys(datosExtraidos).length > 0) {
        setOcrEmpresa(datosExtraidos);
      }
    } catch (ocrError) {
      console.warn('OCR no concluyente:', ocrError);
    } finally {
      setProcesandoOcr(false);
    }
  };

  const cancelarSeleccionEmpresa = () => {
    setArchivoEmpresa(null);
    setPreviewEmpresa(null);
    setOcrEmpresa(null);
    setErrorEvidencia('');
    setMensajeEvidencia('');
    cerrarVisor();
    if (fileInputEmpresaRef.current) {
      fileInputEmpresaRef.current.value = '';
    }
  };

  const subirEvidenciaEmpresa = async () => {
    if (!archivoEmpresa) {
      setErrorEvidencia('Selecciona un archivo antes de subirlo.');
      return;
    }
    if (!Number.isInteger(idOperacion) || idOperacion <= 0) {
      setErrorEvidencia('No se pudo identificar la operación.');
      return;
    }

    try {
      setSubiendoEvidencia(true);
      setErrorEvidencia('');
      setMensajeEvidencia('');

      const formulario = new FormData();
      formulario.append('archivo', archivoEmpresa);
      formulario.append('id_operacion', String(idOperacion));
      formulario.append('tipo_evidencia', 'EMPRESA');

      const ahora = new Date();
      const fechaLocal = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, '0'),
        String(ahora.getDate()).padStart(2, '0'),
      ].join('-');
      formulario.append('fecha_evidencia', fechaLocal);

      if (ocrEmpresa) {
        formulario.append('datos_ocr', JSON.stringify(ocrEmpresa));
      }

      const respuesta = await api.post('/evidencias', formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const evidenciaCreada =
        respuesta.data?.data?.evidencia || respuesta.data?.data;

      if (
        evidenciaCreada &&
        typeof evidenciaCreada === 'object' &&
        evidenciaCreada.storage_key
      ) {
        setEvidenciasLocales((actuales) => [...actuales, evidenciaCreada]);
      }

      try {
        const consulta = await api.get(
          `/evidencias/operacion/${idOperacion}`
        );
        const resultado = consulta.data?.data;
        const lista = Array.isArray(resultado)
          ? resultado
          : Array.isArray(resultado?.evidencias)
            ? resultado.evidencias
            : null;
        if (lista) setEvidenciasLocales(lista);
      } catch {
        // No invalida la subida
      }

      setArchivoEmpresa(null);
      setPreviewEmpresa(null);
      setOcrEmpresa(null);
      cerrarVisor();
      if (fileInputEmpresaRef.current) {
        fileInputEmpresaRef.current.value = '';
      }

      setMensajeEvidencia(
        ocrEmpresa
          ? 'Evidencia de empresa registrada. El OCR extrajo datos que se usarán en la verificación cruzada.'
          : 'Evidencia de empresa registrada. No se pudo extraer información por OCR; queda disponible para revisión manual.'
      );

      if (typeof onEvidenciaSubida === 'function') {
        try {
          await onEvidenciaSubida(idOperacion);
        } catch (e) {
          console.warn('No se pudo notificar al padre:', e);
        }
      }
    } catch (error) {
      setErrorEvidencia(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'No se pudo subir la evidencia. Inténtalo nuevamente.'
      );
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  const evidenciaEmpresaUrl = getEvidenciaUrl(evidenciaEmpresaObj);
  const evidenciaClienteUrl = getEvidenciaUrl(evidenciaClienteObj);
  const evidenciaEmpresaYaExiste = Boolean(evidenciaEmpresaObj);

  const esArchivoPdf = (() => {
    if (!selectedImageUrl && !archivoEmpresa) return false;
    const mime = String(archivoEmpresa?.type || '').toLowerCase();
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
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
          }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de operación"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[500px] flex-col bg-white text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <header className="border-b border-slate-100 px-6 pb-6 pt-5 sm:px-8">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${isPagada
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                }`}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {estadoFinal}
            </span>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            {comprobante}
          </h2>

          <div className="mt-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span className="tabular-nums text-sm text-slate-500">
              {fecha} {hora ? `· ${hora.substring(0, 5)}` : ''}
            </span>
            {getTurnoBadge(hora)}
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">
            Monto total
          </p>
          <p className="mt-1 text-4xl font-black tracking-tight text-brand-orange tabular-nums">
            {formatPEN(montoFinal)}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5">
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Cliente</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {cliente}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Vendedor
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {vendedor}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-slate-500">
                    Usuario registrador
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {nombreUsuario}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-slate-100 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Receipt className="h-3.5 w-3.5" />
                  Totales
                </h3>

                <dl className="flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Op. Gravada</dt>
                    <dd className="font-medium text-slate-700 tabular-nums">
                      {formatPEN(opGravada)}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">IGV (18%)</dt>
                    <dd className="font-medium text-slate-700 tabular-nums">
                      {formatPEN(igv)}
                    </dd>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                    <dt className="font-semibold text-slate-900">Total</dt>
                    <dd className="text-base font-bold text-slate-900 tabular-nums">
                      {formatPEN(montoFinal)}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {hayPagoNoEfectivo && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                      <Upload className="h-4 w-4" />
                    </span>
                    Evidencia de la empresa
                  </span>
                  {!evidenciaEmpresaYaExiste && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
                      <Clock className="h-3 w-3" />
                      PENDIENTE
                    </span>
                  )}
                </h3>

                {evidenciaEmpresaYaExiste ? (
                  <p className="mb-4 text-xs leading-relaxed text-slate-500">
                    La evidencia de la empresa ya está registrada y vinculada
                    a esta operación. Puedes consultarla con el botón de abajo.
                  </p>
                ) : (
                  <p className="mb-4 text-xs leading-relaxed text-slate-500">
                    Adjunta el comprobante de la empresa cuando esté disponible.
                    Puede subirse horas o días después de la operación. El OCR
                    extraerá los datos automáticamente y la imagen se mostrará
                    a la izquierda para que compares con los datos extraídos.
                  </p>
                )}

                {evidenciaEmpresaYaExiste && (
                  <>
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-800">
                        Evidencia de empresa registrada
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirVisorEvidencia(evidenciaEmpresaUrl)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4" />
                      Ver evidencia de la empresa
                    </button>

                    {mensajeEvidencia && (
                      <p
                        role="status"
                        className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
                      >
                        {mensajeEvidencia}
                      </p>
                    )}
                  </>
                )}

                {!evidenciaEmpresaYaExiste && !archivoEmpresa && (
                  <>
                    <label
                      htmlFor="evidencia-empresa"
                      className="mb-2 block text-xs font-medium text-slate-700"
                    >
                      Seleccionar archivo (imagen o PDF)
                    </label>

                    <input
                      id="evidencia-empresa"
                      ref={fileInputEmpresaRef}
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleFileChangeEmpresa}
                      className="block w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-600 file:mr-3 file:cursor-pointer file:border-0 file:bg-orange-50 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-brand-orange hover:file:bg-orange-100"
                    />
                  </>
                )}

                {!evidenciaEmpresaYaExiste && archivoEmpresa && (
                  <>
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                      {archivoEmpresa.type === 'application/pdf' ? (
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-xs font-medium text-slate-700">
                          {archivoEmpresa.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(archivoEmpresa.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelarSeleccionEmpresa}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title="Quitar archivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {previewEmpresa && (
                      <button
                        type="button"
                        onClick={() => abrirVisorPreview(previewEmpresa)}
                        className="mb-3 block w-full cursor-zoom-in"
                        title="Ver imagen completa a la izquierda"
                      >
                        <img
                          src={previewEmpresa}
                          alt="Vista previa de evidencia"
                          className="max-h-64 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
                        />
                      </button>
                    )}

                    {procesandoOcr && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Procesando OCR automáticamente... Compara la imagen
                        (izquierda) con los datos extraídos.
                      </div>
                    )}

                    {!procesandoOcr && ocrEmpresa && (
                      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                          Datos extraídos por OCR
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {ocrEmpresa.monto != null && (
                            <DatoOCR
                              icon={<Banknote className="h-3.5 w-3.5 text-emerald-500" />}
                              label="Monto"
                            >
                              S/ {Number(ocrEmpresa.monto).toFixed(2)}
                            </DatoOCR>
                          )}
                          {ocrEmpresa.fecha_operacion && (
                            <DatoOCR
                              icon={<Calendar className="h-3.5 w-3.5 text-blue-500" />}
                              label="Fecha"
                            >
                              {ocrEmpresa.fecha_operacion}
                            </DatoOCR>
                          )}
                          {(ocrEmpresa.referencia_bancaria ||
                            ocrEmpresa.numero_operacion) && (
                              <DatoOCR
                                icon={<Hash className="h-3.5 w-3.5 text-purple-500" />}
                                label="N.º operación"
                              >
                                {ocrEmpresa.referencia_bancaria ||
                                  ocrEmpresa.numero_operacion}
                              </DatoOCR>
                            )}
                          {(ocrEmpresa.aplicacion_banco ||
                            ocrEmpresa.banco) && (
                              <DatoOCR
                                icon={<Landmark className="h-3.5 w-3.5 text-indigo-500" />}
                                label="Banco"
                              >
                                {ocrEmpresa.aplicacion_banco || ocrEmpresa.banco}
                              </DatoOCR>
                            )}
                          {ocrEmpresa.destinatario && (
                            <DatoOCR
                              icon={<User className="h-3.5 w-3.5 text-orange-500" />}
                              label="Beneficiario"
                            >
                              {ocrEmpresa.destinatario}
                            </DatoOCR>
                          )}
                        </div>
                      </div>
                    )}

                    {!procesandoOcr && !ocrEmpresa && archivoEmpresa.type.startsWith('image/') && (
                      <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                        El OCR no pudo extraer datos de esta imagen. Puedes
                        subirla igual; quedará disponible para revisión manual.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={subirEvidenciaEmpresa}
                      disabled={subiendoEvidencia || procesandoOcr}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {subiendoEvidencia ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Subiendo evidencia...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Confirmar y subir
                        </>
                      )}
                    </button>
                  </>
                )}

                {errorEvidencia && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {errorEvidencia}
                  </p>
                )}
              </section>
            )}

            {/* ============================================================ */}
            {/* NUEVA SECCIÓN: VALIDACIÓN CRUZADA DE PAGOS                     */}
            {/* ============================================================ */}
            {pagos.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                  Validación de Pagos
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-slate-500">
                  Comparación automática entre los pagos registrados y los datos extraídos de la evidencia de la empresa.
                </p>

                <ul className="flex flex-col gap-3">
                  {pagos.map((pago, idx) => {
                    const evaluacion = evaluarPago(pago, evidenciaEmpresaObj);
                    const datosOcr = evidenciaEmpresaObj?.datos_ocr || {};
                    const refEmpresa = datosOcr.referencia_bancaria || datosOcr.numero_operacion || null;
                    const montoEmpresa = datosOcr.monto ?? null;
                    const refPago = pago?.referencia || null;

                    return (
                      <li key={idx} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {pago.medio_pago || pago.nombre_medio || 'Efectivo'}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {formatPEN(pago.monto)}
                            </p>
                          </div>
                          <BadgeEstado evaluacion={evaluacion} />
                        </div>

                        {evaluacion.estado !== 'EFECTIVO' && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ref. Cliente</p>
                              <p className="text-xs font-mono text-slate-700 break-all">
                                {refPago || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ref. Empresa</p>
                              <p className="text-xs font-mono text-slate-700 break-all">
                                {refEmpresa || '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        {evaluacion.estado === 'EFECTIVO' && (
                          <p className="text-xs text-slate-500 mt-1">
                            El efectivo se verifica durante el cierre de caja.
                          </p>
                        )}

                        {evaluacion.estado !== 'EFECTIVO' && montoEmpresa != null && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Monto evidencia empresa</p>
                            <p className="text-xs font-semibold text-slate-700 tabular-nums">
                              {formatPEN(montoEmpresa)}
                            </p>
                          </div>
                        )}

                        <p className="mt-2 text-xs text-slate-500 italic">
                          {evaluacion.mensaje}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                  <Package className="h-4 w-4" />
                </span>
                Detalle de Productos ({items.length})
              </h3>

              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
                {items.length > 0 ? (
                  items.map((p, idx) => (
                    <li
                      key={idx}
                      className="flex items-start justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-slate-900">
                          {p.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 tabular-nums">
                          Cant: {p.cantidad} · P. Unit:{' '}
                          {formatPEN(p.precio_unitario)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                        {formatPEN(p.total)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="py-4 text-center text-sm text-slate-500">
                    No hay productos detallados.
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange">
                  <CreditCard className="h-4 w-4" />
                </span>
                Pagos Asociados ({pagos.length})
              </h3>

              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
                {pagos.length > 0 ? (
                  pagos.map((p, idx) => {
                    const medio = String(
                      p.medio_pago || p.nombre_medio || ''
                    ).toLowerCase();
                    const esEfectivo = medio.includes('efectivo');
                    const puedeVerCliente = !esEfectivo && evidenciaClienteUrl;

                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {p.medio_pago || p.nombre_medio || 'Efectivo'}
                            </p>

                            {puedeVerCliente && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirVisorEvidencia(evidenciaClienteUrl)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
                                title="Ver evidencia del cliente"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver Evidencia
                              </button>
                            )}
                          </div>

                          {p.referencia && p.referencia !== 'None' && (
                            <p className="mt-1 text-xs text-slate-500 tabular-nums">
                              Ref: {p.referencia}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                          {formatPEN(p.monto)}
                        </span>
                      </li>
                    );
                  })
                ) : (
                  <li className="py-4 text-center text-sm text-slate-500">
                    No hay pagos registrados.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
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