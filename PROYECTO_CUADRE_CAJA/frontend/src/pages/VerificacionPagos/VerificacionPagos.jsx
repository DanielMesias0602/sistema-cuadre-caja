import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { CheckCircle } from 'lucide-react';

export function VerificacionPagos() {
  return (
    <PlaceholderPage
      titulo="Verificación de Pagos"
      descripcion="Verifica y confirma los pagos realizados en el sistema."
      icono={CheckCircle}
    />
  );
}

export default VerificacionPagos;
