import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Plus, Calendar, ArrowDownRight, RefreshCw, Search, Wallet } from 'lucide-react';

export function SalidasCaja() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salidas, setSalidas] = useState([]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/salidas-caja');
      const data = res.data?.data || res.data;
      setSalidas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar salidas de caja:', err);
      setError('No hay datos disponibles');
      setSalidas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Salidas de Caja
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Registra y gestiona todas las salidas de dinero de la caja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white shadow-sm shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Salida</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por motivo..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <select className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer">
              <option value="">Todos los tipos</option>
              <option value="Gastos Operativos">Gastos Operativos</option>
              <option value="Pago a Proveedores">Pago a Proveedores</option>
              <option value="Retiro de Caja">Retiro de Caja</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando salidas de caja...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={cargarDatos}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Tipo de Salida</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {salidas.length > 0 ? salidas.map((salida) => (
                  <tr key={salida.id_salida} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{salida.fecha}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1 font-semibold text-rose-700">
                        <ArrowDownRight className="h-4 w-4" />
                        {salida.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">{salida.motivo}</td>
                    <td className="p-4 text-right font-bold text-rose-600 tabular-nums">{formatCurrency(salida.monto)}</td>
                    <td className="p-4 text-slate-600">{salida.usuario}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No hay salidas de caja registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalidasCaja;
