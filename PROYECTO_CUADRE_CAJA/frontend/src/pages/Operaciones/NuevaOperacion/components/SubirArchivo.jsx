import { useState, useRef } from 'react';
import { Upload, X, FileImage, FileText } from 'lucide-react';
import { notifyToast } from '../../../../components/ui/toastEvents';

export function SubirArchivo({ onFileSelect, onCancel }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      notifyToast('Solo se permiten archivos JPG, PNG, WebP y PDF.', 'error');
      return;
    }

    if (file.size > maxSize) {
      notifyToast('El archivo no puede superar los 10 MB.', 'error');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-brand-orange bg-orange-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleChange}
        />
        
        {selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
              {selectedFile.type.startsWith('image/') ? (
                <FileImage className="w-8 h-8 text-brand-orange" />
              ) : (
                <FileText className="w-8 h-8 text-brand-orange" />
              )}
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-700 font-medium mb-1">
                Arrastra un archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-gray-500 text-sm">
                JPG, PNG, WebP o PDF (máx. 10MB)
              </p>
            </div>
            <button
              type="button"
              onClick={onButtonClick}
              className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
            >
              Seleccionar archivo
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
