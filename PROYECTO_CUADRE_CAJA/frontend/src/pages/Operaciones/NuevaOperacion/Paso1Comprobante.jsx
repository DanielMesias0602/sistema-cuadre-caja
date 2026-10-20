import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import ocrService from '../../../services/ocr.service';

export function Paso1Comprobante({ datosIniciales, onDataChange, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ocrData, setOcrData] = useState(null);
  const [modo, setModo] = useState(null); // 'ocr' | 'manual'
  const [imagenPreview, setImagenPreview] = useState(null);
  const urlRef = useRef(null);
  const blobRef = useRef(null);

  const [formData, setFormData] = useState(datosIniciales || {
    tipo_comprobante: '',
    serie: '',
    numero: '',
    fecha: new Date().toLocaleDateString('en-CA'),
    monto: '',
    hora: '',
    vendedor: '',
    cliente: '',
    igv: '',
    op_gravada: '',
    efectivo: '',
    moneda: 'PEN',
    medio_pago: '',
    producto: '',
    items: [],
  });

  useEffect(() => {
    if (datosIniciales) {
      setFormData(datosIniciales);
    }
  }, [datosIniciales]);

  useEffect(() => {
    if (datosIniciales?.evidencia && !imagenPreview) {
      const blob = datosIniciales.evidencia;
      if (blob instanceof Blob) {
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setImagenPreview(url);
        setModo('ocr');
        setOcrData(null);
      }
    }
  }, [datosIniciales?.evidencia, imagenPreview]);

  const convertirFecha = (fecha) => {
    if (!fecha) return '';
    const [dia, mes, anio] = fecha.split('/');
    if (dia && mes && anio) {
      return `${anio}-${mes}-${dia}`;
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
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Error al comprimir imagen'));
            },
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
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const handleChange = (field, value) => {
    const nuevo = { ...formData, [field]: value };
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
    setLoading(true);
    setError(null);

    try {
      const response = await ocrService.procesar(archivo, 'COMPROBANTE');
      const ocrResult = response.data?.data || response.data;
      setOcrData(ocrResult);

      const datos = ocrResult?.datos_extraidos || {};
      
      const nuevo = {
        ...formData,
        tipo_comprobante: datos.tipo_comprobante || '',
        serie: datos.serie || '',
        numero: datos.numero || '',
        fecha: convertirFecha(datos.fecha) || '',
        hora: datos.hora || '',
        vendedor: datos.vendedor || '',
        cliente: datos.cliente || '',
        producto: '',
        monto: datos.monto ? String(datos.monto) : '',
        igv: datos.igv ? String(datos.igv) : '',
        op_gravada: datos.op_gravada ? String(datos.op_gravada) : '',
        efectivo: datos.efectivo ? String(datos.efectivo) : '',
        moneda: datos.moneda || 'PEN',
        medio_pago: datos.medio_pago || '',
        items: datos.items || [],
        evidencia: archivo,
        previewUrl: urlRef.current,
      };
      
      setFormData(nuevo);
      onDataChange(nuevo);
      setLoading(false);
    } catch (err) {
      console.error('Error procesando OCR:', err);
      setError('No se pudo procesar la imagen con OCR. Por favor, completa los datos manualmente.');
      setLoading(false);
    }
  };

  const handleManualMode = () => {
    setModo('manual');
    setImagenPreview(null);
    setOcrData(null);
    blobRef.current = null;
    
    const nuevo = {
      ...formData,
      evidencia: null,
      previewUrl: null,
    };
    setFormData(nuevo);
    onDataChange(nuevo);
  };

  const validarFormulario = () => {
    if (!formData.tipo_comprobante || !formData.serie || !formData.numero || !formData.fecha || !formData.monto) {
      setError('Completa los campos requeridos: Tipo, Serie, Número, Fecha y Monto');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validarFormulario()) return;
    onNext({ comprobante: formData });
  };

  const formatNumber = (val) => {
    if (!val || val === '') return '';
    const num = Number(val);
    return Number.isFinite(num) ? num.toFixed(2) : val;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-4 flex items-start justify-center">
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Comprobante"
              className="max-w-full h-auto rounded-lg border border-slate-200"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium mb-2">Procesando OCR...</p>
          <p className="text-slate-400 text-sm text-center max-w-md">
            Esto puede tardar unos segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda: imagen o selector */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        {modo === null ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">¿Cómo deseas registrar el comprobante?</h3>
            
            <button
              type="button"
              onClick={() => document.getElementById('archivo-input').click()}
              className="w-full p-6 bg-white border-2 border-gray-200 hover:border-brand-orange rounded-xl transition-all hover:shadow-md text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-brand-orange transition-colors">
                  <RefreshCw className="w-6 h-6 text-brand-orange group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Subir foto del comprobante</h4>
                  <p className="text-sm text-slate-500">El OCR extraerá los datos automáticamente</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleManualMode}
              className="w-full p-6 bg-white border-2 border-gray-200 hover:border-brand-orange rounded-xl transition-all hover:shadow-md text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-brand-orange transition-colors">
                  <RefreshCw className="w-6 h-6 text-brand-orange group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Registro manual</h4>
                  <p className="text-sm text-slate-500">Ingresar los datos manualmente</p>
                </div>
              </div>
            </button>

            <input
              id="archivo-input"
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleArchivoSelect(file);
              }}
            />
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4">
            {imagenPreview && (
              <img
                src={imagenPreview}
                alt="Comprobante"
                className="max-w-full h-auto rounded-lg border border-slate-200"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            )}
            <button
              type="button"
              onClick={() => {
                setModo(null);
                setImagenPreview(null);
                setOcrData(null);
                const nuevo = {
                  tipo_comprobante: '',
                  serie: '',
                  numero: '',
                  fecha: new Date().toLocaleDateString('en-CA'),
                  monto: '',
                  hora: '',
                  vendedor: '',
                  cliente: '',
                  igv: '',
                  op_gravada: '',
                  efectivo: '',
                  moneda: 'PEN',
                  medio_pago: '',
                  producto: '',
                  items: [],
                  evidencia: null,
                  previewUrl: null,
                };
                setFormData(nuevo);
                onDataChange(nuevo);
              }}
              className="mt-3 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition"
            >
              Cambiar modo
            </button>
          </div>
        )}
      </div>

      {/* Columna derecha: formulario */}
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Paso 1: Comprobante
          </h2>
          <p className="text-slate-500">
            Registra los datos del comprobante (define el monto total a pagar)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium text-sm">{error}</p>
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

        {formData.items && formData.items.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
              Detalle detectado por el OCR
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-600">CANT.</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-600">DESCRIPCIÓN</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-600">P.UNIT</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-600">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-3 text-slate-900 whitespace-nowrap">{Number(item.cantidad).toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-900 break-words whitespace-normal">{item.descripcion}</td>
                      <td className="py-2 px-3 text-right text-slate-900 whitespace-nowrap">S/ {Number(item.precio_unitario).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-900 whitespace-nowrap">S/ {Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-2 px-3 text-right font-semibold text-slate-600">OP. GRAVADA:</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">S/ {formatNumber(formData.op_gravada)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-2 px-3 text-right font-semibold text-slate-600">IGV:</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">S/ {formatNumber(formData.igv)}</td>
                  </tr>
                  <tr className="bg-slate-100 border-t-2 border-slate-200">
                    <td colSpan={3} className="py-3 px-3 text-right font-bold text-slate-800 text-lg">TOTAL:</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-lg whitespace-nowrap">S/ {formatNumber(formData.monto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tipo de comprobante *
              </label>
              <select
                name="tipo_comprobante"
                value={formData.tipo_comprobante}
                onChange={(e) => handleChange('tipo_comprobante', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="">Seleccionar...</option>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Serie *
              </label>
              <input
                type="text"
                name="serie"
                value={formData.serie}
                onChange={(e) => handleChange('serie', e.target.value)}
                placeholder="Ej: BE02"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Número *
              </label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Ej: 00024034"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
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
                onChange={(e) => handleChange('hora', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cliente
              </label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente || ''}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Nombre del cliente"
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
                onChange={(e) => handleChange('vendedor', e.target.value)}
                placeholder="Nombre del vendedor"
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
                value={formData.igv}
                onChange={(e) => handleChange('igv', e.target.value)}
                onBlur={() => handleChange('igv', formatNumber(formData.igv))}
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
                value={formData.efectivo}
                onChange={(e) => handleChange('efectivo', e.target.value)}
                onBlur={() => handleChange('efectivo', formatNumber(formData.efectivo))}
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
                onChange={(e) => handleChange('moneda', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="PEN">PEN - Soles</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Medio de pago (indicado en comprobante)
              </label>
              <select
                name="medio_pago"
                value={formData.medio_pago}
                onChange={(e) => handleChange('medio_pago', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              >
                <option value="">Seleccionar...</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="CONTADO">Contado</option>
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
                onChange={(e) => handleChange('producto', e.target.value)}
                placeholder="Descripción del producto o servicio"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
          >
            Continuar con los pagos
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}