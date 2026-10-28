import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  RefreshCw, DollarSign, Receipt, XCircle, TrendingUp, Banknote, Wallet,
  CreditCard, Smartphone, AlertTriangle, CheckCircle, TrendingDown, FileText,
  ShieldCheck, Link2, Sun, Moon, FileMinus, User, Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// TOOLTIP PERSONALIZADO CON FONDO OSCURO
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 p-3 rounded-xl shadow-xl text-xs sm:text-sm z-50 dark:shadow-none">
        <p className="font-bold text-white mb-1.5">{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-semibold flex items-center justify-between gap-4" style={{ color: entry.color || '#fff' }}>
            <span>{entry.name}:</span>
            <span>{entry.name === 'Operaciones' ? entry.value : `S/ ${Number(entry.value).toFixed(2)}`}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// FUNCIÓN PARA POSICIONAR LOS PORCENTAJES EN EL CENTRO DE LA DONA
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central" 
      fontSize={12} 
      fontWeight="bold"
      style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function Indicadores() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});
  const [datosMedios, setDatosMedios] = useState([]);
  const [datosTendencia, setDatosTendencia] = useState([]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  async function cargarDatos() {
    try {
      const [resInd, resMedios, resOps] = await Promise.all([
        api.get('/reportes/indicadores'),
        api.get('/reportes/pagos-por-medio'),
        api.get('/reportes/operaciones')
      ]);

      setData(resInd.data?.data || resInd.data || {});

      const medios = resMedios.data?.data || resMedios.data || [];
      setDatosMedios(medios.map(m => ({ name: m.medio_pago, value: Number(m.total_monto) })));

      const opsList = resOps.data?.data || resOps.data || [];
      const agrupado = opsList.reduce((acc, op) => {
        const fecha = op.fecha;
        if (!acc[fecha]) acc[fecha] = { fecha, cantidad: 0 };
        acc[fecha].cantidad += 1;
        return acc;
      }, {});
      const tendencia = Object.values(agrupado).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(-7);
      setDatosTendencia(tendencia);
      setError(null);

    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar los indicadores.');
    } finally {
      setLoading(false);
    }
  }

  const recargarDatos = () => {
    setLoading(true);
    setError(null);
    return cargarDatos();
  };

  useEffect(() => { void Promise.resolve().then(cargarDatos); }, []);

  const COLORS = ['#ea580c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  const totalOps = Number(data.operaciones_registradas || 0);
  const opsConEvidencia = Number(data.ops_con_evidencia || 0);
  const opsVerificadas = Number(data.ops_verificadas || 0);
  const cierresConDif = Number(data.cierres_con_diferencia || 0);
  const totalCierres = Number(data.total_cierres || 0);

  const porcentajeEvidencia = totalOps > 0 ? ((opsConEvidencia / totalOps) * 100).toFixed(1) : '0.0';
  const porcentajeVerificadas = totalOps > 0 ? ((opsVerificadas / totalOps) * 100).toFixed(1) : '0.0';
  const porcentajeCierresConDif = totalCierres > 0 ? ((cierresConDif / totalCierres) * 100).toFixed(1) : '0.0';

  const categorias = [
    {
      titulo: 'Ventas y Operaciones',
      icono: TrendingUp,
      color: 'blue',
      items: [
        { titulo: 'Ventas Totales', valor: formatCurrency(data.ventas_totales), icono: DollarSign },
        { titulo: 'Operaciones Registradas', valor: data.operaciones_registradas || 0, icono: Receipt },
        { titulo: 'Operaciones Anuladas', valor: data.operaciones_anuladas || 0, icono: XCircle, color: 'rose' },
        { titulo: 'Ticket Promedio', valor: formatCurrency(data.ticket_promedio), icono: TrendingUp },
      ]
    },
    {
      titulo: 'Medios de Pago',
      icono: Wallet,
      color: 'emerald',
      items: [
        { titulo: 'Total Efectivo', valor: formatCurrency(data.monto_efectivo), icono: Banknote },
        { titulo: 'Total Virtual', valor: formatCurrency(data.monto_virtual), icono: Wallet },
        { titulo: 'Total Tarjeta', valor: formatCurrency(data.monto_tarjeta), icono: CreditCard },
        { titulo: 'Yape / Transferencia', valor: formatCurrency(data.monto_yape_transf), icono: Smartphone },
      ]
    },
    {
      titulo: 'Control de Caja',
      icono: AlertTriangle,
      color: 'amber',
      items: [
        { titulo: 'Diferencia Acumulada', valor: formatCurrency(data.diferencia_acumulada), icono: TrendingDown },
        { titulo: 'Cierres con Diferencia', valor: data.cierres_con_diferencia || 0, icono: AlertTriangle },
        { titulo: '% Cierres con Diferencia', valor: `${porcentajeCierresConDif}%`, icono: CheckCircle },
        { titulo: 'Total Salidas', valor: formatCurrency(data.total_salidas), icono: FileText },
      ]
    },
    {
      titulo: 'Calidad y Trazabilidad',
      icono: ShieldCheck,
      color: 'violet',
      items: [
        { titulo: '% con Evidencia', valor: `${porcentajeEvidencia}%`, icono: CheckCircle },
        { titulo: '% Operaciones Verificadas', valor: `${porcentajeVerificadas}%`, icono: ShieldCheck },
        { titulo: 'Pagos Corregidos', valor: data.pagos_corregidos || 0, icono: FileText },
        { titulo: 'Pagos con Referencia', valor: data.pagos_con_referencia || 0, icono: Link2 },
      ]
    },
    {
      titulo: 'Operativas',
      icono: Target,
      color: 'sky',
      items: [
        { titulo: 'Ventas Turno Mañana', valor: data.ops_manana || 0, icono: Sun },
        { titulo: 'Ventas Turno Tarde', valor: data.ops_tarde || 0, icono: Moon },
        { titulo: 'Total Notas de Crédito', valor: formatCurrency(data.total_notas_credito), icono: FileMinus },
        { titulo: 'Top Cliente', valor: data.top_cliente || 'Sin datos', icono: User },
      ]
    }
  ];

  const stylesMap = {
    blue: {
      box: 'border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white shadow-blue-100/40 dark:border-slate-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:shadow-none',
      iconBg: 'bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800',
      title: 'text-blue-900 dark:text-blue-300',
      accent: 'bg-blue-500',
      itemBorder: 'border-blue-100 dark:border-slate-600',
      itemIcon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
    },
    emerald: {
      box: 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white shadow-emerald-100/40 dark:border-slate-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:shadow-none',
      iconBg: 'bg-emerald-100 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800',
      title: 'text-emerald-900 dark:text-emerald-300',
      accent: 'bg-emerald-500',
      itemBorder: 'border-emerald-100 dark:border-slate-600',
      itemIcon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
    },
    amber: {
      box: 'border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-white shadow-amber-100/40 dark:border-slate-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:shadow-none',
      iconBg: 'bg-amber-100 text-amber-600 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-800',
      title: 'text-amber-900 dark:text-amber-300',
      accent: 'bg-amber-500',
      itemBorder: 'border-amber-100 dark:border-slate-600',
      itemIcon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
    },
    violet: {
      box: 'border-violet-200 bg-gradient-to-br from-violet-50/60 via-white to-white shadow-violet-100/40 dark:border-slate-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:shadow-none',
      iconBg: 'bg-violet-100 text-violet-600 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:ring-violet-800',
      title: 'text-violet-900 dark:text-violet-300',
      accent: 'bg-violet-500',
      itemBorder: 'border-violet-100 dark:border-slate-600',
      itemIcon: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
    },
    sky: {
      box: 'border-sky-200 bg-gradient-to-br from-sky-50/60 via-white to-white shadow-sky-100/40 dark:border-slate-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:shadow-none',
      iconBg: 'bg-sky-100 text-sky-600 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:ring-sky-800',
      title: 'text-sky-900 dark:text-sky-300',
      accent: 'bg-sky-500',
      itemBorder: 'border-sky-100 dark:border-slate-600',
      itemIcon: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
    },
    rose: {
      box: 'border-rose-200 bg-white dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none',
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
      title: 'text-rose-800 dark:text-rose-300',
      accent: 'bg-rose-500',
      itemBorder: 'border-rose-100 dark:border-slate-600',
      itemIcon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20">
        <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
        <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Cargando 20 indicadores...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up dark:bg-slate-900">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Indicadores del Sistema</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">Panel de control con 20 métricas clave organizadas por categoría.</p>
        </div>
        <button
          onClick={recargarDatos}
          disabled={loading}
          className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer self-start sm:self-auto dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:shadow-none"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TENDENCIA DE OPERACIONES */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none [--chart-grid:#f1f5f9] [--chart-tick:#64748b] [--chart-cursor:#f8fafc] dark:[--chart-grid:#475569] dark:[--chart-tick:#cbd5e1] dark:[--chart-cursor:#334155]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 dark:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-brand-orange dark:bg-orange-950/40">
              <TrendingUp className="w-4 h-4" />
            </span>
            Tendencia de Operaciones
          </h3>
          {/* CORRECCIÓN: Altura fija para que ResponsiveContainer funcione */}
          <div className="w-full h-[300px]">
            {datosTendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosTendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={1} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--chart-tick)' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'var(--chart-cursor)'}} content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                  <Bar dataKey="cantidad" name="Operaciones" fill="url(#colorOps)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm dark:text-slate-500">No hay datos</div>}
          </div>
        </div>

        {/* DISTRIBUCIÓN POR MEDIO DE PAGO */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col dark:border-slate-600 dark:bg-slate-800/60 dark:shadow-none [--chart-tick:#64748b] dark:[--chart-tick:#cbd5e1]">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 dark:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
            Distribución por Medio de Pago
          </h3>
          {/* CORRECCIÓN: Altura fija para que ResponsiveContainer funcione */}
          <div className="w-full h-[300px]">
            {datosMedios.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={datosMedios}
                    cx="50%"
                    cy="45%"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {datosMedios.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ 
                      fontSize: '12px', 
                      paddingTop: '15px', 
                      fontWeight: '600', 
                      color: 'var(--chart-tick)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm dark:text-slate-500">No hay datos</div>}
          </div>
        </div>
      </div>

      {/* 5 CATEGORÍAS × 4 INDICADORES */}
      {categorias.map((cat, catIdx) => {
        const CatIcon = cat.icono;
        const style = stylesMap[cat.color];

        return (
          <div key={catIdx} className={`rounded-3xl border shadow-sm overflow-hidden ${style.box} dark:shadow-none`}>
            <div className={`px-5 py-4 border-b ${style.itemBorder} flex items-center gap-3 dark:border-slate-600`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${style.iconBg}`}>
                <CatIcon className="h-5 w-5" />
              </span>
              <h3 className={`text-base sm:text-lg font-black tracking-wide ${style.title}`}>
                {cat.titulo}
              </h3>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {cat.items.map((item, idx) => {
                const ItemIcon = item.icono;
                const itemColor = item.color || cat.color;
                const itemStyle = stylesMap[itemColor];

                return (
                  <div key={idx} className={`relative bg-white rounded-2xl border ${itemStyle.itemBorder} shadow-sm p-3.5 sm:p-4 hover:-translate-y-1 hover:shadow-md transition-all duration-200 dark:bg-slate-800/60 dark:shadow-none dark:hover:shadow-none`}>
                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${itemStyle.accent}`}></div>

                    <div className="flex items-start justify-between mb-2">
                      <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${itemStyle.itemIcon}`}>
                        <ItemIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </div>
                    </div>

                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight dark:text-slate-400">
                      {item.titulo}
                    </p>
                    <p className="mt-1.5 text-sm sm:text-base font-black text-slate-900 tabular-nums break-words dark:text-slate-100">
                      {item.valor}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Indicadores;