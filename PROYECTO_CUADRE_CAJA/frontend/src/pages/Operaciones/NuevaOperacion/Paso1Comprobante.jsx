import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, RefreshCw, Calculator, ChevronDown, X } from 'lucide-react';
import ocrService from '../../../services/ocr.service';
import api from '../../../lib/api';
import { SingleDatePicker } from '../../../components/ui/SingleDatePicker';

const formatPEN = (val) => {
  const num = Number(val || 0);
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const normalizarHoraOCR = (hora) => {
  const match = String(hora || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return hora || '';

  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  const segundos = Number(match[3] || 0);
  if (horas >= 8 || minutos > 59 || segundos > 59) return hora;

  return `${String(horas + 12).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
};

const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr instanceof Date) {
    return Number.isNaN(fechaStr.getTime()) ? null : fechaStr;
  }

  const texto = String(fechaStr).trim();
  const fechaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const fechaLatina = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!fechaISO && !fechaLatina) return null;

  const [anio, mes, dia] = fechaISO
    ? fechaISO.slice(1).map(Number)
    : [fechaLatina[3], fechaLatina[2], fechaLatina[1]].map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio
    || fecha.getMonth() !== mes - 1
    || fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
};

export function Paso1Comprobante({ datosIniciales, onDataChange, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [modo, setModo] = useState(datosIniciales?.evidencia ? 'ocr' : null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [verImagenCompleta, setVerImagenCompleta] = useState(false);
  const [itemsAbiertos, setItemsAbiertos] = useState(false);
  
  // NUEVO ESTADO PARA EL FALSO POSITIVO
  const [warningDuplicado, setWarningDuplicado] = useState(null);

  const urlRef = useRef(null);
  const blobRef = useRef(null);
  const horaEditadaManualmenteRef = useRef(Boolean(datosIniciales?.hora));
  const ocrAbortControllerRef = useRef(null);

  const [formData, setFormData] = useState(datosIniciales || {
    tipo_comprobante: '', serie: '', numero: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    monto: '', hora: '', vendedor: '', cliente: '',
    igv: '', op_gravada: '', efectivo: '', moneda: 'PEN',
    medio_pago: '', producto: '', items: [],
  });

  useEffect(() => {
    if (datosIniciales?.evidencia && !imagenPreview) {
      const blob = datosIniciales.evidencia;
      if (blob instanceof Blob) {
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        // The object URL is created after commit and state is required to render its preview.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setImagenPreview(url);
      }
    }
  }, [datosIniciales?.evidencia, imagenPreview]);

  const convertirFecha = (fecha) => {
    if (!fecha) return '';
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    const texto = String(fecha).trim();
    const fechaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (fechaISO) return `${fechaISO[1]}-${fechaISO[2]}-${fechaISO[3]}`;

    const fechaLatina = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fechaLatina) {
      return `${fechaLatina[3]}-${fechaLatina[2]}-${fechaLatina[1]}`;
    }

    return '';
  };

  const comprimirImagen = async (file) => {
    if (file.type === 'application/pdf') return file;
    if (!file.type.startsWith('image/')) return file;
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxWidth = 1600;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Error al comprimir')),
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Error al cargar imagen'));
        img.src = URL.createObjectURL(file);
      });
    } catch (err) {
      console.error('Error comprimiendo imagen:', err);
      return file;
    }
  };

  useEffect(() => {
    return () => {
      ocrAbortControllerRef.current?.abort();
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const handleChange = (field, value) => {
    let nuevo = { ...formData, [field]: value };
    if (field === 'monto' && modo === 'manual') {
      const montoNum = Number(value);
      if (Number.isFinite(montoNum) && montoNum > 0) {
        const igvCalculado = montoNum * (0.18 / 1.18);
        const opGravadaCalculada = montoNum - igvCalculado;
        nuevo.igv = igvCalculado.toFixed(2);
        nuevo.op_gravada = opGravadaCalculada.toFixed(2);
      } else {
        nuevo.igv = '';
        nuevo.op_gravada = '';
      }
    }
    setFormData(nuevo);
    onDataChange(nuevo);
  };

  const handleArchivoSelect = async (file) => {
    if (file instanceof Blob) {
      try {
        const archivoComprimido = await comprimirImagen(file);
        blobRef.current = archivoComprimido;
        urlRef.current = URL.createObjectURL(archivoComprimido);
        setImagenPreview(urlRef.current);
        setModo('ocr');
        onDataChange({
          ...formData,
          evidencia: archivoComprimido,
          previewUrl: urlRef.current,
        });
        procesarOCR(archivoComprimido);
      } catch (err) {
        console.error('Error procesando archivo:', err);
        setError('Error al procesar el archivo. Intenta nuevamente.');
      }
    }
  };

  const procesarOCR = async (archivo) => {
    const controller = new AbortController();
    ocrAbortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await ocrService.procesar(archivo, 'COMPROBANTE', {
        signal: controller.signal,
      });
      if (controller.signal.aborted || ocrAbortControllerRef.current !== controller) return;
      const ocrResult = response.data?.data || response.data;
      setOcrData(ocrResult);
      const datos = ocrResult?.datos_extraidos || {};

      let igvFinal = datos.igv;
      let opGravadaFinal = datos.op_gravada;

      if ((!igvFinal || Number(igvFinal) === 0) && datos.monto && opGravadaFinal) {
        igvFinal = Number(datos.monto) - Number(opGravadaFinal);
      }
      if ((!opGravadaFinal || Number(opGravadaFinal) === 0) && datos.monto && igvFinal) {
        opGravadaFinal = Number(datos.monto) - Number(igvFinal);
      }

      const nuevo = {
        ...formData,
        tipo_comprobante: datos.tipo_comprobante || '',
        serie: datos.serie || '',
        numero: datos.numero || '',
        fecha: convertirFecha(datos.fecha) || '',
        hora: horaEditadaManualmenteRef.current ? formData.hora : normalizarHoraOCR(datos.hora),
        vendedor: datos.vendedor || '',
        cliente: datos.cliente || '',
        producto: '',
        monto: datos.monto ? String(datos.monto) : '',
        igv: igvFinal ? Number(igvFinal).toFixed(2) : '',
        op_gravada: opGravadaFinal ? Number(opGravadaFinal).toFixed(2) : '',
        efectivo: datos.efectivo ? String(datos.efectivo) : '',
        moneda: datos.moneda || 'PEN',
        medio_pago: datos.medio_pago || '',
        items: datos.items || [],
        evidencia: archivo,
        previewUrl: urlRef.current,
      };

      setFormData(nuevo);
      onDataChange(nuevo);
    } catch (err) {
      if (
        controller.signal.aborted ||
        err?.name === 'CanceledError' ||
        err?.code === 'ERR_CANCELED'
      ) {
        return;
      }
      console.error('Error procesando OCR:', err);
      setError('No se pudo procesar la imagen con OCR. Por favor, completa los datos manualmente.');
    } finally {
      if (ocrAbortControllerRef.current === controller) {
        ocrAbortControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const cancelarOCR = () => {
    ocrAbortControllerRef.current?.abort();
    ocrAbortControllerRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    blobRef.current = null;
    setImagenPreview(null);
    setOcrData(null);
    setModo(null);
    setVerImagenCompleta(false);
    setItemsAbiertos(false);
    setWarningDuplicado(null);
    setError(null);
    setLoading(false);
    horaEditadaManualmenteRef.current = false;

    const datosVacios = {
      tipo_comprobante: '', serie: '', numero: '',
      fecha: new Date().toLocaleDateString('en-CA'),
      monto: '', hora: '', vendedor: '', cliente: '',
      igv: '', op_gravada: '', efectivo: '', moneda: 'PEN',
      medio_pago: '', producto: '', items: [],
      evidencia: null, previewUrl: null,
    };
    setFormData(datosVacios);
    onDataChange(datosVacios);
  };

  const handleManualMode = () => {
    setModo('manual');
    setImagenPreview(null);
    setOcrData(null);
    blobRef.current = null;
    const nuevo = { ...formData, evidencia: null, previewUrl: null };
    setFormData(nuevo);
    onDataChange(nuevo);
  };

  const validarFormulario = () => {
    const camposRequeridos = [
      ['Tipo de comprobante', formData.tipo_comprobante],
      ['Serie', formData.serie],
      ['Número', formData.numero],
      ['Fecha', formData.fecha],
      ['Monto', formData.monto],
    ];
    const camposFaltantes = camposRequeridos
      .filter(([, valor]) => !String(valor ?? '').trim())
      .map(([nombre]) => nombre);

    if (camposFaltantes.length > 0) {
      setError(`Completa los siguientes campos requeridos: ${camposFaltantes.join(', ')}.`);
      return false;
    }
    setError(null);
    return true;
  };

  // LÓGICA DE VALIDACIÓN PROACTIVA
  const handleNext = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    setWarningDuplicado(null);

    try {
      const res = await api.get('/comprobantes/check', {
        params: {
          tipo_comprobante: formData.tipo_comprobante,
          serie: formData.serie,
          numero: formData.numero
        }
      });

      if (res.data?.exists) {
        // ENCONTRAMOS UN POSIBLE DUPLICADO: Mostramos advertencia y DETENEMOS
        setWarningDuplicado(res.data.data);
        setLoading(false);
        return; 
      }

      // No existe, avanzamos normal
      onNext({ comprobante: formData });
    } catch (err) {
      // Si falla la verificación (ej. error de red), lo dejamos pasar por seguridad
      console.error('Error verificando comprobante:', err);
      onNext({ comprobante: formData });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val) => {
    if (!val || val === '') return '';
    const num = Number(val);
    return Number.isFinite(num) ? num.toFixed(2) : val;
  };

  // LOADING
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 sm:p-4 flex items-start justify-center">
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Comprobante"
              className="max-w-full h-auto rounded-lg border border-slate-200 max-h-[200px] sm:max-h-[60vh] lg:max-h-[80vh] object-contain"
            />
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-12 sm:py-20">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-2 text-sm sm:text-base">
            {ocrAbortControllerRef.current ? 'Leyendo comprobante...' : 'Verificando datos...'}
          </p>
          {ocrAbortControllerRef.current && (
            <button
              type="button"
              onClick={cancelarOCR}
              className="mt-3 inline-flex max-w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/70 dark:focus:ring-rose-800 whitespace-normal break-words"
            >
              <X className="h-4 w-4 shrink-0" />
              Cancelar procesamiento
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="paso1-comprobante grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 dark:bg-slate-900">
      <style>{`
        html.dark .paso1-comprobante input:-webkit-autofill,
        html.dark .paso1-comprobante input:-webkit-autofill:hover,
        html.dark .paso1-comprobante input:-webkit-autofill:focus,
        html.dark .paso1-comprobante input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #0f172a inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
        }
      `}</style>
      {/* Columna izquierda: imagen o selector */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        {modo === null ? (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 sm:mb-4">
              ¿Cómo deseas registrar el comprobante?
            </h3>

            <button
              type="button"
              onClick={() => document.getElementById('archivo-input').click()}
              className="w-full p-3 sm:p-6 bg-white dark:bg-slate-800/60 border-2 border-gray-200 dark:border-slate-600 hover:border-brand-orange rounded-xl transition-all hover:shadow-md dark:hover:shadow-none text-left group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center group-hover:bg-brand-orange transition-colors flex-shrink-0">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Subir foto del comprobante</h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">El OCR extraerá los datos automáticamente</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleManualMode}
              className="w-full p-3 sm:p-6 bg-white dark:bg-slate-800/60 border-2 border-gray-200 dark:border-slate-600 hover:border-brand-orange rounded-xl transition-all hover:shadow-md dark:hover:shadow-none text-left group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center group-hover:bg-brand-orange transition-colors flex-shrink-0">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Registro manual</h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Ingresar los datos manualmente</p>
                </div>
              </div>
            </button>

            <input
              id="archivo-input"
              type="file"
              accept="image/*,application/pdf"
              className="hidden bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleArchivoSelect(file);
              }}
            />
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 sm:p-4">
            {imagenPreview && (
              <>
                <div className="relative">
                  <img
                    src={imagenPreview}
                    alt="Comprobante"
                    className={`w-full h-auto rounded-lg border border-slate-200 object-contain transition-all ${verImagenCompleta ? 'max-h-[80vh]' : 'max-h-[200px] sm:max-h-[60vh]'}`}
                  />
                  {!verImagenCompleta && (
                    <button
                      type="button"
                      onClick={() => setVerImagenCompleta(true)}
                      className="absolute bottom-2 right-2 bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm"
                    >
                      Ver completa
                    </button>
                  )}
                  {verImagenCompleta && (
                    <button
                      type="button"
                      onClick={() => setVerImagenCompleta(false)}
                      className="absolute top-2 right-2 bg-slate-900/85 hover:bg-slate-900 text-white p-1.5 rounded-full shadow-lg"
                      aria-label="Cerrar vista completa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setModo(null);
                setImagenPreview(null);
                setOcrData(null);
                setVerImagenCompleta(false);
                const nuevo = {
                  tipo_comprobante: '', serie: '', numero: '',
                  fecha: new Date().toLocaleDateString('en-CA'),
                  monto: '', hora: '', vendedor: '', cliente: '',
                  igv: '', op_gravada: '', efectivo: '', moneda: 'PEN',
                  medio_pago: '', producto: '', items: [],
                  evidencia: null, previewUrl: null,
                };
                horaEditadaManualmenteRef.current = false;
                setFormData(nuevo);
                onDataChange(nuevo);
              }}
              className="mt-3 w-full px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition"
            >
              Cambiar modo
            </button>
          </div>
        )}
      </div>

      {/* Columna derecha: formulario */}
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-2 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 sm:mb-2">
            Paso 1: Comprobante
          </h2>
          <p className="text-xs sm:text-base text-slate-500 dark:text-slate-400 px-2">
            Registra los datos del comprobante (define el monto total a pagar)
          </p>
        </div>

        {/* NUEVO BANNER DE ADVERTENCIA (FALSO POSITIVO) */}
        {warningDuplicado && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl p-4 sm:p-5 shadow-sm dark:shadow-none animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm sm:text-base">Posible comprobante duplicado</h4>
                <p className="text-amber-800 dark:text-amber-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  El comprobante <strong>{formData.tipo_comprobante} {formData.serie}-{formData.numero}</strong> ya figura en el sistema (Monto: {formatPEN(warningDuplicado.monto)}).
                  Si estás seguro de que es una operación distinta, puedes continuar.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setWarningDuplicado(null)}
                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                  >
                    Cancelar y revisar
                  </button>
                  <button
                    type="button"
                    onClick={() => onNext({ comprobante: formData })}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition shadow-sm"
                  >
                    Continuar de todas formas
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-300 font-medium text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {ocrData && (
          <div className="flex gap-2 flex-wrap mb-2 sm:mb-4">
            {ocrData.requiere_revision && (
              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 text-[10px] sm:text-xs font-semibold">
                <AlertCircle className="w-3 h-3" /> Requiere revisión
              </span>
            )}
            {ocrData.requiere_confirmacion && (
              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] sm:text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Requiere confirmación
              </span>
            )}
          </div>
        )}

        {/* ITEMS OCR */}
        {formData.items && formData.items.length > 0 && (
          <div className="bg-white dark:bg-slate-800/60 rounded-xl p-3 sm:p-6 shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setItemsAbiertos(!itemsAbiertos)}
              className="w-full flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide hover:text-slate-900 dark:hover:text-slate-100 transition"
            >
              <span>Detalle detectado por el OCR ({formData.items.length})</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${itemsAbiertos ? 'rotate-180' : ''}`} />
            </button>

            {itemsAbiertos && (
              <div className="mt-3">
                <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/60">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                        {item.descripcion}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {Number(item.cantidad).toFixed(2)} × {formatPEN(item.precio_unitario)}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatPEN(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block">
                  <div className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">CANT.</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">DESCRIPCIÓN</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">P.UNIT</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-400">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-slate-600 last:border-0">
                            <td className="py-2 px-3 text-slate-900 dark:text-slate-100 whitespace-nowrap">{Number(item.cantidad).toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-900 dark:text-slate-100 break-words whitespace-normal">{item.descripcion}</td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatPEN(item.precio_unitario)}</td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatPEN(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 bg-slate-50 dark:bg-slate-900/70 rounded-lg p-3 border border-slate-100 dark:border-slate-600">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">Op. Gravada:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">{formatPEN(formData.op_gravada)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">IGV:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">{formatPEN(formData.igv)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base">Total:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-black text-base sm:text-lg tabular-nums">{formatPEN(formData.monto)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {(!Array.isArray(formData.items) || formData.items.length === 0) && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 p-3 sm:p-4 shadow-sm dark:shadow-none">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-xs sm:text-sm leading-relaxed text-blue-900 dark:text-blue-200">
              No se extrajeron productos del comprobante. Por favor, verifica el monto total directamente en el documento físico.
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800/60 rounded-xl p-3 sm:p-6 shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-600 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Tipo de comprobante *
              </label>
              <select
                name="tipo_comprobante"
                value={formData.tipo_comprobante}
                onChange={(e) => handleChange('tipo_comprobante', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="">Seleccionar...</option>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Serie *
              </label>
              <input
                type="text"
                name="serie"
                autoComplete="off"
                value={formData.serie}
                onChange={(e) => handleChange('serie', e.target.value)}
                placeholder="Ej: BE02"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Número *
              </label>
              <input
                type="text"
                name="numero"
                autoComplete="off"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Ej: 00024034"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Fecha *
              </label>
              <SingleDatePicker
                value={parseFecha(formData.fecha)}
                onChange={(nuevaFecha) => handleChange('fecha', nuevaFecha)}
                placeholder="Seleccionar fecha"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Monto (S/) *
              </label>
              <input
                type="number"
                name="monto"
                value={formData.monto}
                onChange={(e) => handleChange('monto', e.target.value)}
                onBlur={() => handleChange('monto', formatNumber(formData.monto))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Hora
              </label>
              <input
                type="time"
                name="hora"
                step="1"
                lang="es-ES"
                value={formData.hora}
                onChange={(e) => {
                  horaEditadaManualmenteRef.current = true;
                  handleChange('hora', e.target.value);
                }}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Cliente
              </label>
              <input
                type="text"
                name="cliente"
                autoComplete="off"
                value={formData.cliente || ''}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Vendedor
              </label>
              <input
                type="text"
                name="vendedor"
                autoComplete="off"
                value={formData.vendedor}
                onChange={(e) => handleChange('vendedor', e.target.value)}
                placeholder="Nombre del vendedor"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5 flex items-center gap-1.5 flex-wrap">
                IGV
                {modo === 'manual' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                    <Calculator className="w-3 h-3" />
                    Auto
                  </span>
                )}
              </label>
              <input
                type="number"
                name="igv"
                value={formData.igv}
                onChange={(e) => handleChange('igv', e.target.value)}
                onBlur={() => handleChange('igv', formatNumber(formData.igv))}
                placeholder="0.00"
                step="0.01"
                min="0"
                readOnly={modo === 'manual'}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition ${modo === 'manual' ? 'bg-white dark:bg-slate-900 cursor-not-allowed' : ''}`}
              />
              {modo === 'manual' && (
                <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  Calculado automáticamente (18% incluido)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Moneda
              </label>
              <select
                name="moneda"
                value={formData.moneda}
                onChange={(e) => handleChange('moneda', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="PEN">PEN - Soles</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                Producto / Detalle
              </label>
              <input
                type="text"
                name="producto"
                autoComplete="off"
                value={formData.producto}
                onChange={(e) => handleChange('producto', e.target.value)}
                placeholder="Descripción del producto o servicio"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 rounded-xl font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold text-sm transition shadow-md dark:shadow-none disabled:opacity-50"
          >
            Continuar con los pagos
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}