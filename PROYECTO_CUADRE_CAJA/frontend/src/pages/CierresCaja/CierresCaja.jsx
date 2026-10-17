import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { Store } from 'lucide-react';

export function CierresCaja() {
  return (
    <PlaceholderPage
      titulo="Cierres de Caja"
      descripcion="Gestiona los cierres de caja diarios y reportes de turno."
      icono={Store}
    />
  );
}

export default CierresCaja;
