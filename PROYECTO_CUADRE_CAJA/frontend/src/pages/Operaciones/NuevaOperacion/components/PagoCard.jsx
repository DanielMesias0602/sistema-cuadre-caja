import { useState } from 'react';
import {
  Trash2, UploadCloud, X, Loader2, CheckCircle,
  Info, Banknote, Calendar, Hash, User, Building2, CreditCard, Check, AlertCircle,
  Clock, FileText, RefreshCw, AlertTriangle, Sparkles,
} from 'lucide-react';
import ocrService from '../../../../services/ocr.service';
import { normalizarFechaISO } from '../../../../utils/fecha';

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
    isMoney: true,
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

function CampoOCR({ icon, label, value, color, variant = 'default', editable = false, isMoney = false, onValueChange, disabled = false, nota }) {
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
        {nota && <span className="text-[9px] font-medium normal-case text-slate-400 dark:text-slate-500">{nota}</span>}
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          {isMoney && <span className="font-bold text-slate-700 dark:text-slate-300">S/</span>}
          <input
            type={isMoney ? 'number' : 'text'}
            min={isMoney ? '0' : undefined}
            step={isMoney ? '0.01' : undefined}
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
            placeholder={isMoney ? '0.00' : ''}
            disabled={disabled}
            aria-label={label}
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

export default function PagoCard({
  index,
  pago,
  medios,
  onPagoChange,
  onPrepararOcr,
  onCantidadDepositosChange,
  onDepositosDetectados,
  onEliminar,
  puedeEliminar,
  errorMontoVale = false,
}) {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [preview, setPreview] = useState(pago.evidencia?.imagenBase64 || null);
  const [error, setError] = useState(null);
  const [mostrarModalCambio, setMostrarModalCambio] = useState(false);

  // LÓGICA DE RENDERIZADO DINÁMICO CORREGIDA
  const hayMedio = Boolean(pago.id_medio_pago); // <-- NUEVA VALIDACIÓN
  const medioLower = String(pago.nombre_medio || '').toLowerCase();
  const esVale = medioLower.trim() === 'vale';
  const esDeposito = medioLower.includes('deposito') || medioLower.includes('depósito');
  const esEfectivo = !esVale && !esDeposito &&
    Boolean(pago.es_efectivo || medioLower.includes('efectivo'));
  const esTarjeta = medioLower.includes('tarjeta') || medioLower.includes('pos');
  const esTransferencia = medioLower.includes('transferencia') || esDeposito;
  const esTransferenciaBCP = esTransferencia && medioLower.includes('bcp');
  const mostrarFecha = !esVale;
  const esDepositoAgrupado = Boolean(pago.grupo_depositos_id);
  const esDepositoSecundario = esDepositoAgrupado && pago.grupo_depositos_index > 0;
  const cantidadDepositos = Math.max(1, Number(pago.cantidad_depositos) || 1);
  const depositoOCR = pago.evidencia?.datosOCR?.depositos_detectados?.[
    pago.grupo_depositos_index || 0
  ];
  const referenciaOCR = depositoOCR?.referencia || depositoOCR?.operacion;
  const depositoMontosOCR = pago.evidencia?.datosOCR?.montos_detectados;
  const montoOCR = depositoOCR?.monto
    ?? (Array.isArray(depositoMontosOCR)
      ? depositoMontosOCR[pago.grupo_depositos_index || 0]
      : null);
  const mensajeOCR = esDepositoAgrupado && pago.evidencia?.datosOCR
    ? montoOCR != null && referenciaOCR
      ? 'El OCR detectó el monto y la referencia. Verifica los campos; si difieren del voucher, corrígelos.'
      : montoOCR != null
        ? 'El OCR detectó el monto, pero no la referencia. Revisa el voucher y completa la referencia si aparece.'
        : referenciaOCR
          ? 'El OCR detectó la referencia, pero no el monto. Completa el monto según el voucher.'
          : 'El OCR no pudo leer los datos de este depósito. Completa monto y referencia revisando el voucher.'
    : null;

  const mostrarRef = true;
  const mostrarBeneficiario = hayMedio && !esEfectivo && !esTarjeta;
  const mostrarCuentaDestino = hayMedio && esTransferenciaBCP;

  const handleChange = (field, value) => {
    onPagoChange({ ...pago, [field]: value });
  };

  const handleValeMontoChange = (field, value) => {
    const montoEfectivo = field === 'monto_efectivo' ? value : pago.monto_efectivo;
    const montoVirtual = field === 'monto_virtual' ? value : pago.monto_virtual;
    const montoTotal = Number(montoEfectivo || 0) + Number(montoVirtual || 0);

    onPagoChange({
      ...pago,
      [field]: value,
      monto: montoTotal > 0 ? montoTotal.toFixed(2) : ''
    });
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
      monto_efectivo: '',
      monto_virtual: '',
      id_medio_virtual: null,
      cantidad_depositos: 1,
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

    if (onPrepararOcr) {
      onPrepararOcr();
    } else {
      onPagoChange({
        ...pago,
        monto: '',
        referencia: '',
        fecha_operacion: '',
        evidencia: null
      });
    }
    setLoadingOCR(true);
    setError(null);

    try {
      const imagenBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('No se pudo leer el archivo seleccionado.'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo seleccionado.'));
        reader.readAsDataURL(file);
      });
      setPreview(imagenBase64);

      const evidenciaBase = {
        ...pago.evidencia,
        imagenBase64,
        datosOCR: {},
        confirmada: false,
        origen: 'CLIENTE',
        tipo: 'CLIENTE',
      };
      const cantidadDepositos = esDeposito
        ? Math.max(1, Number.parseInt(pago.cantidad_depositos, 10) || 1)
        : 1;
      try {
        const response = await ocrService.procesar(file, 'TRANSFERENCIA', {
          cantidadDepositos,
        });
        const rawData = response.data?.data || response.data;
        const datosExtraidos = rawData?.datos_extraidos || rawData;
        const depositosDetectados = Array.isArray(datosExtraidos?.depositos_detectados)
          ? datosExtraidos.depositos_detectados
          : [];
        const montosDetectados = Array.isArray(datosExtraidos?.montos_detectados)
          ? datosExtraidos.montos_detectados
          : depositosDetectados.map((deposito) => deposito?.monto);
        const depositosParaFormulario = montosDetectados
          .map((monto, montoIndex) => ({
            ...depositosDetectados[montoIndex],
            monto,
          }))
          .filter((deposito) => Number.isFinite(Number(deposito.monto)) && Number(deposito.monto) > 0);
        const evidenciaOCR = {
          ...evidenciaBase,
          datosOCR: datosExtraidos,
        };

        if (
          esDeposito &&
          depositosParaFormulario.length > 0 &&
          onDepositosDetectados
        ) {
          onDepositosDetectados({
            index,
            depositos: depositosParaFormulario,
            datosOCR: datosExtraidos,
            evidencia: evidenciaOCR,
          });
          return;
        }

        onPagoChange({
          ...pago,
          monto: '',
          referencia: '',
          fecha_operacion: '',
          evidencia: evidenciaOCR
        });
      } catch (ocrError) {
        console.error('Error OCR:', ocrError);
        onPagoChange({
          ...pago,
          monto: '',
          referencia: '',
          fecha_operacion: '',
          evidencia: evidenciaBase,
        });
        setError('No se pudo procesar la imagen con OCR. Puedes completar los datos manualmente.');
      }
    } catch (readError) {
      console.error('Error lectura:', readError);
      setError('No se pudo leer la imagen. Intenta seleccionarla nuevamente.');
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
      : (esVale ? '' : (montoDetectado ?? ''));

    onPagoChange({
      ...pago,
      evidencia: { ...pago.evidencia, confirmada: true },
      monto: montoActual,
      referencia: pago.referencia || referenciaDetectada || '',
      fecha_operacion: normalizarFechaISO(pago.fecha_operacion || fechaDetectada || ''),
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
          editable: !(esVale && campo.field === 'monto'),
          onValueChange: (value) => handleChange(campo.field, value),
          disabled: loadingOCR
        }
        : campo)
    : [];
  const camposOCROriginales = pago.evidencia?.imagenBase64
    ? getCamposOCR(
      pago.evidencia.datosOCR,
      pago.nombre_medio || pago.medio_pago,
      '',
      '',
      ''
    ).map((campo) => ({
      ...campo,
      value: campo.field === 'monto'
        ? String(montoOCR ?? pago.evidencia?.datosOCR?.monto ?? campo.value ?? '')
        : campo.value,
      editable: false,
      ...(campo.field === 'monto' ? { nota: 'Dato original del OCR' } : {})
    }))
    : [];

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-600 p-4 sm:p-6 shadow-sm dark:shadow-none mb-4">
      {/* Cabecera del Pago */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
          {esDepositoAgrupado
            ? `Depósito ${(pago.grupo_depositos_index || 0) + 1} de ${cantidadDepositos}`
            : `Pago #${index + 1}`}
        </h3>
        {puedeEliminar && (
          <button onClick={onEliminar} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" title="Eliminar este pago">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {esDepositoAgrupado && pago.evidencia?.datosOCR && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3 dark:border-indigo-800/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/30">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-indigo-950 dark:text-indigo-200">
              Revisa los datos del depósito
            </p>
            <p className="mt-1 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300">
              {mensajeOCR}
            </p>
          </div>
        </div>
      )}

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
          {esVale ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monto efectivo (S/) *</label>
                <input
                  type="number"
                  min="0.01"
                  value={pago.monto_efectivo || ''}
                  onChange={(e) => handleValeMontoChange('monto_efectivo', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={loadingOCR}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Medio virtual *</label>
                <select
                  value={pago.id_medio_virtual || ''}
                  onChange={(e) => handleChange(
                    'id_medio_virtual',
                    e.target.value ? Number(e.target.value) : null,
                  )}
                  disabled={loadingOCR}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-orange outline-none"
                >
                  <option value="">Seleccione un medio virtual</option>
                  {medios
                    .filter((medio) => (
                      !medio.es_efectivo &&
                      String(medio.nombre || '').trim().toLowerCase() !== 'vale'
                    ))
                    .map((medio) => (
                      <option key={medio.id_medio_pago} value={medio.id_medio_pago}>
                        {medio.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monto virtual (S/) *</label>
                <input
                  type="number"
                  min="0.01"
                  value={pago.monto_virtual || ''}
                  onChange={(e) => handleValeMontoChange('monto_virtual', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  disabled={loadingOCR}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monto total del pago (S/)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pago.monto || ''}
                  onChange={(e) => handleChange('monto', e.target.value)}
                  aria-invalid={errorMontoVale}
                  aria-label="Monto total del pago"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-orange dark:bg-slate-900 dark:text-slate-200 ${
                    errorMontoVale
                      ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-950/30'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700'
                  }`}
                />
                {errorMontoVale && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    El total debe coincidir con la suma del monto efectivo y el monto virtual.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Monto (S/) *</label>
              <input
                type="number"
                value={pago.monto}
                onChange={(e) => handleChange('monto', e.target.value)}
                placeholder="0.00"
                step="0.01"
                disabled={loadingOCR}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
              />
            </>
          )}
        </div>

        {esDeposito && (
          <>
            {!esDepositoSecundario && (
              <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2 sm:items-stretch">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    ¿Cuántos depósitos hay en el comprobante?
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={pago.cantidad_depositos ?? 1}
                    onChange={(e) => {
                      handleChange('cantidad_depositos', e.target.value);
                      onCantidadDepositosChange?.(e.target.value);
                    }}
                    disabled={loadingOCR}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-3 dark:border-violet-800/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-indigo-950/30">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
                  <div className="text-xs leading-relaxed text-violet-950 dark:text-violet-200">
                    <p className="font-bold">Primero define la cantidad; luego carga el voucher.</p>
                    <p className="mt-1 text-violet-800 dark:text-violet-300">
                      Aparecerán {cantidadDepositos} bloque{cantidadDepositos === 1 ? '' : 's'}.
                      Sube una sola imagen desde el primer bloque. El OCR intentará asociar monto y referencia a cada depósito.
                      Revisa y completa cualquier dato que falte.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* CAMPOS DINÁMICOS */}
        {!esEfectivo && (
          <>
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
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>
            )}

            {mostrarFecha && (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Fecha de Operación</label>
                <input
                  type="date"
                  value={normalizarFechaISO(pago.fecha_operacion)}
                  onChange={(e) => handleChange('fecha_operacion', e.target.value)}
                  disabled={loadingOCR}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
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
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>
            )}
          </>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observación</label>
          {esEfectivo ? (
            <textarea
              value={pago.observacion || ''}
              onChange={(e) => handleChange('observacion', e.target.value)}
              placeholder="Opcional"
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          ) : (
            <input
              type="text"
              value={pago.observacion || ''}
              onChange={(e) => handleChange('observacion', e.target.value)}
              placeholder="Opcional"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-orange outline-none"
            />
          )}
        </div>
      </div>

      {/* SECCIÓN DE EVIDENCIA */}
      {hayMedio && !esEfectivo && !esDepositoSecundario && (
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
                    {esDepositoSecundario
                      ? 'Los datos se leen desde la imagen cargada en el primer depósito'
                      : esDepositoAgrupado
                        ? 'Sube aquí una sola imagen con los depósitos para leer todos los bloques'
                        : esTarjeta
                          ? 'Haz clic para subir la foto del voucher (Culqi/POS)'
                          : 'Haz clic para subir la evidencia del cliente'}
                  </p>
                </>
              )}
            </div>
          )}

          {esDepositoSecundario && !pago.evidencia?.imagenBase64 && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200">
              El OCR procesa la imagen una sola vez desde el primer bloque y distribuye lo detectado en estos campos.
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
                {camposOCROriginales.map((campo, i) => (
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