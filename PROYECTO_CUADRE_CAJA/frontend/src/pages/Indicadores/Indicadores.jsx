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

  // Calcular porcentajes
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
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
        <p className="mt-3 text-sm font-semibold text-slate-700">Cargando 20 indicadores...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Indicadores del Sistema</h1>
          <p className="mt-2 text-base text-slate-500">Panel de control con 20 métricas clave organizadas por categoría.</p>
        </div>
        <button onClick={cargarDatos} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer">
          <RefreshCw className="h-5 w-5" /> Actualizar
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      {/* GRÁFICOS (arriba, destacados) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-orange" /> Tendencia de Operaciones
          </h3>
          <div className="h-64 w-full">
            {datosTendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosTendencia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="cantidad" name="Operaciones" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No hay datos</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Distribución por Medio de Pago
          </h3>
          <div className="h-64 w-full">
            {datosMedios.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosMedios} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {datosMedios.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-400">No hay datos</div>}
          </div>
        </div>
      </div>

      {/* 5 CATEGORÍAS CON 4 INDICADORES CADA UNA = 20 INDICADORES */}
      {categorias.map((cat, catIdx) => {
        const CatIcon = cat.icono;
        return (
          <div key={catIdx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorClasses[cat.color]}`}>
                <CatIcon className="h-5 w-5" />
              </span>
              {cat.titulo}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cat.items.map((item, idx) => {
                const ItemIcon = item.icono;
                const itemColor = item.color || cat.color;
                return (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorClasses[itemColor]}`}>
                        <ItemIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                      {item.titulo}
                    </p>
                    <p className="mt-1.5 text-lg font-black text-slate-900 tabular-nums break-words">
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