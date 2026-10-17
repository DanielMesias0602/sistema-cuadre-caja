import { Construction } from 'lucide-react';

export function PlaceholderPage({ titulo, descripcion, icono: Icon = Construction }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-brand-orange" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{titulo}</h1>
        <p className="text-slate-500 text-center max-w-md mb-4">{descripcion}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100">
          <Construction className="w-4 h-4" />
          <span>Esta sección estará disponible en la siguiente fase del proyecto</span>
        </div>
      </div>
    </div>
  );
}

export default PlaceholderPage;
