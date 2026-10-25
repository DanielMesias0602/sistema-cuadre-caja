import { useState } from 'react';
import {
  Trash2, UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle,
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
  slate: 'text-slate-500',
  rose: 'text-rose-500',
};

const getCamposOCR = (datosOCR, medioPago) => {
  if (!datosOCR) return [];
  const medio = String(medioPago || '').toLowerCase();
  const campos = [];

  if (datosOCR.monto != null) {
    campos.push({ icon: 'banknote', label: 'Monto', value: `S/ ${Number(datosOCR.monto).toFixed(2)}`, color: 'emerald' });
  }
  if (datosOCR.fecha_operacion) {
    campos.push({ icon: 'calendar', label: 'Fecha', value: datosOCR.fecha_operacion, color: 'blue' });
  }
  if (datosOCR.hora_operacion) {
    campos.push({ icon: 'clock', label: 'Hora', value: datosOCR.hora_operacion, color: 'teal' });
  }

  if (medio.includes('yape') || medio.includes('plin')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) {
      campos.push({ icon: 'building', label: 'Banco / App', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    }
    if (datosOCR.destinatario) {
      campos.push({ icon: 'user', label: 'Destinatario', value: datosOCR.destinatario, color: 'orange' });
    }
  } else if (medio.includes('transferencia') || medio.includes('deposito') || medio.includes('depósito')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) {
      campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    }
    if (datosOCR.tipo_cuenta_origen) {
      campos.push({ icon: 'creditCard', label: 'Tipo cuenta', value: datosOCR.tipo_cuenta_origen, color: 'slate' });
    }
    if (datosOCR.cuenta_origen) {
      campos.push({ icon: 'creditCard', label: 'Cuenta origen', value: datosOCR.cuenta_origen, color: 'slate' });
    }
    if (datosOCR.cuenta_destino) {
      campos.push({ icon: 'creditCard', label: 'Cuenta destino', value: datosOCR.cuenta_destino, color: 'slate' });
    }
    if (datosOCR.destinatario) {
      campos.push({ icon: 'user', label: 'Beneficiario', value: datosOCR.destinatario, color: 'orange' });
    }
  } else if (medio.includes('tarjeta')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) {
      campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    }
  }

  if (datosOCR.referencia_bancaria || datosOCR.numero_operacion) {
    campos.push({ icon: 'hash', label: 'Nro. operación', value: datosOCR.referencia_bancaria || datosOCR.numero_operacion, color: 'purple' });
  }

  if (datosOCR.descripcion) {
    campos.push({ icon: 'file', label: 'Descripción', value: datosOCR.descripcion, color: 'slate' });
  }
  if (datosOCR.sucursal_agencia) {
    campos.push({ icon: 'building', label: 'Sucursal', value: datosOCR.sucursal_agencia, color: 'slate' });
  }
  if (datosOCR.cuenta_movimiento?.numero) {
    campos.push({ icon: 'creditCard', label: 'Cuenta empresa', value: datosOCR.cuenta_movimiento.numero, color: 'slate' });
  }

  return campos;
};

function CampoOCR({ icon, label, value, color, variant = 'default' }) {
  const Icon = ICONOS[icon] || Info;
  const colorClass = COLORES[color] || 'text-slate-500';

  const containerClass =
    variant === 'onGreen'
      ? 'bg-white p-3 rounded-lg border border-emerald-100 shadow-sm min-w-0'
      : 'bg-white p-3 rounded-lg border border-slate-100 shadow-sm min-w-0';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
      </div>
      <p className="font-bold text-slate-900 break-words">{value}</p>
    </div>
  );
}

function ModalConfirmarCambio({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
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
          <p className="text-sm text-slate-700 leading-relaxed">
            Se eliminará la imagen actual y se perderá la información asociada:
          </p>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>Datos del OCR (monto, referencia, banco, destinatario)</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>Campos autocompletados (Monto y Referencia bancaria)</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>Estado de confirmación de la evidencia</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 italic leading-relaxed">
            Podrás subir una nueva imagen y volver a confirmar los datos.
          </p>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm"
          >
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
      es_efectivo: medioSeleccionado ? medioSeleccionado.es_efectivo : false
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
    const montoDetectado = pago.evidencia?.datosOCR?.monto;
    const referenciaDetectada = pago.evidencia?.datosOCR?.referencia_bancaria || pago.evidencia?.datosOCR?.numero_operacion;

    onPagoChange({
      ...pago,
      evidencia: { ...pago.evidencia, confirmada: true },
      monto: pago.monto || (montoDetectado ? montoDetectado : ''),
      referencia: pago.referencia || (referenciaDetectada ? referenciaDetectada : '')
    });
  };

  const descartarEvidencia = () => {
    onPagoChange({ ...pago, evidencia: null });
    setPreview(null);
    setError(null);
  };

  const solicitarCambioImagen = () => {
    setMostrarModalCambio(true);
  };

  const cancelarCambioImagen = () => {
    setMostrarModalCambio(false);
  };

  const confirmarCambioImagen = () => {
    setMostrarModalCambio(false);
    descartarEvidencia();
  };

  const camposOCR = pago.evidencia?.datosOCR
    ? getCamposOCR(pago.evidencia.datosOCR, pago.nombre_medio || pago.medio_pago)
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm mb-4">
      {/* Cabecera del Pago */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-900 text-lg">Pago #{index + 1}</h3>
        {puedeEliminar && (
          <button
            onClick={onEliminar}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
            title="Eliminar este pago"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Formulario del Pago */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medio de pago *</label>
          <select
            value={pago.id_medio_pago || ''}
            onChange={handleMedioChange}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
          >
            <option value="">Seleccione un medio</option>
            {medios.map(m => (
              <option key={m.id_medio_pago} value={m.id_medio_pago}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto (S/) *</label>
          <input
            type="number"
            value={pago.monto}
            onChange={(e) => handleChange('monto', e.target.value)}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
          />
        </div>

        {!pago.es_efectivo && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia bancaria</label>
            <input
              type="text"
              value={pago.referencia || ''}
              onChange={(e) => handleChange('referencia', e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>
        )}

        <div className={pago.es_efectivo ? 'md:col-span-2' : ''}>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observación</label>
          <input
            type="text"
            value={pago.observacion || ''}
            onChange={(e) => handleChange('observacion', e.target.value)}
            placeholder="Opcional"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
          />
        </div>
      </div>

      {/* SECCIÓN DE EVIDENCIA / OCR (Solo si NO es efectivo) */}
      {!pago.es_efectivo && pago.id_medio_pago && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Si NO hay evidencia real */}
          {!pago.evidencia?.imagenBase64 && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative">
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
                  <p className="text-sm text-slate-600 font-medium">Procesando OCR...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 font-medium text-center">Haz clic para subir la evidencia del cliente</p>
                </>
              )}
            </div>
          )}

          {/* Si HAY evidencia pero NO está confirmada */}
          {pago.evidencia?.imagenBase64 && !pago.evidencia.confirmada && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex gap-4 items-start">
                {preview && (
                  <img src={preview} alt="Evidencia" className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 mb-1">Evidencia cargada</p>
                      <p className="text-xs text-slate-500">Revisa los datos extraídos antes de confirmar.</p>
                    </div>
                    <button onClick={descartarEvidencia} className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-2">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={confirmarEvidencia}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Confirmar
                    </button>
                    <button
                      onClick={descartarEvidencia}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>

              {pago.evidencia.datosOCR && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Datos detectados en la imagen:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {camposOCR.map((campo, i) => (
                      <CampoOCR key={i} {...campo} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Si la evidencia YA ESTÁ CONFIRMADA — REDISEÑO */}
          {pago.evidencia?.imagenBase64 && pago.evidencia?.confirmada && (
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50/40 overflow-hidden shadow-sm">
              {/* Header mejorado */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-100/50 border-b border-emerald-200/70">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-900 text-sm">Evidencia confirmada</p>
                    <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">Evidencia del cliente</p>
                  </div>
                </div>

                <button
                  onClick={solicitarCambioImagen}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold rounded-lg transition border border-emerald-300 text-xs shadow-sm flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cambiar imagen</span>
                  <span className="sm:hidden">Cambiar</span>
                </button>
              </div>

              {/* Tiles */}
              {pago.evidencia.datosOCR && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {camposOCR.map((campo, i) => (
                    <CampoOCR key={i} {...campo} variant="onGreen" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación */}
      <ModalConfirmarCambio
        open={mostrarModalCambio}
        onCancel={cancelarCambioImagen}
        onConfirm={confirmarCambioImagen}
      />
    </div>
  );
}