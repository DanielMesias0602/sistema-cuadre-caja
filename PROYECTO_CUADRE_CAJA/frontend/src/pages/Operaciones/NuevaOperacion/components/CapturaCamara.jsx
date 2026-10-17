import { useState, useRef, useEffect } from 'react';
import { Camera, X, Check } from 'lucide-react';

export function CapturaCamara({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      console.error('Error accessing camera:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedImage(blob);
          onCapture(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium mb-3">{error}</p>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-semibold transition"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        {capturedImage ? (
          <img
            src={URL.createObjectURL(capturedImage)}
            alt="Captura"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex justify-center gap-3">
        {capturedImage ? (
          <>
            <button
              type="button"
              onClick={retakePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
            >
              <X className="w-5 h-5" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => onCapture(capturedImage)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition"
            >
              <Check className="w-5 h-5" />
              Confirmar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition"
            >
              <X className="w-5 h-5" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
            >
              <Camera className="w-5 h-5" />
              Capturar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
