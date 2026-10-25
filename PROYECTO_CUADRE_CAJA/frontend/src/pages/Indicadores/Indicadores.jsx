import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  RefreshCw, DollarSign, Receipt, XCircle, TrendingUp, Banknote, Wallet,
  CreditCard, Smartphone, AlertTriangle, CheckCircle, TrendingDown, FileText,
  ShieldCheck, Link2, Sun, Moon, FileMinus, User, Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

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

    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar los indicadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const COLORS = ['#ea580c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  const totalOps = Number(data.operaciones_registradas || 0);
  const opsConEvidencia = Number(data.ops_con_evidencia || 0);
  const opsVerificadas = Number(data.ops_verificadas || 0);
  const totalPagosVirtuales = Number(data.monto_virtual || 0) > 0 ? 1 : 0;
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

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-600/10',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    violet: 'bg-violet-50 text-violet-600 ring-violet-600/10',
    sky: 'bg-sky-50 text-sky-600 ring-sky-600/10',
    rose: 'bg-rose-50 text-rose-600 ring-rose-600/10',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20">
        <RefreshCw className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-brand-orange" />
        <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700">Cargando 20 indicadores...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">Indicadores del Sistema</h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-500">Panel de control con 20 métricas clave organizadas por categoría.</p>
        </div>
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" /> Actualizar
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 sm:p-4 text-xs sm:text-sm text-rose-800">{error}</div>}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Tendencia de Operaciones */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange" /> Tendencia de Operaciones
          </h3>
          <div className="h-56 sm:h-64 w-full">
            {datosTendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosTendencia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="cantidad" name="Operaciones" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm">No hay datos</div>}
          </div>
        </div>

        {/* Distribución por Medio de Pago */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
          <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> Distribución por Medio de Pago
          </h3>
          <div className="h-56 sm:h-64 w-full">
            {datosMedios.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosMedios}
                    cx="50%"
                    cy="45%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {datosMedios.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `S/ ${Number(value).toFixed(2)}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm">No hay datos</div>}
          </div>
        </div>
      </div>

      {/* 5 CATEGORÍAS × 4 INDICADORES */}
      {categorias.map((cat, catIdx) => {
        const CatIcon = cat.icono;
        return (
          <div key={catIdx} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
            <h3 className="text-sm sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <span className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg flex-shrink-0 ${colorClasses[cat.color]}`}>
                <CatIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="truncate">{cat.titulo}</span>
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {cat.items.map((item, idx) => {
                const ItemIcon = item.icono;
                const itemColor = item.color || cat.color;
                return (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:p-4 hover:bg-slate-50 transition-colors min-w-0">
                    <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                      <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg flex-shrink-0 ${colorClasses[itemColor]}`}>
                        <ItemIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                      {item.titulo}
                    </p>
                    <p className="mt-1 sm:mt-1.5 text-[13px] sm:text-lg font-black text-slate-900 tabular-nums break-words">
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