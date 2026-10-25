import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, ArrowLeft, ArrowRight, RefreshCw, X } from 'lucide-react';
import ocrService from '../../../services/ocr.service';
import { SingleDatePicker } from '../../../components/ui/SingleDatePicker';

export function Paso2RevisionOCR({ evidencia, tipoEvidencia, onNext, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [tipoEvidenciaDetectado, setTipoEvidenciaDetectado] = useState('COMPROBANTE');
  const [formData, setFormData] = useState({
    // Comunes
    tipoEvidencia: '',

    // Comprobante
    tipo_comprobante: '',
    serie: '',
    numero: '',
    fecha: '',
    hora: '',
    vendedor: '',
    producto: '',
    monto: '',
    igv: '',
    efectivo: '',
    moneda: 'PEN',
    medio_pago: '',

    // Transferencia
    aplicacion_banco: '',
    estado_transferencia: '',
    fecha_operacion: '',
    hora_operacion: '',
    destinatario: '',
    cuenta_destino: '',
    cuenta_origen: '',
    tipo_cuenta_origen: '',
    referencia_bancaria: '',
    mensaje: '',
  });
  const [imagenPreview, setImagenPreview] = useState(null);
  const ejecutadoRef = useRef(false);
  const urlRef = useRef(null);

  const convertirFecha = (fecha) => {
    if (!fecha) return '';
    const [dia, mes, anio] = fecha.split('/');
    if (dia && mes && anio) {
      return `${anio}-${mes}-${dia}`;
    }
    return '';
  };

  // Manejo del objectUrl - solo se crea y revoca en unmount
  useEffect(() => {
    if (evidencia instanceof Blob) {
      urlRef.current = URL.createObjectURL(evidencia);
      setImagenPreview(urlRef.current);
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []); // Solo en unmount

  useEffect(() => {
    if (ejecutadoRef.current) return;
    
    if (!evidencia) {
      setLoading(false);
      onNext(formData);
      return;
    }

    ejecutadoRef.current = true;
    procesarOCR();
  }, [evidencia]);

  const procesarOCR = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await ocrService.procesar(evidencia, tipoEvidencia || 'COMPROBANTE');
      
      // El backend responde: { status: 'ok', data: { datos_extraidos, requiere_revision, requiere_confirmacion } }
      const ocrResult = response.data?.data || response.data;
      setOcrData(ocrResult);

      // Extraer datos_extraidos si existen
      const datos = ocrResult?.datos_extraidos || {};
      
      // Detectar tipo según los campos recibidos
      const esTransferencia = !!datos.tipo_evidencia || 
                              !!datos.aplicacion_banco || 
                              !!datos.destinatario;

      setTipoEvidenciaDetectado(esTransferencia ? 'TRANSFERENCIA' : 'COMPROBANTE');

      if (esTransferencia) {
        // Campos de transferencia
        setFormData({
          tipoEvidencia: 'TRANSFERENCIA',
          aplicacion_banco: datos.aplicacion_banco || '',
          estado_transferencia: datos.estado_transferencia || '',
          fecha_operacion: convertirFecha(datos.fecha_operacion) || '',
          hora_operacion: datos.hora_operacion || '',
          destinatario: datos.destinatario || '',
          cuenta_destino: datos.cuenta_destino || '',
          cuenta_origen: datos.cuenta_origen || '',
          tipo_cuenta_origen: datos.tipo_cuenta_origen || '',
          referencia_bancaria: datos.referencia_bancaria || '',
          mensaje: datos.mensaje || '',
          monto: datos.monto ? String(datos.monto) : '',
          moneda: datos.moneda || 'PEN',
        });
      } else {
        // Campos de comprobante
        setFormData({
          tipoEvidencia: 'COMPROBANTE',
          tipo_comprobante: datos.tipo_comprobante || '',
          serie: datos.serie || '',
          numero: datos.numero || '',
          fecha: convertirFecha(datos.fecha) || '',
          hora: datos.hora || '',
          vendedor: datos.vendedor || '',
          producto: '',  // ← NO rellenar con vendedor
          monto: datos.monto ? String(datos.monto) : '',
          igv: datos.igv ? String(datos.igv) : '',
          efectivo: datos.efectivo ? String(datos.efectivo) : '',
          moneda: datos.moneda || 'PEN',
          medio_pago: datos.medio_pago || '',
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error procesando OCR:', err);
      setError('No se pudo procesar la imagen con OCR. Por favor, completa los datos manualmente.');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    onNext({ ...formData, evidencia });
  };

  const handleContinueManual = () => {
    onNext({ evidencia });
  };

  const handleCancel = () => {
    onBack();
  };

  const formatNumber = (val) => {
    if (!val || val === '') return '';
    const num = Number(val);
    return Number.isFinite(num) ? num.toFixed(2) : val;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imagen */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-start justify-center">
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Evidencia del comprobante"
              className="max-w-full h-auto rounded-lg border border-slate-200"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium mb-2">Procesando OCR...</p>
          <p className="text-slate-400 text-sm text-center max-w-md">
            Esto puede tardar unos segundos. 
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-6 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const esTransferencia = tipoEvidenciaDetectado === 'TRANSFERENCIA';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Imagen sticky a la izquierda */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="bg-slate-50 rounded-xl p-4">
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Evidencia del comprobante"
              className="max-w-full h-auto rounded-lg border border-slate-200"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
          <p className="text-xs text-slate-400 text-center mt-3">
            Compara la imagen con los datos extraídos
          </p>
        </div>
      </div>

      {/* Formulario a la derecha */}
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Paso 2: Revisión de Datos
          </h2>
          <p className="text-slate-500">
            Verifica y corrige los datos extraídos del {esTransferencia ? 'comprobante de transferencia' : 'comprobante'}
          </p>
        </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-800 font-medium text-sm mb-2">{error}</p>
            <button
              type="button"
              onClick={handleContinueManual}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-semibold transition"
            >
              Continuar manualmente
            </button>
          </div>
        </div>
      )}

      {ocrData && (
        <div className="flex gap-2 flex-wrap mb-4">
          {ocrData.requiere_revision && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
              <AlertCircle className="w-3 h-3" />
              Requiere revisión
            </span>
          )}
          {ocrData.requiere_confirmacion && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
              <CheckCircle className="w-3 h-3" />
              Requiere confirmación
            </span>
          )}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
        {esTransferencia ? (
          // Formulario de TRANSFERENCIA
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Aplicación / Banco
              </label>
              <input
                type="text"
                name="aplicacion_banco"
                value={formData.aplicacion_banco}
                onChange={handleChange}
                placeholder="Ej: BCP"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Estado
              </label>
              <input
                type="text"
                name="estado_transferencia"
                value={formData.estado_transferencia}
                onChange={handleChange}
                placeholder="Ej: EXITOSA"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Monto
              </label>
              <input
                type="number"
                name="monto"
                value={formatNumber(formData.monto)}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Moneda
              </label>
              <select
                name="moneda"
                value={formData.moneda}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="PEN">PEN - Soles</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Fecha de operación
              </label>
              <SingleDatePicker
                value={formData.fecha_operacion}
                onChange={(val) => setFormData((prev) => ({ ...prev, fecha_operacion: val }))}
                placeholder="Seleccionar fecha"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Hora
              </label>
              <input
                type="time"
                name="hora_operacion"
                value={formData.hora_operacion}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Destinatario
              </label>
              <input
                type="text"
                name="destinatario"
                value={formData.destinatario}
                onChange={handleChange}
                placeholder="Nombre del destinatario"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cuenta destino
              </label>
              <input
                type="text"
                name="cuenta_destino"
                value={formData.cuenta_destino}
                onChange={handleChange}
                placeholder="**** 5010"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cuenta origen
              </label>
              <input
                type="text"
                name="cuenta_origen"
                value={formData.cuenta_origen}
                onChange={handleChange}
                placeholder="**** 4062"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Referencia bancaria
              </label>
              <input
                type="text"
                name="referencia_bancaria"
                value={formData.referencia_bancaria}
                onChange={handleChange}
                placeholder="01406215"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tipo cuenta origen
              </label>
              <input
                type="text"
                name="tipo_cuenta_origen"
                value={formData.tipo_cuenta_origen}
                onChange={handleChange}
                placeholder="Cuentas De Ahorro"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Mensaje
              </label>
              <textarea
                name="mensaje"
                value={formData.mensaje}
                onChange={handleChange}
                placeholder="Mensaje de la transferencia"
                rows="2"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition resize-none"
              />
            </div>
          </div>
        ) : (
          // Formulario de COMPROBANTE
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tipo de comprobante
              </label>
              <select
                name="tipo_comprobante"
                value={formData.tipo_comprobante}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="">Seleccionar...</option>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Serie
              </label>
              <input
                type="text"
                name="serie"
                value={formData.serie}
                onChange={handleChange}
                placeholder="Ej: B001"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Número
              </label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                placeholder="Ej: 0001234"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Fecha
              </label>
              <SingleDatePicker
                value={formData.fecha}
                onChange={(val) => setFormData((prev) => ({ ...prev, fecha: val }))}
                placeholder="Seleccionar fecha"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Hora
              </label>
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Vendedor
              </label>
              <input
                type="text"
                name="vendedor"
                value={formData.vendedor}
                onChange={handleChange}
                placeholder="Nombre del vendedor"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Monto
              </label>
              <input
                type="number"
                name="monto"
                value={formatNumber(formData.monto)}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                IGV
              </label>
              <input
                type="number"
                name="igv"
                value={formatNumber(formData.igv)}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Efectivo
              </label>
              <input
                type="number"
                name="efectivo"
                value={formatNumber(formData.efectivo)}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Moneda
              </label>
              <select
                name="moneda"
                value={formData.moneda}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="PEN">PEN - Soles</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Medio de pago
              </label>
              <select
                name="medio_pago"
                value={formData.medio_pago}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="">Seleccionar...</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="YAPE">Yape</option>
                <option value="BCP">BCP</option>
                <option value="INTERBANK">Interbank</option>
                <option value="BBVA">BBVA</option>
                <option value="SCOTIABANK">Scotiabank</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Producto / Detalle
              </label>
              <input
                type="text"
                name="producto"
                value={formData.producto}
                onChange={handleChange}
                placeholder="Descripción del producto o servicio"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      </div>
    </div>
  );
}
