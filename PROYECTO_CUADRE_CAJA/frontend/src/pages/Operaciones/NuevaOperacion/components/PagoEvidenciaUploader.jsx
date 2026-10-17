import { useState, useRef, useEffect } from 'react';
import { Check, X, Upload, Loader2 } from 'lucide-react';
import ocrService from '../../../../services/ocr.service';

export function PagoEvidenciaUploader({ pago, onPagoChange }) {
  // Estados de UI EFÍMEROS (permitidos)
  const [origen, setOrigen] = useState('CLIENTE');
  const [procesando, setProcesando] = useState(false);
  const [datosOCR, setDatosOCR] = useState(null); // revisión temporal antes de confirmar
  const [blobTemporal, setBlobTemporal] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const urlRef = useRef(null);

  // Cleanup del objectUrl al desmontar
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const handleSeleccionarArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setPreviewUrl(urlRef.current);
    setBlobTemporal(file);

    setProcesando(true);
    setError(null);

    try {
      const response = await ocrService.procesar(file, 'TRANSFERENCIA');
      
      const datos = response?.data?.data?.datos_extraidos
                 || response?.data?.datos_extraidos
                 || response?.datos_extraidos
                 || {};
      setDatosOCR(datos);
    } catch (err) {
      console.error('Error OCR:', err);
      setError('No se pudo procesar el OCR. Podés confirmar manualmente o descartar.');
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!datosOCR && !blobTemporal) return;

    const montoOCR = Number(datosOCR?.monto) || 0;
    const montoActual = Number(pago.monto) || 0;

    // Convertir el blob a base64 para persistencia
    let imagenBase64 = null;
    if (blobTemporal) {
      imagenBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blobTemporal);
      });
    }

    onPagoChange({
      ...pago,
      monto: montoActual === 0 && montoOCR > 0 ? String(montoOCR) : pago.monto,
      referencia: datosOCR?.referencia_bancaria || pago.referencia || '',
      evidencia: {
        blob: blobTemporal, // se mantiene por si se necesita subir a OCI
        imagenBase64, // string base64 persistente
        previewUrl: imagenBase64, // el preview usa el base64
        datosOCR,
        origen,
        confirmada: true,
      },
    });

    // Limpiar estado de revisión (pero NO el del padre)
    setDatosOCR(null);
    setBlobTemporal(null);
    // Revocar el objectUrl temporal si existe
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const handleDescartar = () => {
    setDatosOCR(null);
    setBlobTemporal(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const sugerirMedio = (datos) => {
    const banco = (datos?.aplicacion_banco || '').toUpperCase();
    if (banco.includes('BCP')) return 'Transferencia BCP';
    if (banco.includes('BBVA')) return 'Transferencia BBVA';
    if (banco.includes('YAPE')) return 'Yape BCP o Yape BBVA';
    return 'Verificá el destino manualmente';
  };

  const validarDestino = (destinatario) => {
    if (!destinatario) return null;
    const palabrasClave = ['Distribuidora', 'Ceramica', 'Acabados', 'FINITO'];
    const contienePalabraClave = palabrasClave.some(palabra =>
      destinatario.toUpperCase().includes(palabra.toUpperCase())
    );
    return contienePalabraClave ? 'correcto' : 'advertencia';
  };

  // Si ya hay evidencia confirmada, mostrar thumbnail
  if (pago.evidencia?.confirmada) {
    const datosDestino = pago.evidencia?.datosOCR || {};
    const validacionDestino = validarDestino(datosDestino.destinatario);

    return (
      <div className="space-y-3">
        {/* Card DESTINO */}
        {(datosDestino.aplicacion_banco || datosDestino.destinatario || datosDestino.cuenta_destino) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 uppercase font-semibold mb-2">
              DESTINO (validar que sea cuenta de la empresa)
            </p>
            <div className="space-y-1 text-sm">
              {datosDestino.aplicacion_banco && (
                <p>
                  <span className="text-blue-600">Banco:</span>{' '}
                  <span className="font-semibold">{datosDestino.aplicacion_banco}</span>
                </p>
              )}
              {datosDestino.destinatario && (
                <p>
                  <span className="text-blue-600">Beneficiario:</span>{' '}
                  <span className="font-semibold">{datosDestino.destinatario}</span>
                </p>
              )}
              {datosDestino.cuenta_destino && (
                <p>
                  <span className="text-blue-600">Cuenta:</span>{' '}
                  <span className="font-semibold">{datosDestino.cuenta_destino}</span>
                </p>
              )}
            </div>
            {validacionDestino && (
              <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                validacionDestino === 'correcto'
                  ? 'text-green-700 bg-green-100 px-2 py-1 rounded'
                  : 'text-amber-700 bg-amber-100 px-2 py-1 rounded'
              }`}>
                {validacionDestino === 'correcto' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Destino parece correcto
                  </>
                ) : (
                  <>
                    ⚠ Verificá que el destino sea de la empresa
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail de evidencia */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            {pago.evidencia?.imagenBase64 && (
              <img
                src={pago.evidencia.imagenBase64}
                alt="evidencia"
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1">
                <Check className="w-4 h-4" /> Evidencia confirmada
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Origen: {pago.evidencia.origen}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onPagoChange({ ...pago, evidencia: null })}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Quitar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Uploader inicial o panel de revisión
  return (
    <div className="space-y-3">
      {/* Selector Origen */}
      <div>
        <label className="block text-sm font-semibold mb-1.5">
          Origen de la evidencia:
        </label>
        <div className="flex gap-4">
          {['CLIENTE', 'EMPRESA'].map(op => (
            <label key={op} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`origen-${pago.id}`}
                value={op}
                checked={origen === op}
                onChange={(e) => setOrigen(e.target.value)}
              />
              {op === 'CLIENTE' ? 'Cliente' : 'Empresa'}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Indica quién proporcionó esta evidencia. Ambas son necesarias
          para verificar que el pago llegó a la empresa.
        </p>
      </div>

      {/* Uploader */}
      {!datosOCR && !previewUrl && (
        <label className="inline-flex items-center gap-2 px-4 py-2
                          bg-blue-50 border border-blue-200 rounded-lg
                          text-blue-700 text-sm font-medium cursor-pointer
                          hover:bg-blue-100 transition-colors">
          <Upload className="w-4 h-4" />
          Subir evidencia del pago
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleSeleccionarArchivo}
            className="hidden"
          />
        </label>
      )}

      {/* Loading */}
      {procesando && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4
                        flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-blue-800">
            Procesando OCR... Esto puede tardar unos segundos.
          </span>
        </div>
      )}

      {/* Panel de revisión */}
      {datosOCR && !procesando && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-900 text-sm">
              Datos extraídos
            </span>
          </div>

          {/* DESTINO destacado */}
          {(datosOCR.aplicacion_banco || datosOCR.destinatario || datosOCR.cuenta_destino) && (
            <div className="bg-white rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Destino (a dónde llegó el dinero)
              </p>
              {datosOCR.aplicacion_banco && (
                <p className="text-sm">
                  <span className="text-gray-500">Banco: </span>
                  <span className="font-semibold">{datosOCR.aplicacion_banco}</span>
                </p>
              )}
              {datosOCR.destinatario && (
                <p className="text-sm">
                  <span className="text-gray-500">Beneficiario: </span>
                  <span className="font-semibold">{datosOCR.destinatario}</span>
                </p>
              )}
              {datosOCR.cuenta_destino && (
                <p className="text-sm">
                  <span className="text-gray-500">Cuenta: </span>
                  <span className="font-semibold">{datosOCR.cuenta_destino}</span>
                </p>
              )}
            </div>
          )}

          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Monto</p>
              <p className="font-semibold">S/ {datosOCR.monto || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p className="font-semibold">
                {datosOCR.fecha_operacion || datosOCR.fecha || '—'}
                {datosOCR.hora_operacion ? ` ${datosOCR.hora_operacion}` : ''}
              </p>
            </div>
            {datosOCR.referencia_bancaria && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Referencia</p>
                <p className="font-mono font-semibold">
                  {datosOCR.referencia_bancaria}
                </p>
              </div>
            )}
          </div>

          {/* Sugerencia */}
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
            💡 Por el destino, el medio podría ser: {sugerirMedio(datosOCR)}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfirmar}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500
                         hover:bg-green-600 text-white rounded-lg text-sm font-medium"
            >
              <Check className="w-4 h-4" /> Confirmar
            </button>
            <button
              type="button"
              onClick={handleDescartar}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-200
                         hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
            >
              <X className="w-4 h-4" /> Descartar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}

export default PagoEvidenciaUploader;
