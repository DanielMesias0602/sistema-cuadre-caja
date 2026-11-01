import api from '../lib/api';

export const ocrService = {
  procesar: (archivo, tipoEvidencia = 'COMPROBANTE', { signal } = {}) => {
    const formData = new FormData();

    // Detectar extensión correcta. Si viene del canvas es JPEG,
    // si es PDF se mantiene PDF.
    const esPDF = archivo.type === 'application/pdf';
    const nombreArchivo = esPDF ? 'evidencia.pdf' : 'evidencia.jpg';

    formData.append('archivo', archivo, nombreArchivo);
    formData.append('tipoEvidencia', tipoEvidencia);

    return api.post('/ocr/procesar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      signal,
    });
  },
};

export default ocrService;