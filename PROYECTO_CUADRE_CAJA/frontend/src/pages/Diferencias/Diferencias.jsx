import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Calendar, TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react';

export function Diferencias() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diferencias, setDiferencias] = useState([]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reportes/diferencias');
      const data = res.data?.data || res.data;
      setDiferencias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar diferencias:', err);
      setError('No hay datos disponibles');
      setDiferencias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const renderDiferenciaBadge = (diferencia) => {
    if (diferencia === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
          {formatCurrency(diferencia)}
        </span>
      );
    }
    if (diferencia < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
          <TrendingDown className="h-3 w-3" />
          {formatCurrency(diferencia)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
        <TrendingUp className="h-3 w-3" />
        {formatCurrency(diferencia)}
      </span>
    );
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Reporte de Diferencias
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500">
            Visualiza las diferencias detectadas entre el efectivo esperado y el físico.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por fecha..."
              className="h-10 sm:h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-10 sm:h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div>
            <select className="h-10 sm:h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 sm:px-4 text-xs sm:text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer">
              <option value="">Todos los turnos</option>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA / CARDS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700">Cargando diferencias...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
          <p className="text-xs sm:text-sm font-semibold text-rose-600">{error}</p>
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
          {/* MOBILE: cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {diferencias.length > 0 ? diferencias.map((diferencia) => (
              <div key={diferencia.id_diferencia} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{diferencia.fecha}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 mt-1 text-[10px] font-semibold text-slate-800">
                      {diferencia.turno}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Diferencia</p>
                    <div className="mt-0.5">{renderDiferenciaBadge(diferencia.diferencia)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Efec. Esperado</p>
                    <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(diferencia.efectivo_esperado)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Efec. Físico</p>
                    <p className="font-bold text-slate-900 tabular-nums">{formatCurrency(diferencia.efectivo_fisico)}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                No hay diferencias registradas
              </div>
            )}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Turno</th>
                  <th className="p-4 text-right">Efectivo Esperado</th>
                  <th className="p-4 text-right">Efectivo Físico</th>
                  <th className="p-4 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {diferencias.length > 0 ? diferencias.map((diferencia) => (
                  <tr key={diferencia.id_diferencia} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{diferencia.fecha}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-800">
                        {diferencia.turno}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(diferencia.efectivo_esperado)}</td>
                    <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(diferencia.efectivo_fisico)}</td>
                    <td className="p-4 text-right">{renderDiferenciaBadge(diferencia.diferencia)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No hay diferencias registradas
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

export default Diferencias;