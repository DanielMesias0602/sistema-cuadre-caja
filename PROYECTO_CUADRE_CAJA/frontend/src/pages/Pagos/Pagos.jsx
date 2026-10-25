import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../lib/api';
import { PagoDetailDrawer } from './PagoDetailDrawer';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  Banknote,
  Wallet,
  CreditCard,
  Calendar,
  Search,
  RefreshCw,
  X,
  Filter,
  CheckCircle2,
  Clock,
  Receipt,
  ChevronDown,
  Eye,
  XCircle
} from 'lucide-react';

export function Pagos() {
  const [operaciones, setOperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [medioFiltro, setMedioFiltro] = useState('');

  const [selectedPago, setSelectedPago] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [verificacionesLocales, setVerificacionesLocales] = useState({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      setOperaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar pagos:', err);
      setError('No se pudo cargar la información de los pagos.');
    } finally {
      setLoading(false);
    }
  };

  const todosLosPagos = useMemo(() => {
    const list = [];
    operaciones.forEach((op) => {
      const pagos = Array.isArray(op.pagos) ? op.pagos : (Array.isArray(op.payments) ? op.payments : []);
      const evidencias = Array.isArray(op.evidencias) ? op.evidencias : [];
      const totalPagosOp = pagos.length;

      const evidenciaCliente = evidencias.find(e => e.tipo_evidencia === 'CLIENTE');
      const urlEvidenciaCliente = evidenciaCliente?.storage_key || null;

      pagos.forEach((p, idx) => {
        const idUnico = p.id_pago ? `${op.id_operacion}-${p.id_pago}` : `${op.id_operacion}-pago-${idx}`;
        const estadoDb = p.estado || op.estado;
        const estadoFinal = verificacionesLocales[idUnico] || verificacionesLocales[p.id_pago] || estadoDb || 'PENDIENTE';
        const esAnulada = String(op.estado || '').toUpperCase() === 'ANULADA';

        list.push({
          id_pago_unico: idUnico,
          id_pago: p.id_pago,
          id_operacion: op.id_operacion,
          fecha: op.fecha || '',
          hora: op.hora || '',
          comprobante: `${op.tipo_comprobante || 'DOC'} ${op.serie || ''}-${op.numero || ''}`.trim(),
          tipo_comprobante: op.tipo_comprobante || 'DOC',
          serie: op.serie || '',
          numero: op.numero || '',
          cliente: op.cliente || 'No registrado',
          vendedor: op.vendedor || '-',
          usuario: `${op.nombres || ''} ${op.apellidos || ''}`.trim() || 'Sistema',
          medio_pago: p.medio_pago || p.nombre_medio || 'Efectivo',
          monto: Number(p.monto || 0),
          referencia: p.referencia || p.referencia_bancaria || '',
          evidencia_url: urlEvidenciaCliente || (p.evidencia_url && p.evidencia_url !== 'None' ? p.evidencia_url : null),
          estado: estadoFinal,
          estado_operacion: op.estado || 'PENDIENTE',
          esAnulada: esAnulada,
          operacionCompleta: op,
          pagoIndex: idx,
          totalPagosOp: totalPagosOp
        });
      });
    });
    return list;
  }, [operaciones, verificacionesLocales]);

  const mediosDisponibles = useMemo(() => {
    const set = new Set();
    todosLosPagos.forEach((p) => {
      if (p.medio_pago) set.add(p.medio_pago);
    });
    return Array.from(set).sort();
  }, [todosLosPagos]);

  const pagosFiltrados = useMemo(() => {
    return todosLosPagos.filter((p) => {
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const cliente = (p.cliente || '').toLowerCase();
        const ref = (p.referencia || '').toLowerCase();
        const comp = (p.comprobante || '').toLowerCase();
        const medio = (p.medio_pago || '').toLowerCase();
        if (!cliente.includes(q) && !ref.includes(q) && !comp.includes(q) && !medio.includes(q)) {
          return false;
        }
      }
      if (fechaDesde && p.fecha < fechaDesde) return false;
      if (fechaHasta && p.fecha > fechaHasta) return false;
      if (medioFiltro && p.medio_pago.toUpperCase() !== medioFiltro.toUpperCase()) return false;
      return true;
    });
  }, [todosLosPagos, busqueda, fechaDesde, fechaHasta, medioFiltro]);

  const { totalRecaudado, totalEfectivo, totalVirtual, cantEfectivo, cantVirtual } = useMemo(() => {
    let recaudado = 0;
    let efectivo = 0;
    let virtual = 0;
    let cEf = 0;
    let cVi = 0;

    pagosFiltrados.forEach((p) => {
      if (p.esAnulada) return;

      const m = Number(p.monto || 0);
      recaudado += m;
      const esCash = (p.medio_pago || '').toLowerCase().includes('efectivo');
      if (esCash) {
        efectivo += m;
        cEf += 1;
      } else {
        virtual += m;
        cVi += 1;
      }
    });

    return {
      totalRecaudado: recaudado,
      totalEfectivo: efectivo,
      totalVirtual: virtual,
      cantEfectivo: cEf,
      cantVirtual: cVi
    };
  }, [pagosFiltrados]);

  const hayAnuladasEnFiltro = useMemo(() => {
    return pagosFiltrados.some(p => p.esAnulada);
  }, [pagosFiltrados]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setMedioFiltro('');
  };

  const hayFiltrosActivos = busqueda || fechaDesde || fechaHasta || medioFiltro;

  const renderMedioIcon = (medio) => {
    const m = (medio || '').toLowerCase();
    if (m.includes('efectivo')) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Banknote className="h-4 w-4" />
        </span>
      );
    }
    if (m.includes('tarjeta') || m.includes('pos')) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <CreditCard className="h-4 w-4" />
        </span>
      );
    }
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        <Wallet className="h-4 w-4" />
      </span>
    );
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* CABECERA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Historial de Pagos
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Control, conciliación y verificación individual de todos los cobros por medio de pago.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Recaudado
            </p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black text-slate-900 tabular-nums break-words">
              {formatCurrency(totalRecaudado)}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">
              {pagosFiltrados.filter(p => !p.esAnulada).length} {pagosFiltrados.filter(p => !p.esAnulada).length === 1 ? 'pago válido' : 'pagos válidos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-600/10">
            <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Pagos en Efectivo
            </p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black text-slate-900 tabular-nums break-words">
              {formatCurrency(totalEfectivo)}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">
              {cantEfectivo} {cantEfectivo === 1 ? 'cobro físico' : 'cobros físicos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
              Pagos Virtuales
            </p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black text-slate-900 tabular-nums break-words">
              {formatCurrency(totalVirtual)}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">
              {cantVirtual} {cantVirtual === 1 ? 'transferencia / tarjeta' : 'transferencias / tarjetas'}
            </p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center gap-3 sm:gap-4 w-full">
          <div className="relative w-full flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, referencia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-10 sm:h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          <div className="w-full flex-1 min-w-0">
            <DateRangePicker
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onChange={({ fechaDesde: newDesde, fechaHasta: newHasta }) => {
                setFechaDesde(newDesde);
                setFechaHasta(newHasta);
              }}
            />
          </div>

          <div className="relative w-full flex-1">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={medioFiltro}
              onChange={(e) => setMedioFiltro(e.target.value)}
              className="w-full h-10 sm:h-11 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none cursor-pointer"
            >
              <option value="">Todos los medios</option>
              {mediosDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex h-9 sm:h-11 w-full sm:w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 cursor-pointer"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span className="sm:hidden text-xs font-semibold">Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLA / CARDS */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* MOBILE: cards */}
        <div className="block md:hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Cargando pagos...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={cargarDatos}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">No se encontraron pagos</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {hayFiltrosActivos
                  ? 'No hay registros que coincidan con los filtros aplicados.'
                  : 'Aún no se han registrado operaciones de pago en el sistema.'}
              </p>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pagosFiltrados.map((pago) => {
                const urlFinal = pago.evidencia_url
                  ? pago.evidencia_url.startsWith('http')
                    ? pago.evidencia_url
                    : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${pago.evidencia_url}`
                  : null;

                const isVerificado =
                  String(pago.estado).toUpperCase() === 'VERIFICADO' ||
                  String(pago.estado).toUpperCase() === 'VERIFICADA' ||
                  String(pago.estado).toUpperCase() === 'COMPLETADO';

                return (
                  <div
                    key={pago.id_pago_unico}
                    className={`p-3 space-y-2 ${pago.esAnulada ? 'bg-rose-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {pago.fecha} · {pago.hora ? pago.hora.substring(0, 5) : '00:00'}
                        </p>
                        <p className={`text-sm font-bold break-words ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {pago.comprobante}
                        </p>
                        <p className={`text-xs mt-0.5 break-words ${pago.esAnulada ? 'text-slate-400' : 'text-slate-600'}`}>
                          {pago.cliente}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Registró: {pago.usuario}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-bold tabular-nums ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {formatCurrency(pago.monto)}
                        </p>
                        {pago.esAnulada ? (
                          <span className="inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            <XCircle className="h-3 w-3" /> Anulada
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                            isVerificado
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                          }`}>
                            {isVerificado ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {isVerificado ? 'Verificado' : 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {renderMedioIcon(pago.medio_pago)}
                      <span className={`text-xs font-semibold ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {pago.medio_pago}
                      </span>
                      {pago.totalPagosOp > 1 && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Pago {pago.pagoIndex + 1}/{pago.totalPagosOp}
                        </span>
                      )}
                    </div>

                    {pago.referencia && (
                      <p className="text-[10px] text-slate-500">
                        Ref: <span className="font-mono font-semibold text-slate-700">{pago.referencia}</span>
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5">
                      {!(pago.medio_pago || '').toLowerCase().includes('efectivo') && urlFinal && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPago(pago);
                            setDrawerAbierto(true);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-98 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" /> Ver Evidencia
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPago(pago);
                          setDrawerAbierto(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-98 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver Detalle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DESKTOP: tabla */}
        <div className="hidden md:block overflow-x-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Cargando pagos...</p>
              <p className="text-xs text-slate-400">Consultando operaciones y conciliaciones en el servidor</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={cargarDatos}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : pagosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">No se encontraron pagos</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {hayFiltrosActivos
                  ? 'No hay registros que coincidan con los filtros aplicados. Intenta cambiar los criterios de búsqueda.'
                  : 'Aún no se han registrado operaciones de pago en el sistema.'}
              </p>
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-6 pr-3">Fecha y Hora</th>
                  <th className="px-3 py-3.5">Operación</th>
                  <th className="px-3 py-3.5">Cliente</th>
                  <th className="px-3 py-3.5">Medio de Pago</th>
                  <th className="px-3 py-3.5 text-right">Monto</th>
                  <th className="px-3 py-3.5">Referencia</th>
                  <th className="px-3 py-3.5 text-center">Estado</th>
                  <th className="px-3 py-3.5 text-center">Comprobante Digital</th>
                  <th className="py-3.5 pl-3 pr-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {pagosFiltrados.map((pago, index) => {
                  const esMismaOperacion = index > 0 && pagosFiltrados[index - 1].id_operacion === pago.id_operacion;

                  const urlFinal = pago.evidencia_url
                    ? pago.evidencia_url.startsWith('http')
                      ? pago.evidencia_url
                      : `https://objectstorage.sa-santiago-1.oraclecloud.com/n/axhahegcxylf/b/sistema-cuadre-caja-evidencias/o/${pago.evidencia_url}`
                    : null;

                  const isVerificado =
                    String(pago.estado).toUpperCase() === 'VERIFICADO' ||
                    String(pago.estado).toUpperCase() === 'VERIFICADA' ||
                    String(pago.estado).toUpperCase() === 'COMPLETADO';

                  return (
                    <tr
                      key={pago.id_pago_unico}
                      className={`group transition-colors hover:bg-slate-50/60 ${esMismaOperacion ? 'bg-slate-50 border-t-0' : 'border-t border-slate-200'
                        } ${pago.esAnulada ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex flex-col">
                          <span className={`font-semibold ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{pago.fecha}</span>
                          <span className="text-[11px] text-slate-400">
                            {pago.hora ? pago.hora.substring(0, 5) : '00:00'}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold ${pago.esAnulada ? 'bg-slate-100 text-slate-400 line-through' : 'bg-slate-100 text-slate-800'
                            }`}>
                            {pago.comprobante}
                          </span>
                          {pago.totalPagosOp > 1 && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Pago {pago.pagoIndex + 1} de {pago.totalPagosOp}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className={`max-w-[190px] truncate font-medium ${pago.esAnulada ? 'text-slate-400' : 'text-slate-900'}`} title={pago.cliente}>
                          {pago.cliente}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Registró: {pago.usuario}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          {renderMedioIcon(pago.medio_pago)}
                          <span className={`font-semibold ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {pago.medio_pago}
                          </span>
                        </div>
                      </td>

                      <td className={`px-3 py-3.5 text-right font-bold tabular-nums ${pago.esAnulada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {formatCurrency(pago.monto)}
                      </td>

                      <td className="px-3 py-3.5">
                        {pago.referencia ? (
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                            {pago.referencia}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        {pago.esAnulada ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            <XCircle className="h-3 w-3" />
                            Anulada
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${isVerificado
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                              }`}
                          >
                            {isVerificado ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Verificado
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        {(pago.medio_pago || '').toLowerCase().includes('efectivo') ? (
                          <span className="text-slate-400">-</span>
                        ) : urlFinal ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPago(pago);
                              setDrawerAbierto(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
                            title="Ver evidencia"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Ver Evidencia</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 pl-3 pr-6 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPago(pago);
                            setDrawerAbierto(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 cursor-pointer"
                          title="Ver detalle del pago"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Detalle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && pagosFiltrados.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-3 sm:px-6 py-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800">{pagosFiltrados.length}</strong> de{' '}
              <strong className="text-slate-800">{todosLosPagos.length}</strong> pagos
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {hayAnuladasEnFiltro && (
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 bg-rose-50 px-2 sm:px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5 w-fit">
                  <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Excluye {pagosFiltrados.filter(p => p.esAnulada).length} pago(s) anulado(s)
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-500">Total Filtrado:</span>
                <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums">
                  {formatCurrency(totalRecaudado)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <PagoDetailDrawer
        selectedPago={drawerAbierto ? selectedPago : null}
        onClose={() => setDrawerAbierto(false)}
      />
    </div>
  );
}

export default Pagos;