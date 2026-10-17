import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { Shield } from 'lucide-react';

export function RolesPermisos() {
  return (
    <PlaceholderPage
      titulo="Roles y Permisos"
      descripcion="Configura los roles y permisos de los usuarios."
      icono={Shield}
    />
  );
}

export default RolesPermisos;
