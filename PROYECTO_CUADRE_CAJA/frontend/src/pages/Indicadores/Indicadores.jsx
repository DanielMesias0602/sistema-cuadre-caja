import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { RefreshCw, FileText, CheckCircle, Clock, TrendingUp, ShieldCheck, Target } from 'lucide-react';

export function Indicadores() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [indicadores, setIndicadores] = useState({
    operacionesRegistradas: 0,
    porcentajeEvidencia: 0,
    tiempoCierre: '0 min',
    pagosCorregidos: 0
  });

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reportes/dashboard');
      const data = res.data?.data || res.data;
      setIndicadores({
        operacionesRegistradas: data?.operaciones_registradas || 0,
        porcentajeEvidencia: data?.porcentaje_evidencia || 0,
        tiempoCierre: data?.tiempo_cierre || '0 min',
        pagosCorregidos: data?.pagos_corregidos || 0
      });
    } catch (err) {
      console.error('Error al cargar indicadores:', err);
      setError('No hay datos disponibles');
      setIndicadores({
        operacionesRegistradas: 0,
        porcentajeEvidencia: 0,
        tiempoCierre: '0 min',
        pagosCorregidos: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 ring-blue-600/10',
      emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
      amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
      violet: 'bg-violet-50 text-violet-600 ring-violet-600/10',
    };
    return colors[color] || colors.blue;
  };

  const indicadoresCards = [
    { id: 1, titulo: 'Operaciones Registradas', valor: indicadores.operacionesRegistradas, icono: FileText, color: 'blue', subtitulo: 'Últimos 30 días' },
    { id: 2, titulo: '% con Evidencia', valor: `${indicadores.porcentajeEvidencia}%`, icono: CheckCircle, color: 'emerald', subtitulo: 'De operaciones totales' },
    { id: 3, titulo: 'Tiempo de Cierre', valor: indicadores.tiempoCierre, icono: Clock, color: 'amber', subtitulo: 'Promedio diario' },
    { id: 4, titulo: 'Pagos Corregidos', valor: indicadores.pagosCorregidos, icono: ShieldCheck, color: 'violet', subtitulo: 'Este mes' },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Indicadores del Sistema
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Métricas clave para monitorear el rendimiento del sistema de cuadre de caja.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando indicadores...</p>
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
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {indicadoresCards.map((indicador) => {
              const Icon = indicador.icono;
              const colorClasses = getColorClasses(indicador.color);
              return (
                <div key={indicador.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${colorClasses} ring-1`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <Target className="h-5 w-5 text-slate-300" />
                  </div>

                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {indicador.titulo}
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-900 tabular-nums">
                    {indicador.valor}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {indicador.subtitulo}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Tendencia de Operaciones</h3>
              <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Gráfico de tendencia (Próximamente)</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Distribución por Medio de Pago</h3>
              <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Gráfico de distribución (Próximamente)</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Indicadores;
