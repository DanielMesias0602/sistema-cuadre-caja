import { useState } from 'react';
import { Camera, Upload, FileEdit, ArrowRight } from 'lucide-react';
import { CapturaCamara } from './components/CapturaCamara';
import { SubirArchivo } from './components/SubirArchivo';

export function Paso1Evidencia({ onNext, onSkipToManual }) {
  const [mode, setMode] = useState(null); // 'camera', 'upload', 'manual'
  const [evidencia, setEvidencia] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('COMPROBANTE'); // 'COMPROBANTE' | 'TRANSFERENCIA'

  const handleCapture = (blob) => {
    setEvidencia(blob);
    onNext({ evidencia: blob, tipo: tipoDocumento });
  };

  const handleFileSelect = (file) => {
    setEvidencia(file);
    onNext({ evidencia: file, tipo: tipoDocumento });
  };

  const handleManual = () => {
    onSkipToManual();
  };

  if (mode === 'camera') {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Capturar con cámara</h3>
        <CapturaCamara
          onCapture={handleCapture}
          onCancel={() => setMode(null)}
        />
      </div>
    );
  }

  if (mode === 'upload') {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Subir archivo</h3>
        <SubirArchivo
          onFileSelect={handleFileSelect}
          onCancel={() => setMode(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Paso 1: Captura de Evidencia
        </h2>
        <p className="text-slate-500">
          Selecciona cómo deseas capturar la evidencia del comprobante
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-4 bg-surface-container-lowest rounded-xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">Tipo de documento:</label>
          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none transition text-sm"
          >
            <option value="COMPROBANTE">Comprobante (Boleta/Factura)</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setMode('camera')}
          className="group p-6 bg-white border-2 border-gray-200 hover:border-brand-orange rounded-xl transition-all hover:shadow-md text-left"
        >
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-brand-orange transition-colors">
            <Camera className="w-6 h-6 text-brand-orange group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Cámara en vivo</h3>
          <p className="text-sm text-slate-500">
            Usa la cámara de tu dispositivo para capturar el comprobante
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode('upload')}
          className="group p-6 bg-white border-2 border-gray-200 hover:border-brand-orange rounded-xl transition-all hover:shadow-md text-left"
        >
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-brand-orange transition-colors">
            <Upload className="w-6 h-6 text-brand-orange group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Subir archivo</h3>
          <p className="text-sm text-slate-500">
            Sube una imagen o PDF desde tu dispositivo
          </p>
        </button>

        <button
          type="button"
          onClick={handleManual}
          className="group p-6 bg-white border-2 border-gray-200 hover:border-brand-orange rounded-xl transition-all hover:shadow-md text-left"
        >
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-brand-orange transition-colors">
            <FileEdit className="w-6 h-6 text-brand-orange group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Registro manual</h3>
          <p className="text-sm text-slate-500">
            Registrar operación sin evidencia adjunta
          </p>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleManual}
          className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
        >
          <span>Continuar sin evidencia</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
