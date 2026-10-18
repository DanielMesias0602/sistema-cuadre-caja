import { useState } from 'react';
import { 
  Trash2, UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle, 
  Info, Banknote, Calendar, Hash, User, Building2, CreditCard, Check, AlertCircle 
} from 'lucide-react';
import ocrService from '../../../../services/ocr.service';

export default function PagoCard({ index, pago, medios, onPagoChange, onEliminar, puedeEliminar }) {
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [preview, setPreview] = useState(pago.evidencia?.imagenBase64 || null);
  const [error, setError] = useState(null);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-4">
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
        
        {/* 🔥 AQUÍ ESTÁ LA LÓGICA RESTAURADA: Solo si NO es efectivo */}
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
        
        {/* Si es efectivo, Observación ocupa todo el ancho para no dejar hueco */}
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
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Si NO hay evidencia real (imagenBase64) */}
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
                  <p className="text-sm text-slate-600 font-medium">Haz clic para subir la evidencia del cliente</p>
                </>
              )}
            </div>
          )}

          {/* Si HAY evidencia (imagenBase64) pero NO está confirmada */}
          {pago.evidencia?.imagenBase64 && !pago.evidencia.confirmada && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex gap-4 items-start">
                {preview && (
                  <img src={preview} alt="Evidencia" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 mb-1">Evidencia cargada</p>
                      <p className="text-xs text-slate-500">Revisa los datos extraídos antes de confirmar.</p>
                    </div>
                    <button onClick={descartarEvidencia} className="text-slate-400 hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
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

              {/* DISEÑO PREMIUM DE DATOS OCR (Sin confirmar) */}
              {pago.evidencia.datosOCR && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Datos detectados en la imagen:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Monto</p>
                      </div>
                      <p className="font-bold text-slate-900">S/ {Number(pago.evidencia.datosOCR.monto || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Fecha</p>
                      </div>
                      <p className="font-bold text-slate-900">{pago.evidencia.datosOCR.fecha_operacion || '---'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Hash className="w-3.5 h-3.5 text-purple-500" />
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Referencia</p>
                      </div>
                      <p className="font-bold text-slate-900">{pago.evidencia.datosOCR.referencia_bancaria || pago.evidencia.datosOCR.numero_operacion || '---'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Si la evidencia YA ESTÁ CONFIRMADA */}
          {pago.evidencia?.imagenBase64 && pago.evidencia?.confirmada && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-bold text-green-900 text-sm">Evidencia confirmada (Cliente)</p>
                <button onClick={descartarEvidencia} className="ml-auto text-xs text-green-700 hover:underline font-medium">
                  Cambiar imagen
                </button>
              </div>
              
              {pago.evidencia.datosOCR && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Monto</p>
                    <p className="font-bold text-slate-900">S/ {Number(pago.evidencia.datosOCR.monto || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Banco / App</p>
                    <p className="font-bold text-slate-900">{pago.evidencia.datosOCR.aplicacion_banco || '---'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Referencia</p>
                    <p className="font-bold text-slate-900">{pago.evidencia.datosOCR.referencia_bancaria || '---'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}