import { useState, useRef } from 'react';
import { 
  ArrowLeft, UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle, 
  Info, Banknote, Calendar, Hash, Landmark, User, CreditCard, AlertCircle, Clock 
} from 'lucide-react';
import ocrService from '../../../services/ocr.service';

export function Paso3EvidenciaEmpresa({ datosIniciales, pagos = [], onDataChange, onNext, onBack }) {
  const [evidencia, setEvidencia] = useState(datosIniciales.evidenciaEmpresa || null);
  const [preview, setPreview] = useState(datosIniciales.previewEmpresa || null);
  const [loading, setLoading] = useState(false);
  const [ocrData, setOcrData] = useState(datosIniciales.ocrEmpresa || null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const requiereEvidenciaBancaria = pagos.some(pago => {
    const medio = (pago.medio_pago || pago.nombre_medio || '').toLowerCase();
    return !medio.includes('efectivo');
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidencia(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onDataChange({ evidenciaEmpresa: file, previewEmpresa: reader.result });
      };
      reader.readAsDataURL(file);

      setLoading(true);
      setError(null);
      setOcrData(null);

      try {
        const response = await ocrService.procesar(file, 'TRANSFERENCIA');
        const rawData = response.data?.data || response.data;
        const datosExtraidos = rawData?.datos_extraidos || rawData;
        setOcrData(datosExtraidos);
        
        onDataChange({ 
          evidenciaEmpresa: file, 
          previewEmpresa: reader.result,
          ocrEmpresa: datosExtraidos
        });
      } catch (err) {
        console.error('Error procesando OCR:', err);
        setError('No se pudo procesar la imagen con OCR. La evidencia se guardará sin datos extraídos.');
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = () => {
    setEvidencia(null);
    setPreview(null);
    setOcrData(null);
    onDataChange({ evidenciaEmpresa: null, previewEmpresa: null, ocrEmpresa: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNext = () => {
    onNext({ evidenciaEmpresa: evidencia, previewEmpresa: preview, ocrEmpresa: ocrData });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Paso 3: Evidencia de la Empresa</h2>
        <p className="text-slate-500">
          {requiereEvidenciaBancaria 
            ? "Sube la captura del movimiento bancario donde se confirma el ingreso a la cuenta."
            : "Esta operación es en efectivo. No se requiere captura bancaria."}
        </p>
      </div>

      {!requiereEvidenciaBancaria && !preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-2xl mx-auto flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            El dinero en efectivo se verificará al momento del <strong>Cierre de Caja</strong>. Puedes continuar sin subir una imagen.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-2xl mx-auto flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* DISEÑO PREMIUM DE DATOS OCR */}
      {ocrData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Datos extraídos por OCR</h3>
              <p className="text-xs text-slate-500 font-medium">Verifica que coincidan con la captura</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Monto */}
            {ocrData.monto && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Monto</span>
                </div>
                <p className="text-lg font-black text-slate-900">
                  S/ {Number(ocrData.monto).toFixed(2)}
                </p>
              </div>
            )}

            {/* Fecha */}
            {ocrData.fecha_operacion && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Fecha Operación</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.fecha_operacion}
                </p>
              </div>
            )}

            {/* Referencia */}
            {(ocrData.referencia_bancaria || ocrData.numero_operacion) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-4 h-4 text-purple-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">N° Operación</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.referencia_bancaria || ocrData.numero_operacion}
                </p>
              </div>
            )}

            {/* Banco */}
            {(ocrData.aplicacion_banco || ocrData.banco) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Landmark className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Banco / Aplicación</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.aplicacion_banco || ocrData.banco}
                </p>
              </div>
            )}

            {/* Destinatario */}
            {ocrData.destinatario && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Beneficiario</span>
                </div>
                <p className="text-sm font-bold text-slate-900 line-clamp-2" title={ocrData.destinatario}>
                  {ocrData.destinatario}
                </p>
              </div>
            )}

            {/* Cuenta */}
            {ocrData.cuenta_destino && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cuenta Destino</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.cuenta_destino}
                </p>
              </div>
            )}

            {/* Hora */}
            {ocrData.hora_operacion && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Hora Operación</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.hora_operacion}
                </p>
              </div>
            )}

            {/* Estado */}
            {ocrData.estado_transferencia && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Estado</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {ocrData.estado_transferencia}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-orange animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Procesando OCR...</p>
          </div>
        ) : !preview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              requiereEvidenciaBancaria ? 'border-slate-300 hover:bg-slate-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="font-semibold text-slate-700">
              {requiereEvidenciaBancaria ? 'Haz clic para subir la captura del banco' : 'Subir captura (Opcional)'}
            </p>
            <p className="text-sm text-slate-400 mt-1">PNG, JPG o JPEG (Máx. 10MB)</p>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Imagen cargada correctamente</span>
            </div>
            <img 
              src={preview} 
              alt="Evidencia Empresa" 
              className="w-full max-h-96 object-contain rounded-lg border border-slate-200 bg-slate-50"
            />
            <button 
              onClick={removeImage}
              className="absolute top-14 right-2 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
      </div>

      <div className="flex justify-between max-w-2xl mx-auto mt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" /> Atrás
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={(requiereEvidenciaBancaria && !evidencia) || loading}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md disabled:opacity-50"
        >
          Continuar <ArrowLeft className="w-5 h-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}