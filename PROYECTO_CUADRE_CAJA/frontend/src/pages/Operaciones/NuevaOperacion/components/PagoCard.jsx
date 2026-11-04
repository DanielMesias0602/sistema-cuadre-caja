import { useState } from 'react';
import {
  Trash2, UploadCloud, X, Loader2, CheckCircle,
  Info, Banknote, Calendar, Hash, User, Building2, CreditCard, Check, AlertCircle,
  Clock, FileText, RefreshCw, AlertTriangle,
} from 'lucide-react';
import ocrService from '../../../../services/ocr.service';

const ICONOS = {
  banknote: Banknote,
  calendar: Calendar,
  hash: Hash,
  user: User,
  building: Building2,
  creditCard: CreditCard,
  clock: Clock,
  file: FileText,
};

const COLORES = {
  emerald: 'text-emerald-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  indigo: 'text-indigo-500',
  orange: 'text-orange-500',
  teal: 'text-teal-500',
  slate: 'text-slate-500 dark:text-slate-500',
  rose: 'text-rose-500',
};

const getCamposOCR = (datosOCR, medioPago, montoActual, referenciaActual, fechaActual) => {
  const datos = datosOCR || {};
  const medio = String(medioPago || '').toLowerCase();
  const campos = [];

  const monto = montoActual !== '' && montoActual != null
    ? montoActual
    : datos.monto ?? '';
  campos.push({
    icon: 'banknote',
    label: 'Monto',
    value: monto == null ? '' : String(monto),
    color: 'emerald',
    editable: true,
    field: 'monto'
  });
  campos.push({
    icon: 'calendar',
    label: 'Fecha',
    value: fechaActual || datos.fecha_operacion || '',
    color: 'blue',
    editable: true,
    field: 'fecha_operacion'
  });
  if (datos.hora_operacion) {
    campos.push({ icon: 'clock', label: 'Hora', value: datos.hora_operacion, color: 'teal' });
  }

  if (medio.includes('tarjeta') || datos.aplicacion_banco === 'CULQI') {
    campos.push({
      icon: 'hash',
      label: 'Venta ID',
      value: referenciaActual || datos.referencia_bancaria || '',
      color: 'purple',
      editable: true,
      field: 'referencia'
    });
  } else {
    if (datos.aplicacion_banco || datos.banco) {
      campos.push({ icon: 'building', label: 'Banco', value: datos.aplicacion_banco || datos.banco, color: 'indigo' });
    }
    if (datos.cuenta_destino) {
      campos.push({ icon: 'creditCard', label: 'Cuenta destino', value: datos.cuenta_destino, color: 'slate' });
    }
    if (datos.destinatario) {
      campos.push({ icon: 'user', label: 'Beneficiario', value: datos.destinatario, color: 'orange' });
    }
    campos.push({
      icon: 'hash',
      label: 'Referencia',
      value: referenciaActual || datos.referencia_bancaria || '',
      color: 'purple',
      editable: true,
      field: 'referencia'
    });
  }

  return campos;
};

function CampoOCR({ icon, label, value, color, variant = 'default', editable = false, onValueChange, disabled = false }) {
  const Icon = ICONOS[icon] || Info;
  const colorClass = COLORES[color] || 'text-slate-500 dark:text-slate-500';

  const containerClass =
    variant === 'onGreen'
      ? 'bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-100 dark:border-slate-700 shadow-sm dark:shadow-none min-w-0'
      : 'bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-none min-w-0';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{label}</p>
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          <span className="font-bold text-slate-700 dark:text-slate-300">S/</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
            placeholder="0.00"
            disabled={disabled}
            aria-label="Monto del pago"
            className="w-full min-w-0 bg-transparent font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      ) : (
        <p className="font-bold text-slate-900 dark:text-slate-100 break-words">{value}</p>
      )}
    </div>
  );
}

function ModalConfirmarCambio({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
      <div className="my-auto max-h-[90vh] max-h-[90dvh] w-[95%] max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800 dark:shadow-none">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-lg">¿Cambiar la imagen?</h3>
              <p className="text-amber-50 text-xs font-medium">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Se eliminará la imagen actual y se perderá la información asociada.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 p-4 pt-0 sm:flex-row sm:gap-3 sm:p-5 sm:pt-0">
          <button type="button" onClick={onCancel} className="min-h-11 flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 dark:shadow-none">
            <RefreshCw className="w-4 h-4" />
            Cambiar imagen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PagoCard({ index, pago, medios, onPagoChange, onEliminar, puedeEliminar }) {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [preview, setPreview] = useState(pago.evidencia?.imagenBase64 || null);
  const [error, setError] = useState(null);
  const [mostrarModalCambio, setMostrarModalCambio] = useState(false);

  // LÓGICA DE RENDERIZADO DINÁMICO CORREGIDA
  const hayMedio = Boolean(pago.id_medio_pago); // <-- NUEVA VALIDACIÓN
  const medioLower = String(pago.nombre_medio || '').toLowerCase();
  
  const esEfectivo = pago.es_efectivo || medioLower.includes('efectivo');
  const esTarjeta = medioLower.includes('tarjeta') || medioLower.includes('pos');
  const esTransferencia = medioLower.includes('transferencia') || medioLower.includes('deposito') || medioLower.includes('depósito');
  const esTransferenciaBCP = esTransferencia && medioLower.includes('bcp');

  const mostrarRef = true;
  const mostrarFecha = true;
  const mostrarBeneficiario = hayMedio && !esEfectivo && !esTarjeta;
  const mostrarCuentaDestino = hayMedio && esTransferenciaBCP;

  const handleChange = (field, value) => {
    onPagoChange({ ...pago, [field]: value });
  };

  const handleMedioChange = (e) => {
    const idMedio = Number(e.target.value);
    const medioSeleccionado = medios.find(m => m.id_medio_pago === idMedio);
    onPagoChange({
      ...pago,
      id_medio_pago: idMedio,
      nombre_medio: medioSeleccionado ? medioSeleccionado.nombre : '',
      es_efectivo: medioSeleccionado ? medioSeleccionado.es_efectivo : false,
      monto: '',
      referencia: '',
      fecha_operacion: '',
      evidencia: null
    });
    setPreview(null);
    setError(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    onPagoChange({
      ...pago,
      monto: '',
      referencia: '',
      fecha_operacion: '',
      evidencia: null
    });
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setLoadingOCR(true);
    setError(null);

    try {
      const response = await ocrService.procesar(file, 'TRANSFERENCIA');
      const rawData = response.data?.data || response.data;
      const datosExtraidos = rawData?.datos_extraidos || rawData;

      onPagoChange({
        ...pago,
        monto: '',
        referencia: '',
        fecha_operacion: '',
        evidencia: {
          ...pago.evidencia,
          imagenBase64: reader.result,
          datosOCR: datosExtraidos,
          confirmada: false,
          origen: 'CLIENTE',
          tipo: 'CLIENTE'
        }
      });
    } catch (err) {
      console.error('Error OCR:', err);
      setError('No se pudo leer la imagen. Intenta de nuevo.');
    } finally {
      setLoadingOCR(false);
    }
  };

  const confirmarEvidencia = () => {
    const datos = pago.evidencia?.datosOCR || {};

    const montoDetectado = datos.monto;
    const referenciaDetectada = datos.referencia_bancaria || datos.numero_operacion;
    const fechaDetectada = datos.fecha_operacion || '';
    const beneficiarioDetectado = datos.destinatario || '';
    const cuentaDestinoDetectada = datos.cuenta_destino || '';
    const montoActual = pago.monto !== '' && pago.monto != null
      ? pago.monto
      : (montoDetectado ?? '');

    onPagoChange({
      ...pago,
      evidencia: { ...pago.evidencia, confirmada: true },
      monto: montoActual,
      referencia: pago.referencia || referenciaDetectada || '',
      fecha_operacion: pago.fecha_operacion || fechaDetectada || '',
      beneficiario: pago.beneficiario || beneficiarioDetectado,
      cuenta_destino: pago.cuenta_destino || cuentaDestinoDetectada,
      observacion: pago.observacion || ''
    });
  };

  const descartarEvidencia = () => {
    onPagoChange({
      ...pago,
      monto: '',
      referencia: '',
      fecha_operacion: '',
      evidencia: null
    });
    setPreview(null);
    setError(null);
  };

  const solicitarCambioImagen = () => setMostrarModalCambio(true);
  const cancelarCambioImagen = () => setMostrarModalCambio(false);
  const confirmarCambioImagen = () => {
    setMostrarModalCambio(false);
    descartarEvidencia();
  };

  const camposOCR = pago.evidencia?.imagenBase64
    ? getCamposOCR(
      pago.evidencia.datosOCR,
      pago.nombre_medio || pago.medio_pago,
      pago.monto,
      pago.referencia,
      pago.fecha_operacion
    )
      .map((campo) => campo.editable
        ? {
          ...campo,
          onValueChange: (value) => handleChange(campo.field, value),
          disabled: loadingOCR
        }
        : campo)
    : [];

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-600 p-4 sm:p-6 shadow-sm dark:shadow-none mb-4">
      {/* Cabecera del Pago */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Pago #{index + 1}</h3>
        {puedeEliminar && (
          <button onClick={onEliminar} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" title="Eliminar este pago">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* AVISO PREMIUM PARA TARJETA */}
      {esTarjeta && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Pago con Tarjeta (Culqi)</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              Sube la captura del voucher. El sistema intentará leer el <strong>Monto, Venta ID, Fecha y Hora</strong>.
              Recuerda que el banco depositará un monto menor por la comisión de Culqi (3-5%).
            </p>
          </div>
        </div>
      )}

      {/* Formulario del Pago */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Medio de pago *</label>
          <select
            value={pago.id_medio_pago || ''}
            onChange={handleMedioChange}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
          >
            <option value="">Seleccione un medio</option>
            {medios.map(m => (
              <option key={m.id_medio_pago} value={m.id_medio_pago}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monto (S/) *</label>
          <input
            type="number"
            value={pago.monto}
            onChange={(e) => handleChange('monto', e.target.value)}
            placeholder="0.00"
            step="0.01"
            disabled={loadingOCR}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
          />
        </div>

        {/* CAMPOS DINÁMICOS */}
        {mostrarRef && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              {esTarjeta ? 'Venta ID' : 'Referencia bancaria'}
            </label>
            <input
              type="text"
              value={pago.referencia || ''}
              onChange={(e) => handleChange('referencia', e.target.value)}
              placeholder="Opcional"
              disabled={loadingOCR}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        )}

        {mostrarFecha && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Fecha de Operación</label>
            <input
              type="text"
              value={pago.fecha_operacion || ''}
              onChange={(e) => handleChange('fecha_operacion', e.target.value)}
              placeholder="DD/MM/AAAA"
              disabled={loadingOCR}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        )}

        {mostrarBeneficiario && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Beneficiario</label>
            <input
              type="text"
              value={pago.beneficiario || ''}
              onChange={(e) => handleChange('beneficiario', e.target.value)}
              placeholder="Nombre de la empresa/persona"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        )}

        {mostrarCuentaDestino && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cuenta Destino</label>
            <input
              type="text"
              value={pago.cuenta_destino || ''}
              onChange={(e) => handleChange('cuenta_destino', e.target.value)}
              placeholder="**** 5010"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observación</label>
          <input
            type="text"
            value={pago.observacion || ''}
            onChange={(e) => handleChange('observacion', e.target.value)}
            placeholder="Opcional"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
          />
        </div>
      </div>

      {/* SECCIÓN DE EVIDENCIA */}
      {hayMedio && !esEfectivo && (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg p-3 flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 dark:text-red-400" /> {error}
            </div>
          )}

          {!pago.evidencia?.imagenBase64 && (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loadingOCR}
              />
              {loadingOCR ? (
                <>
                  <Loader2 className="w-8 h-8 text-brand-orange animate-spin mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Procesando OCR...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium text-center">
                    {esTarjeta ? 'Haz clic para subir la foto del voucher (Culqi/POS)' : 'Haz clic para subir la evidencia del cliente'}
                  </p>
                </>
              )}
            </div>
          )}

          {pago.evidencia?.imagenBase64 && !pago.evidencia.confirmada && (
            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex gap-4 items-start">
                {preview && (
                  <img src={preview} alt="Evidencia" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Evidencia cargada</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Revisa los datos extraídos antes de confirmar.</p>
                    </div>
                    <button onClick={descartarEvidencia} className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={confirmarEvidencia} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                      <Check className="w-3 h-3" /> Confirmar
                    </button>
                    <button onClick={descartarEvidencia} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors">
                      Descartar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Datos detectados en la imagen:</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {camposOCR.map((campo, i) => (
                    <CampoOCR key={i} {...campo} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {pago.evidencia?.imagenBase64 && pago.evidencia?.confirmada && (
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50/40 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-emerald-950/20 overflow-hidden shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-100/50 dark:bg-emerald-900/40 border-b border-emerald-200/70 dark:border-emerald-800/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm dark:shadow-none">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Evidencia adjuntada</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-bold">
                      {esTarjeta ? 'Voucher POS / Culqi' : 'Evidencia del cliente'}
                    </p>
                  </div>
                </div>

                <button onClick={solicitarCambioImagen} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg transition border border-emerald-300 dark:border-emerald-800 text-xs shadow-sm dark:shadow-none flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cambiar imagen</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
                {camposOCR.map((campo, i) => (
                  <CampoOCR key={i} {...campo} variant="onGreen" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ModalConfirmarCambio open={mostrarModalCambio} onCancel={cancelarCambioImagen} onConfirm={confirmarCambioImagen} />
    </div>
  );
}