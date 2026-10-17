import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { ArrowUpRight } from 'lucide-react';

export function SalidasCaja() {
  return (
    <PlaceholderPage
      titulo="Salidas de Caja"
      descripcion="Registra y gestiona las salidas de dinero de caja."
      icono={ArrowUpRight}
    />
  );
}

export default SalidasCaja;
