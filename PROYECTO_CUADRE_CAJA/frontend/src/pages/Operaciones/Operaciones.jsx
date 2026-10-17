import { useNavigate } from 'react-router-dom';
import { PlaceholderPage } from '../Placeholder/PlaceholderPage';
import { Receipt, Plus } from 'lucide-react';

export function Operaciones() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/operaciones/nueva')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-sm transition shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Nueva operación</span>
        </button>
      </div>
      <PlaceholderPage
        titulo="Operaciones"
        descripcion="Gestiona y consulta todas las operaciones registradas en el sistema."
        icono={Receipt}
      />
    </div>
  );
}

export default Operaciones;
