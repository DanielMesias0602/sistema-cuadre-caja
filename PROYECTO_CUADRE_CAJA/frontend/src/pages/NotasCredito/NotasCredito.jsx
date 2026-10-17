import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { FileX } from 'lucide-react';

export function NotasCredito() {
  return (
    <PlaceholderPage
      titulo="Notas de Crédito"
      descripcion="Gestiona las notas de crédito emitidas en el sistema."
      icono={FileX}
    />
  );
}

export default NotasCredito;
