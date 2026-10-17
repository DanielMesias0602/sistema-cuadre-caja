import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';
import { StepIndicator } from './StepIndicator';
import { Paso1Comprobante } from './Paso1Comprobante';
import { Paso2Pagos } from './Paso2Pagos';
import { Paso3Confirmacion } from './Paso3Confirmacion';

function NuevaOperacionContent() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [datos, setDatos] = useState({
    // Comprobante
    tipo_comprobante: '',
    serie: '',
    numero: '',
    fecha: '',
    hora: '',
    vendedor: '',
    monto: '',
    igv: '',
    efectivo: '',
    moneda: 'PEN',
    medio_pago: '',
    producto: '',
    items: [],

    // Evidencia del comprobante
    evidencia: null,
    previewUrl: null,

    // Pagos (para el Paso 2)
    pagos: [],
  });
  const [success, setSuccess] = useState(false);

  const totalSteps = 3;

  const handlePaso1Change = useCallback((partialData) => {
    setDatos((prev) => ({ ...prev, ...partialData }));
  }, []);

  const handlePaso1Next = useCallback((data) => {
    setDatos((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
  }, []);

  const handlePaso2Change = useCallback((partialData) => {
    setDatos((prev) => ({ ...prev, ...partialData }));
  }, []);

  const handlePaso2Next = useCallback((data) => {
    setDatos((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/cuadrecaja/operaciones');
    }
  }, [currentStep, navigate]);

  const handleSuccess = useCallback(() => {
    setSuccess(true);
    setTimeout(() => {
      navigate('/cuadrecaja/operaciones');
    }, 2000);
  }, [navigate]);

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Operación registrada!</h2>
        <p className="text-slate-500">Redirigiendo a operaciones...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

        {currentStep === 1 && (
          <Paso1Comprobante
            datosIniciales={datos}
            onDataChange={handlePaso1Change}
            onNext={handlePaso1Next}
            onBack={handleBack}
          />
        )}

        {currentStep === 2 && (
          <Paso2Pagos
            comprobante={datos}
            pagosIniciales={datos.pagos}
            onNext={handlePaso2Next}
            onBack={handleBack}
            onPagosChange={handlePaso2Change}
          />
        )}

        {currentStep === 3 && (
          <Paso3Confirmacion
            comprobante={datos}
            pagos={datos.pagos}
            onBack={handleBack}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export { NuevaOperacion };
export default function NuevaOperacion() {
  return <NuevaOperacionContent />;
}
