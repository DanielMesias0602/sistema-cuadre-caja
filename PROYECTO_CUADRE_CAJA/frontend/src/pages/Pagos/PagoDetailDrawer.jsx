import { useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
  User,
  Calendar,
  ShieldCheck,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  XCircle,
  AlertTriangle,
  Pencil,
  Save,
  Loader2,
  Upload,
  FileText
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export function PagoDetailDrawer({ selectedPago, onClose, onUpdateSuccess }) {
  const { user } = useAuth();
  const open = selectedPago !== null;
  const [lastPago, setLastPago] = useState(selectedPago);
  const [previousSelectedPago, setPreviousSelectedPago] = useState(selectedPago);
  if (selectedPago && selectedPago !== lastPago) setLastPago(selectedPago);
  const pago = selectedPago || lastPago;
  const closeRef = useRef(null);
  const fileInputRef = useRef(null);

  const [estadoLocal, setEstadoLocal] = useState(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  // ESTADOS PARA EDICIÓN
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ id_medio_pago: '', monto: '', referencia_bancaria: '', observacion: '' });
  const [mediosPago, setMediosPago] = useState([]);
  const [loadingSave, setLoadingSave] = useState(false);
  const [errorSave, setErrorSave] = useState(null);

  // ESTADOS PARA VERIFICACIÓN
  const [modalVerificarAbierto, setModalVerificarAbierto] = useState(false);
  const [archivoEmpresa, setArchivoEmpresa] = useState(null);
  const [previewEmpresa, setPreviewEmpresa] = useState(null);
  const [loadingVerificar, setLoadingVerificar] = useState(false);
  const [errorVerificar, setErrorVerificar] = useState(null);

  const esAdmin = user?.id_rol === 1 || user?.rol?.toUpperCase() === 'ADMINISTRADOR';

  // Helper para saber si un pago es en efectivo
  const esEfectivo = (pagoObj) => {
    const medio = String(pagoObj?.medio_pago || pagoObj?.nombre_medio || '').toLowerCase();
    return medio.includes('efectivo');
  };

  if (selectedPago !== previousSelectedPago) {
    setPreviousSelectedPago(selectedPago);
    if (selectedPago) {
      setEstadoLocal(selectedPago.estado || 'PENDIENTE');
    } else {
      setIsImageOpen(false);
      setZoom(false);
      setEstadoLocal(null);
      setIsEditing(false);
      setErrorSave(null);
      setModalVerificarAbierto(false);
      setArchivoEmpresa(null);
      setPreviewEmpresa(null);
      setErrorVerificar(null);
    }
  }

  // Maneja el backdrop y el foco mientras el drawer está abierto.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Maneja la tecla ESC.
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isImageOpen) {
          setIsImageOpen(false);
          setZoom(false);
        } else if (isEditing) {
          setIsEditing(false);
        } else if (modalVerificarAbierto) {
          setModalVerificarAbierto(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isImageOpen, isEditing, modalVerificarAbierto, onClose]);

  // Cargar medios de pago cuando se activa la edición
  useEffect(() => {
    if (isEditing && mediosPago.length === 0) {
      api.get('/medios-pago').then(res => {
        const data = res.data?.data || res.data;
        setMediosPago(Array.isArray(data) ? data : []);
      }).catch(err => console.error('Error cargando medios', err));
    }
  }, [isEditing, mediosPago.length]);

  if (!pago) return null;

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const estadoActual = estadoLocal || pago.estado || 'PENDIENTE';
  const isVerificado =
    String(estadoActual).toUpperCase() === 'VERIFICADO' ||
    String(estadoActual).toUpperCase() === 'VERIFICADA' ||
    String(estadoActual).toUpperCase() === 'COMPLETADO';

  const esOperacionAnulada = pago.esAnulada || String(pago.estado_operacion || '').toUpperCase() === 'ANULADA';

  const urlEvidencia = pago.evidencia_url;

  // Verifica si el pago actual es efectivo
  const esPagoEfectivo = esEfectivo(pago);
  
  // Determinar si el medio seleccionado actualmente en el formulario es efectivo
  // Busca en la lista de medios. Si no encuentra o la lista no ha cargado,
  // usa el nombre del medio original del pago como respaldo.
  const esEdicionEfectivo = (() => {
    if (mediosPago.length > 0 && editForm.id_medio_pago) {
      const medio = mediosPago.find(m => String(m.id_medio_pago) === String(editForm.id_medio_pago));
      if (medio) return String(medio.nombre || '').toLowerCase().includes('efectivo');
    }
    return String(pago.medio_pago || '').toLowerCase().includes('efectivo');
  })();

  const renderMedioIcon = (medio) => {
    const m = (medio || '').toLowerCase();
    if (m.includes('efectivo')) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-600/10">
          <Banknote className="h-4 w-4" />
        </span>
      );
    }
    if (m.includes('tarjeta') || m.includes('pos')) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600/10">
          <CreditCard className="h-4 w-4" />
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 ring-1 ring-violet-600/10">
        <Wallet className="h-4 w-4" />
      </span>
    );
  };

  const abrirVisor = () => {
    setIsImageOpen(true);
    setZoom(false);
  };

  // MANEJADORES DE EDICIÓN
  const handleEditClick = () => {
    setEditForm({
      id_medio_pago: pago.id_medio_pago || '',
      monto: pago.monto || '',
      referencia_bancaria: pago.referencia || '',
      observacion: pago.observacion || ''
    });
    setIsEditing(true);
    setErrorSave(null);
  };

  const handleSave = async () => {
    try {
      setLoadingSave(true);
      setErrorSave(null);

      const payload = {
        id_medio_pago: Number(editForm.id_medio_pago),
        monto: Number(editForm.monto),
        referencia_bancaria: esEdicionEfectivo ? null : (editForm.referencia_bancaria || null),
        observacion: editForm.observacion || null
      };

      await api.put(`/pagos/${pago.id_pago}`, payload);

      setIsEditing(false);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      console.error('Error al guardar pago:', err);
      setErrorSave(err.response?.data?.message || err.message || 'Error al guardar los cambios.');
    } finally {
      setLoadingSave(false);
    }
  };

  // MANEJADORES DE VERIFICACIÓN
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoEmpresa(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewEmpresa(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVerificar = async () => {
    setLoadingVerificar(true);
    setErrorVerificar(null);

    try {
      if (archivoEmpresa) {
        const formData = new FormData();
        formData.append('archivo', archivoEmpresa);
        formData.append('id_operacion', String(pago.id_operacion));
        formData.append('tipo_evidencia', 'EMPRESA');
        formData.append('fecha_evidencia', new Date().toLocaleDateString('en-CA'));
        await api.post('/evidencias', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      await api.put(`/pagos/${pago.id_pago}`, {
        id_medio_pago: pago.id_medio_pago,
        monto: Number(pago.monto),
        referencia_bancaria: pago.referencia || null,
        observacion: pago.observacion || null,
        estado: 'VERIFICADO'
      });

      setModalVerificarAbierto(false);
      setArchivoEmpresa(null);
      setPreviewEmpresa(null);
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      console.error('Error al verificar pago:', err);
      setErrorVerificar(err.response?.data?.message || err.message || 'Error al verificar el pago.');
    } finally {
      setLoadingVerificar(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Fondo oscuro */}
      <div
        onClick={!isEditing && !modalVerificarAbierto ? onClose : undefined}
        className={`absolute inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'} ${isEditing || modalVerificarAbierto ? 'cursor-default' : 'cursor-pointer'}`}
      />

      {/* VISOR DE EVIDENCIA EN SPLIT-SCREEN */}
      {isImageOpen && urlEvidencia && (
        <div
          className="fixed inset-y-0 left-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 border-r border-slate-700 p-3 sm:p-6 backdrop-blur-md select-none w-full lg:right-[500px] lg:w-auto animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setIsImageOpen(false);
              setZoom(false);
            }}
            className="absolute top-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-slate-700 active:scale-95 cursor-pointer"
            title="Cerrar visor de evidencia"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(!zoom)}
            className="absolute top-4 left-4 z-40 flex items-center gap-2 rounded-full bg-slate-800/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:bg-slate-700 cursor-pointer"
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

          <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
            <img
              src={urlEvidencia}
              alt="Evidencia del Pago"
              onClick={() => setZoom(!zoom)}
              className={`max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out ${zoom ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
            />
          </div>
        </div>
      )}

      {/* PANEL LATERAL DE DETALLES DEL PAGO */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 right-0 z-30 flex w-full max-w-[500px] flex-col bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl dark:shadow-none shadow-slate-900/20 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="border-b border-slate-100 dark:border-slate-700 px-6 pb-6 pt-5 sm:px-8 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {esOperacionAnulada ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-600/20">
                  <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  OPERACIÓN ANULADA
                </span>
              ) : isVerificado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  PAGO VERIFICADO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-600/20">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  PENDIENTE DE VERIFICACIÓN
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!esOperacionAnulada && !isEditing && (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm dark:shadow-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-brand-orange"
                  title="Editar este pago"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Editar</span>
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-slate-500 dark:text-slate-400 shadow-sm dark:shadow-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-rose-600"
                title="Cerrar panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isEditing ? 'Editar Pago' : 'Detalle de Pago Individual'}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {pago.fecha} {pago.hora ? `· ${pago.hora.substring(0, 5)}` : ''}
            </span>
          </p>

          {!isEditing ? (
            <>
              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monto de este Pago
              </p>
              <p className={`mt-1 text-4xl font-black tracking-tight tabular-nums ${esOperacionAnulada ? 'text-slate-400 line-through' : 'text-brand-orange'}`}>
                {formatCurrency(pago.monto)}
              </p>
            </>
          ) : (
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nuevo Monto (S/)</label>
              <input
                type="number"
                step="0.01"
                value={editForm.monto}
                onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                className="w-full px-4 py-3 text-2xl font-black text-brand-orange bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none transition"
              />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-900/70 px-6 py-6 sm:px-8">
          {errorSave && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{errorSave}</p>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-5 shadow-sm dark:shadow-none">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Receipt className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                Datos de Cobro
              </h3>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-1/3">Medio de Pago</span>
                  {isEditing ? (
                    <select
                      value={editForm.id_medio_pago}
                      onChange={(e) => setEditForm({ ...editForm, id_medio_pago: e.target.value })}
                      className="w-2/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-orange outline-none cursor-pointer"
                    >
                      <option value="">Seleccione medio</option>
                      {mediosPago.map(m => (
                        <option key={m.id_medio_pago} value={m.id_medio_pago}>{m.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {renderMedioIcon(pago.medio_pago)}
                      <span className={`text-sm font-bold ${esOperacionAnulada ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>{pago.medio_pago}</span>
                    </div>
                  )}
                </div>

                {/* OCULTAR REFERENCIA SI ES EFECTIVO */}
                {((isEditing && !esEdicionEfectivo) || (!isEditing && !esPagoEfectivo)) && (
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-1/3">Nro. Referencia</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.referencia_bancaria}
                        onChange={(e) => setEditForm({ ...editForm, referencia_bancaria: e.target.value })}
                        placeholder="Opcional"
                        className="w-2/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
                      />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {pago.referencia || 'Sin referencia bancaria'}
                      </span>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="flex flex-col border-b border-slate-100 dark:border-slate-700 pb-3 gap-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Observación (Opcional)</span>
                    <textarea
                      value={editForm.observacion}
                      onChange={(e) => setEditForm({ ...editForm, observacion: e.target.value })}
                      placeholder="Agregar una nota sobre este pago..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none resize-none h-20"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Comprobante Vinculado</span>
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${esOperacionAnulada ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 line-through' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                    {pago.comprobante}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Cliente</span>
                  <span className={`max-w-[230px] truncate text-right text-xs font-semibold ${esOperacionAnulada ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {pago.cliente}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Usuario Registrador</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                    <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    {pago.usuario}
                  </span>
                </div>
              </div>
            </section>

            {!isEditing && (
              <>
                {esPagoEfectivo ? (
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/70 p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-600/10">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Pago en Efectivo
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          La verificación se realiza físicamente en el arqueo de caja. No requiere comprobante digital.
                        </p>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-5 shadow-sm dark:shadow-none">
                    <h3 className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        Evidencia Adjunta
                      </span>
                    </h3>

                    {urlEvidencia ? (
                      <div className="space-y-3">
                        <div
                          onClick={abrirVisor}
                          className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-2xs dark:shadow-none"
                        >
                          <img
                            src={urlEvidencia}
                            alt="Evidencia del Pago"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/35">
                            <span className="flex items-center gap-1.5 rounded-lg bg-white/95 dark:bg-slate-800/95 px-3 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 shadow-md dark:shadow-none opacity-0 transition-opacity group-hover:opacity-100">
                              <ZoomIn className="h-3.5 w-3.5 text-brand-orange" />
                              Comparar en Pantalla Dividida
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 py-8 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Sin Evidencia Adjunta</p>
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-5 shadow-sm dark:shadow-none">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Estado de Conciliación
                  </h3>
                  {esOperacionAnulada ? (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 mt-2">
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Operación Anulada
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                        Este pago pertenece a un comprobante que fue anulado. El dinero no afecta al cierre de caja actual.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isVerificado
                        ? 'Este pago ha sido verificado y conciliado con el arqueo o extracto correspondiente.'
                        : 'Este pago se encuentra registrado pero requiere validación contra el estado de cuenta bancario o arqueo de caja físico.'}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 sm:px-8 shrink-0">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={loadingSave}
                className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loadingSave || !editForm.id_medio_pago || !editForm.monto}
                className="flex-1 h-11 rounded-xl bg-brand-orange text-white text-xs font-bold transition hover:bg-brand-orange-hover disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md dark:shadow-none"
              >
                {loadingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Cambios
              </button>
            </div>
          ) : (
            <>
              {esAdmin && !isVerificado && !esOperacionAnulada && (
                <button
                  type="button"
                  onClick={() => setModalVerificarAbierto(true)}
                  className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md dark:shadow-none cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verificar Pago
                </button>
              )}
              
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
              >
                Cerrar
              </button>
            </>
          )}
        </footer>
      </aside>

      {/* MODAL DE VERIFICACIÓN */}
      {modalVerificarAbierto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-lg">Verificar Pago</h3>
                  <p className="text-emerald-50 text-xs font-medium">Confirma que el dinero llegó a la empresa</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {errorVerificar && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-300">
                  {errorVerificar}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pago a verificar:</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">{pago.comprobante} - {formatCurrency(pago.monto)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Medio: {pago.medio_pago}</p>
              </div>

              {!esPagoEfectivo && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subir Evidencia de la Empresa (Opcional)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {previewEmpresa ? (
                      <img src={previewEmpresa} alt="Preview" className="max-h-24 object-contain" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-1" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Haz clic para subir voucher</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalVerificarAbierto(false); setArchivoEmpresa(null); setPreviewEmpresa(null); setErrorVerificar(null); }}
                  disabled={loadingVerificar}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition text-sm disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleVerificar}
                  disabled={loadingVerificar}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loadingVerificar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PagoDetailDrawer;