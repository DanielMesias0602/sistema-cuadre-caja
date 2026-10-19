import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { OperacionDetailDrawerPremium } from '../../components/dashboard/OperacionDetailDrawerPremium';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Plus, Search, Calendar, Receipt,
  CheckCircle, Clock, AlertCircle, FileText,
  User, CreditCard
} from 'lucide-react';

export function Operaciones() {
  const navigate = useNavigate();
  
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const [selectedOp, setSelectedOp] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    cargarOperaciones();
  }, []);

  const cargarOperaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el historial de operaciones.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (estado) => {
    const st = (estado || '').toUpperCase();
    if (st === 'PAGADA' || st === 'VERIFICADA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
          <CheckCircle className="w-3 h-3" /> {st}
        </span>
      );
    }
    if (st === 'PENDIENTE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
          <Clock className="w-3 h-3" /> PENDIENTE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
        <AlertCircle className="w-3 h-3" /> {st || 'REGISTRADO'}
      </span>
    );
  };

  const operacionesFiltradas = operaciones.filter((op) => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const comp = `${op.tipo_comprobante || ''} ${op.serie || ''}-${op.numero || ''}`.toLowerCase();
      const cliente = (op.cliente || '').toLowerCase();
      const usuario = `${op.nombres || ''} ${op.apellidos || ''}`.toLowerCase();
      if (!comp.includes(q) && !cliente.includes(q) && !usuario.includes(q)) return false;
    }
    if (fechaDesde && op.fecha < fechaDesde) return false;
    if (fechaHasta && op.fecha > fechaHasta) return false;
    if (estadoFiltro && (op.estado || '').toUpperCase() !== estadoFiltro.toUpperCase()) return false;
    return true;
  });

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-brand-orange" />
            Historial de Operaciones
          </h1>
          <p className="text-base text-slate-500 mt-2 font-medium">
            Consulta, filtra y exporta todas las ventas registradas en el sistema.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <button
            onClick={() => navigate('/operaciones/nueva')}
            className="w-full sm:w-auto bg-brand-orange hover:bg-brand-orange-hover text-white px-5 py-3 rounded-xl flex justify-center items-center gap-2 font-bold text-sm transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nueva Operación
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por comprobante o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none transition" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Rango de fechas</label>
          <DateRangePicker
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
              setFechaDesde(newDesde);
              setFechaHasta(newHasta);
            }}
          />
        </div>
        <div>
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:ring-2 focus:ring-brand-orange outline-none transition cursor-pointer">
            <option value="">Todos los estados</option>
            <option value="PAGADA">Pagadas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="ANULADA">Anuladas</option>
          </select>
        </div>
      </div>

      {/* TABLA CON overflow-x-auto */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Fecha</th>
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Medios de Pago</th>
                <th className="p-4">Referencia</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-lg">Cargando historial...</td>
                </tr>
              ) : operacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 text-lg flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-300" />
                    No se encontraron operaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : operacionesFiltradas.map((op) => {
                // Buscar el primer pago con referencia
                const pagoConReferencia = op.pagos && op.pagos.length > 0 
                  ? op.pagos.find(p => p.referencia && p.referencia !== 'None') 
                  : null;
                const referenciaFinal = pagoConReferencia?.referencia || '-';

                return (
                  <tr key={op.id_operacion} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">{op.fecha}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 uppercase">{op.tipo_comprobante || 'DOC'}</span>
                          <span className="text-sm font-bold text-slate-900">{op.serie}-{op.numero}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 max-w-[200px] truncate" title={op.cliente || 'No registrado'}>
                          {op.cliente || 'No registrado'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {op.pagos && op.pagos.length > 0 ? op.pagos.map((pago, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-700">{pago.medio_pago || pago.nombre_medio || 'Efectivo'}:</span>
                            <span className="text-xs font-bold text-slate-900">S/ {parseFloat(pago.monto).toFixed(2)}</span>
                          </div>
                        )) : <span className="text-xs text-slate-400">-</span>}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-slate-700 text-sm font-mono">{referenciaFinal}</span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <span className="text-lg font-bold text-brand-orange">{formatCurrency(op.monto)}</span>
                    </td>

                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setSelectedOp(op); setDrawerAbierto(true); }} 
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {operacionesFiltradas.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <div className="text-right">
              <span className="text-sm font-bold text-slate-600 mr-2 uppercase">Total Conciliado:</span>
              <span className="text-xl font-black text-slate-900">{formatCurrency(operacionesFiltradas.reduce((sum, op) => sum + Number(op.monto), 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* PANEL LATERAL DE DETALLE */}
      <OperacionDetailDrawerPremium op={drawerAbierto ? selectedOp : null} onClose={() => setDrawerAbierto(false)} />
    </div>
  );
}

export default Operaciones;