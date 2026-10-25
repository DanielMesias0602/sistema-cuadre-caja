import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Clock,
  Banknote,
  Calendar,
  Hash,
  Building2,
  User,
  Package,
  FileText,
  CreditCard,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../../../lib/api';

// --- Helpers ---
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
};

// Etiquetas que SIEMPRE se muestran (prioritarias)
const CAMPOS_PRIORITARIOS = ['Monto', 'Fecha', 'Banco', 'Banco / App', 'Nro. operación'];

const getCamposOCR = (datosOCR, medioPago) => {
  if (!datosOCR) return [];
  const medio = String(medioPago || '').toLowerCase();
  const campos = [];

  if (datosOCR.monto != null) campos.push({ icon: 'banknote', label: 'Monto', value: `S/ ${Number(datosOCR.monto).toFixed(2)}`, color: 'emerald' });
  if (datosOCR.fecha_operacion) campos.push({ icon: 'calendar', label: 'Fecha', value: datosOCR.fecha_operacion, color: 'blue' });
  if (datosOCR.hora_operacion) campos.push({ icon: 'clock', label: 'Hora', value: datosOCR.hora_operacion, color: 'teal' });

  if (medio.includes('yape') || medio.includes('plin')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco / App', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    if (datosOCR.destinatario) campos.push({ icon: 'user', label: 'Destinatario', value: datosOCR.destinatario, color: 'orange' });
  } else if (medio.includes('transferencia') || medio.includes('deposito') || medio.includes('depósito')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
    if (datosOCR.tipo_cuenta_origen) campos.push({ icon: 'creditCard', label: 'Tipo cuenta', value: datosOCR.tipo_cuenta_origen, color: 'slate' });
    if (datosOCR.cuenta_origen) campos.push({ icon: 'creditCard', label: 'Cuenta origen', value: datosOCR.cuenta_origen, color: 'slate' });
    if (datosOCR.cuenta_destino) campos.push({ icon: 'creditCard', label: 'Cuenta destino', value: datosOCR.cuenta_destino, color: 'slate' });
    if (datosOCR.destinatario) campos.push({ icon: 'user', label: 'Beneficiario', value: datosOCR.destinatario, color: 'orange' });
  } else if (medio.includes('tarjeta')) {
    if (datosOCR.aplicacion_banco || datosOCR.banco) campos.push({ icon: 'building', label: 'Banco', value: datosOCR.aplicacion_banco || datosOCR.banco, color: 'indigo' });
  }

  if (datosOCR.referencia_bancaria || datosOCR.numero_operacion) campos.push({ icon: 'hash', label: 'Nro. operación', value: datosOCR.referencia_bancaria || datosOCR.numero_operacion, color: 'purple' });
  if (datosOCR.descripcion) campos.push({ icon: 'file', label: 'Descripción', value: datosOCR.descripcion, color: 'slate' });
  if (datosOCR.sucursal_agencia) campos.push({ icon: 'building', label: 'Sucursal', value: datosOCR.sucursal_agencia, color: 'slate' });
  if (datosOCR.cuenta_movimiento?.numero) campos.push({ icon: 'creditCard', label: 'Cuenta empresa', value: datosOCR.cuenta_movimiento.numero, color: 'slate' });

  return campos;
};

function CampoOCR({ icon, label, value, color }) {
  const Icon = ICONOS[icon] || Info;
  const colorClass = COLORES[color] || 'text-slate-500';
  return (
    <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-100 shadow-sm min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${colorClass}`} />
        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold">{label}</p>
      </div>
      <p className="text-xs sm:text-sm font-bold text-slate-900 break-words">{value}</p>
    </div>
  );
}

function CamposConToggle({ campos, storageKey, expandidos, onToggle }) {
  const prioritarios = campos.filter((c) => CAMPOS_PRIORITARIOS.includes(c.label));
  const extras = campos.filter((c) => !CAMPOS_PRIORITARIOS.includes(c.label));
  const estaExpandido = !!expandidos[storageKey];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {prioritarios.map((c, i) => (
          <CampoOCR key={`prio-${i}`} {...c} />
        ))}
      </div>

      {extras.length > 0 && (
        <>
          {estaExpandido && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {extras.map((c, i) => (
                <CampoOCR key={`extra-${i}`} {...c} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggle(storageKey)}
            className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            {estaExpandido ? (
              <>
                Ocultar detalles
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Ver {extras.length} {extras.length === 1 ? 'campo más' : 'campos más'}
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

const base64ToBlob = (base64, contentType = 'image/jpeg') => {
  const partes = base64.split(',');
  const contenido = partes.length > 1 ? partes[1] : partes[0];
  const byteCharacters = atob(contenido);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

const normalizarTexto = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const obtenerMedioPago = (pago) =>
  normalizarTexto(
    pago?.nombre_medio || pago?.medio_pago || pago?.medioPago || pago?.nombre_medio_pago || ''
  );

const esMedioBancario = (pago) => {
  const medio = obtenerMedioPago(pago);
  return (
    medio.includes('transferencia') ||
    medio.includes('deposito') ||
    medio.includes('yape') ||
    medio.includes('plin') ||
    medio.includes('billetera') ||
    medio.includes('banco')
  );
};

const formatPEN = (val) => {
  const num = Number(val || 0);
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function Paso4Confirmacion({
  comprobante,
  pagos = [],
  evidenciaComprobante,
  evidenciaEmpresa,
  ocrEmpresa,
  onBack,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [expandidos, setExpandidos] = useState({});

  const toggleExpandir = (key) => {
    setExpandidos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const listaPagos = Array.isArray(pagos) ? pagos : [];
  const montoOperacion = Number.parseFloat(comprobante?.monto) || 0;
  const totalPagado = listaPagos.reduce((sum, pago) => sum + (Number.parseFloat(pago?.monto) || 0), 0);
  const pendiente = Math.max(0, montoOperacion - totalPagado);
  const estadoOperacion = pendiente <= 0 ? 'PAGADA' : 'PENDIENTE';

  const pagosTransferencia = listaPagos.filter(esMedioBancario);
  const totalTransferenciasCliente = pagosTransferencia.reduce((sum, pago) => sum + (Number.parseFloat(pago?.monto) || 0), 0);

  const montoEmpresa = ocrEmpresa?.monto != null && ocrEmpresa.monto !== '' ? Number.parseFloat(ocrEmpresa.monto) || 0 : 0;
  const margenError = 1;
  const hayPagoBancario = pagosTransferencia.length > 0;

  const esTodoEfectivo = listaPagos.length > 0 && listaPagos.every((pago) => {
    const medio = obtenerMedioPago(pago);
    return medio.includes('efectivo');
  });

  const hayEvidenciaEmpresa = Boolean(evidenciaEmpresa);
  const montosCoinciden = hayPagoBancario && montoEmpresa > 0 && Math.abs(totalTransferenciasCliente - montoEmpresa) <= margenError;
  const hayDiferenciaMontos = hayPagoBancario && montoEmpresa > 0 && !montosCoinciden;

  const estadoConfirmacion = esTodoEfectivo ? 'EFECTIVO'
    : montosCoinciden ? 'MONTOS_COINCIDEN'
    : hayDiferenciaMontos ? 'DIFERENCIA'
    : 'PENDIENTE';

  const textoConfirmacion = {
    EFECTIVO: 'El pago en efectivo se verificará durante el cierre de caja.',
    MONTOS_COINCIDEN: 'Los montos declarados coinciden con el comprobante adjunto. El ingreso aún debe ser verificado por la empresa.',
    DIFERENCIA: 'El monto identificado en el comprobante adjunto no coincide con el total de los pagos bancarios declarados. Se requiere revisión.',
    PENDIENTE: hayEvidenciaEmpresa
      ? 'Comprobante de ingreso adjunto. La confirmación del ingreso a la cuenta de la empresa está pendiente.'
      : 'Pendiente de confirmación del ingreso en la cuenta de la empresa. Puedes adjuntar el comprobante bancario posteriormente.',
  }[estadoConfirmacion];

  let rawItems = comprobante?.items;
  if (typeof rawItems === 'string') {
    try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; }
  }
  const items = Array.isArray(rawItems) ? rawItems : [];

  const handleRegistrar = async () => {
    setLoading(true);
    setError(null);

    try {
      if (listaPagos.length === 0) {
        setError('La operación debe tener al menos un pago asociado.');
        return;
      }

      const montoComprobante = Number(comprobante?.monto) || 0;
      const pendienteCalculado = montoComprobante - totalPagado;
      const estadoFinal = pendienteCalculado <= 0 ? 'PAGADA' : 'PENDIENTE';

      const fechaOriginal = comprobante?.fecha || '';
      const fechaISO = fechaOriginal.includes('/') ? fechaOriginal.split('/').reverse().join('-') : fechaOriginal;

      const evidenciasParaPayload = [];

      if (evidenciaComprobante) {
        const formDataComprobante = new FormData();
        formDataComprobante.append('archivo', evidenciaComprobante);
        const resUploadComprobante = await api.post('/evidencias/upload', formDataComprobante, { headers: { 'Content-Type': 'multipart/form-data' } });
        const keyComprobante = resUploadComprobante.data?.data?.storage_key;
        if (keyComprobante) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'COMPROBANTE',
            storage_key: keyComprobante,
            fecha_evidencia: fechaISO,
            observacion: 'Comprobante de operación',
          });
        }
      }

      if (evidenciaEmpresa) {
        const formDataEmpresa = new FormData();
        formDataEmpresa.append('archivo', evidenciaEmpresa);
        const resUploadEmpresa = await api.post('/evidencias/upload', formDataEmpresa, { headers: { 'Content-Type': 'multipart/form-data' } });
        const keyEmpresa = resUploadEmpresa.data?.data?.storage_key;
        if (keyEmpresa) {
          evidenciasParaPayload.push({
            tipo_evidencia: 'EMPRESA',
            storage_key: keyEmpresa,
            fecha_evidencia: fechaISO,
            observacion: 'Comprobante de ingreso a la cuenta de la empresa',
            datos_ocr: ocrEmpresa ? JSON.stringify(ocrEmpresa) : null,
            texto_ocr: null,
          });
        }
      }

      for (const pago of listaPagos) {
        if (pago?.evidencia?.imagenBase64) {
          const blob = base64ToBlob(pago.evidencia.imagenBase64, 'image/jpeg');
          const file = new File([blob], `evidencia-cliente-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const formDataCliente = new FormData();
          formDataCliente.append('archivo', file);
          const resUploadCliente = await api.post('/evidencias/upload', formDataCliente, { headers: { 'Content-Type': 'multipart/form-data' } });
          const keyCliente = resUploadCliente.data?.data?.storage_key;
          if (keyCliente) {
            evidenciasParaPayload.push({
              tipo_evidencia: 'CLIENTE',
              storage_key: keyCliente,
              fecha_evidencia: fechaISO,
              observacion: `Evidencia de pago del cliente: ${pago.nombre_medio || pago.medio_pago || 'No especificado'}`,
              datos_ocr: pago.evidencia.datosOCR ? JSON.stringify(pago.evidencia.datosOCR) : null,
              texto_ocr: pago.evidencia.textoOcr || null,
            });
          }
        }
      }

      const payload = {
        comprobante: {
          tipo_comprobante: comprobante?.tipo_comprobante,
          serie: comprobante?.serie,
          numero: comprobante?.numero,
          fecha: fechaISO,
          monto: montoComprobante,
          cliente: comprobante?.cliente || null,
          vendedor: comprobante?.vendedor || null,
          hora: comprobante?.hora || null,
          moneda: comprobante?.moneda || 'PEN',
          igv: Number(comprobante?.igv) || 0,
          op_gravada: Number(comprobante?.op_gravada) || 0,
          items: comprobante?.items || [],
        },
        operacion: { fecha: fechaISO, monto: montoComprobante, estado: estadoFinal, observacion: '' },
        pagos: listaPagos.map((pago) => ({
          id_medio_pago: pago.id_medio_pago,
          monto: Number(pago.monto),
          referencia_bancaria: pago.referencia || null,
          observacion: pago.observacion || null,
        })),
        evidencias: evidenciasParaPayload,
      };

      await api.post('/operaciones/registrar-unificado', payload);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error('Error registrando operación:', err);
      setError(err.response?.data?.message || err.message || 'Error al registrar la operación.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 sm:mb-6">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 text-center">¡Operación registrada!</h2>
        <p className="text-sm sm:text-base text-slate-500 text-center">La operación se registró correctamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-3 sm:mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Paso 4: Resumen y Confirmación</h2>
        <p className="text-xs sm:text-base text-slate-500 px-2">Revisa los datos antes de guardar definitivamente en el sistema.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-red-800 font-medium text-xs sm:text-sm mb-2 break-words">{error}</p>
            <button type="button" onClick={handleRegistrar} disabled={loading} className="text-xs sm:text-sm text-red-700 underline disabled:opacity-50">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Resumen de verificación */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-3 sm:mb-4">Resumen de verificación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-3 sm:mb-4">
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold mb-1">Total facturado</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{formatPEN(montoOperacion)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold mb-1">Total pagado por el cliente</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{formatPEN(totalPagado)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold mb-1">Confirmación del ingreso en la empresa</p>
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {esTodoEfectivo ? 'Se verificará en el cierre de caja.'
                : hayEvidenciaEmpresa ? 'Comprobante adjunto; pendiente de verificación.'
                : 'Pendiente de confirmación del ingreso.'}
            </p>
          </div>
        </div>

        {esTodoEfectivo ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-800 font-medium">El pago se realizó en efectivo. No se requiere una captura bancaria; el efectivo se verificará durante el cierre de caja.</p>
          </div>
        ) : montosCoinciden ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-800 font-medium">{textoConfirmacion}</p>
          </div>
        ) : hayDiferenciaMontos ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-red-800 font-medium">
              {textoConfirmacion} Pagos bancarios declarados: {formatPEN(totalTransferenciasCliente)}. Monto identificado: {formatPEN(montoEmpresa)}.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-800 font-medium">{textoConfirmacion}</p>
          </div>
        )}
      </div>

      {/* Comprobante — REDUCIDO A 2 LÍNEAS */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight break-words">
              {comprobante?.tipo_comprobante || 'Comprobante'} {comprobante?.serie || ''}-{comprobante?.numero || ''}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 break-words">
              {comprobante?.fecha || 'Pendiente'}
              {comprobante?.cliente && <> · {comprobante.cliente}</>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-semibold">Monto total</p>
            <p className="text-base sm:text-xl font-bold text-brand-orange tabular-nums">{formatPEN(montoOperacion)}</p>
          </div>
        </div>
      </div>

      {/* DATOS EXTRAÍDOS DEL COMPROBANTE */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1 flex items-center gap-2">
          <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-orange-50 text-brand-orange flex-shrink-0">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <span className="break-words">Datos extraídos del comprobante</span>
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Información detectada automáticamente por el OCR en la boleta/factura.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {comprobante?.cliente && <CampoOCR icon="user" label="Cliente" value={comprobante.cliente} color="indigo" />}
          {comprobante?.vendedor && <CampoOCR icon="user" label="Vendedor" value={comprobante.vendedor} color="orange" />}
          {comprobante?.hora && <CampoOCR icon="clock" label="Hora" value={comprobante.hora} color="teal" />}
          {comprobante?.moneda && <CampoOCR icon="banknote" label="Moneda" value={comprobante.moneda} color="emerald" />}
          {comprobante?.op_gravada != null && <CampoOCR icon="banknote" label="Op. Gravada" value={formatPEN(comprobante.op_gravada)} color="blue" />}
          {comprobante?.igv != null && <CampoOCR icon="banknote" label="IGV" value={formatPEN(comprobante.igv)} color="purple" />}
        </div>

        {/* Items — ACORDEÓN COLAPSADO */}
        {items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => toggleExpandir('items')}
              className="w-full flex items-center justify-between text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition gap-2"
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Detalle de productos ({items.length})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${expandidos.items ? 'rotate-180' : ''}`} />
            </button>

            {expandidos.items && (
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/50">
                {items.map((it, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 p-2.5 sm:p-3">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 break-words">{it.descripcion}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Cant: {it.cantidad} · P.Unit: {formatPEN(it.precio_unitario)}</p>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums shrink-0">{formatPEN(it.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* DATOS EXTRAÍDOS DE LAS EVIDENCIAS */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg mb-1 flex items-center gap-2">
          <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <span className="break-words">Datos extraídos de las evidencias</span>
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Información detectada automáticamente según el tipo de medio de pago.</p>

        {/* Evidencias del cliente */}
        <div className="space-y-3">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Evidencias del cliente</p>
          {pagosTransferencia.length > 0 ? (
            pagosTransferencia.map((pago, idx) => {
              const datosOCR = pago.evidencia?.datosOCR;
              const campos = datosOCR ? getCamposOCR(datosOCR, pago.nombre_medio || pago.medio_pago) : [];
              return (
                <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 sm:p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate min-w-0">
                      Pago #{idx + 1} — {pago.medio_pago || pago.nombre_medio || 'Transferencia'}
                    </p>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatPEN(pago.monto)}</span>
                  </div>
                  {campos.length > 0 ? (
                    <CamposConToggle
                      campos={campos}
                      storageKey={`cliente-${idx}`}
                      expandidos={expandidos}
                      onToggle={toggleExpandir}
                    />
                  ) : (
                    <p className="text-[11px] sm:text-xs text-slate-500 italic">Sin datos OCR registrados para este pago.</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 italic bg-slate-50 p-2.5 sm:p-3 rounded-lg text-center">No hay pagos bancarios con evidencia del cliente.</p>
          )}
        </div>

        {/* Evidencia de la empresa */}
        <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-100">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Evidencia de la empresa</p>
          {ocrEmpresa ? (
            (() => {
              const campos = getCamposOCR(ocrEmpresa, 'transferencia');
              return (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 sm:p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate min-w-0">
                      {ocrEmpresa.aplicacion_banco || ocrEmpresa.banco || 'Transferencia'} — Evidencia de empresa
                    </p>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatPEN(ocrEmpresa.monto)}</span>
                  </div>
                  {campos.length > 0 ? (
                    <CamposConToggle
                      campos={campos}
                      storageKey="empresa"
                      expandidos={expandidos}
                      onToggle={toggleExpandir}
                    />
                  ) : (
                    <p className="text-[11px] sm:text-xs text-slate-500 italic">Sin datos OCR registrados.</p>
                  )}
                </div>
              );
            })()
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 italic bg-slate-50 p-2.5 sm:p-3 rounded-lg text-center">No se adjuntó evidencia de empresa.</p>
          )}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
          <div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Monto operación</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{formatPEN(montoOperacion)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Total pagado</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{formatPEN(totalPagado)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Pendiente</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{formatPEN(pendiente)}</p>
          </div>
        </div>
      </div>

      {/* NAV — Registrar arriba en móvil */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold text-sm transition disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> Atrás
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold text-sm transition shadow-md disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> Registrando...
            </>
          ) : (
            <>
              Registrar operación
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}