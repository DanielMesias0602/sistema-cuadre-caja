import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { CreditCard } from 'lucide-react';

export function Pagos() {
  return (
    <PlaceholderPage
      titulo="Pagos"
      descripcion="Consulta y gestiona los pagos registrados en el sistema."
      icono={CreditCard}
    />
  );
}

export default Pagos;
