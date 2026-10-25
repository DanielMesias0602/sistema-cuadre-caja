import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { Plus, Calendar, User, Wallet, AlertCircle, CheckCircle, RefreshCw, Search, Lock, X, Sun, Moon, ArrowRight, AlertTriangle } from 'lucide-react';
import { CierreDetailDrawer } from '../../components/caja/CierreDetailDrawer';

export function CierresCaja() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [selectedCierre, setSelectedCierre] = useState(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasoModal, setPasoModal] = useState(1);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [turnosDeshabilitados, setTurnosDeshabilitados] = useState({ mañana: false, tarde: false });
  const [motivoDeshabilitado, setMotivoDeshabilitado] = useState({ mañana: '', tarde: '' });

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('');

  const [formCierre, setFormCierre] = useState({
    fecha: new Date().toLocaleDateString('en-CA'),
    turno: '',
    efectivoFisico: '',
    observaciones: ''
  });
  const [efectivoEsperado, setEfectivoEsperado] = useState(0);
  const [preCalculo, setPreCalculo] = useState({ total_ingresos: 0, total_no_efectivo: 0 });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/cierres-caja');
      const data = res.data?.data || res.data;
      setCierres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar cierres de caja:', err);
      setError('No hay datos disponibles');
      setCierres([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cierresFiltrados = useMemo(() => {
    return cierres.filter(c => {
      if (busqueda) {
        const responsable = (c.responsable || '').toLowerCase();
        if (!responsable.includes(busqueda.toLowerCase())) return false;
      }
      if (fechaDesde && c.fecha < fechaDesde) return false;
      if (fechaHasta && c.fecha > fechaHasta) return false;
      if (turnoFiltro && c.turno !== turnoFiltro) return false;
      return true;
    });
  }, [cierres, busqueda, fechaDesde, fechaHasta, turnoFiltro]);

  const kpis = useMemo(() => {
    const totalCierres = cierresFiltrados.length;
    const efectivoEsperadoTotal = cierresFiltrados.reduce(
      (acc, c) => acc + Number(c.efectivo_esperado || 0),
      0
    );
    const diferenciaAcumulada = cierresFiltrados.reduce(
      (acc, c) => acc + Number(c.diferencia || 0),
      0
    );

    return {
      totalCierres,
      efectivoEsperadoTotal,
      diferenciaAcumulada
    };
  }, [cierresFiltrados]);

  // ⚠️ CAMBIO 1: acepta fecha explícita para no usar "hoy" siempre
  const calcularEfectivoEsperado = async (turno, fechaSeleccionada) => {
    try {
      const fecha = fechaSeleccionada || formCierre.fecha || new Date().toLocaleDateString('en-CA');
      const res = await api.get(`/cierres-caja/pre-calculo?fecha=${fecha}&turno=${turno}`);
      const data = res.data.data;
      setEfectivoEsperado(Number(data.efectivo_esperado || 0));
      setPreCalculo({
        total_ingresos: Number(data.total_ingresos || 0),
        total_no_efectivo: Number(data.total_no_efectivo || 0)
      });
    } catch (err) {
      console.error('Error al calcular efectivo esperado:', err);
      setEfectivoEsperado(0);
    }
  };

  // ⚠️ CAMBIO 2: nueva función. Solo aplica regla de hora si la fecha es HOY
  const recalcularTurnosDisponibles = (fechaSeleccionada) => {
    const hoy = new Date().toLocaleDateString('en-CA');
    const currentHour = new Date().getHours();
    const esHoy = fechaSeleccionada === hoy;

    const cierresFecha = cierres.filter(c => c.fecha === fechaSeleccionada);
    const cierreManana = cierresFecha.find(c => c.turno === 'Mañana');
    const cierreTarde = cierresFecha.find(c => c.turno === 'Tarde');

    const nuevoDeshabilitados = { mañana: false, tarde: false };
    const nuevoMotivo = { mañana: '', tarde: '' };

    if (esHoy) {
      if (currentHour < 14) {
        nuevoDeshabilitados.tarde = true;
        nuevoMotivo.tarde = 'El turno Tarde comienza a las 2:00 PM';
      } else {
        nuevoDeshabilitados.mañana = true;
        nuevoMotivo.mañana = 'El turno Mañana finalizó a las 2:00 PM';
      }
    }

    if (cierreManana) {
      nuevoDeshabilitados.mañana = true;
      nuevoMotivo.mañana = 'Este turno ya fue cerrado';
    }
    if (cierreTarde) {
      nuevoDeshabilitados.tarde = true;
      nuevoMotivo.tarde = 'Este turno ya fue cerrado';
    }

    setTurnosDeshabilitados(nuevoDeshabilitados);
    setMotivoDeshabilitado(nuevoMotivo);
  };

  // ⚠️ CAMBIO 3: siempre abre en paso 1 (para que el usuario elija fecha y turno)
  const abrirModal = () => {
    const hoy = new Date().toLocaleDateString('en-CA');
    setFormCierre({ fecha: hoy, turno: '', efectivoFisico: '', observaciones: '' });
    setEfectivoEsperado(0);
    setPreCalculo({ total_ingresos: 0, total_no_efectivo: 0 });
    recalcularTurnosDisponibles(hoy);
    setPasoModal(1);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPasoModal(1);
    setConfirmacionAbierta(false);
    setFormCierre({
      fecha: new Date().toLocaleDateString('en-CA'),
      turno: '',
      efectivoFisico: '',
      observaciones: ''
    });
    setEfectivoEsperado(0);
    setPreCalculo({ total_ingresos: 0, total_no_efectivo: 0 });
  };

  // ⚠️ CAMBIO 4: pasa la fecha seleccionada
  const seleccionarTurno = async (turno) => {
    setFormCierre({ ...formCierre, turno });
    await calcularEfectivoEsperado(turno, formCierre.fecha);
    setPasoModal(2);
  };

  const calcularDiferencia = () => {
    const fisico = Number(formCierre.efectivoFisico) || 0;
    return fisico - efectivoEsperado;
  };

  const abrirConfirmacion = () => {
    setConfirmacionAbierta(true);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      // ⚠️ CAMBIO 5: usa formCierre.fecha (la fecha elegida por el usuario)
      const payload = {
        fecha: formCierre.fecha,
        turno: formCierre.turno,
        total_ingresos: preCalculo.total_ingresos,
        total_no_efectivo: preCalculo.total_no_efectivo,
        total_salidas: 0,
        efectivo_fisico: Number(formCierre.efectivoFisico),
        observaciones: formCierre.observaciones,
        fecha_fin: new Date().toISOString()
      };

      await api.post('/cierres-caja', payload);
      await cargarDatos();
      cerrarModal();
    } catch (err) {
      console.error('Error al guardar cierre:', err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert('Error al guardar el cierre de caja');
      }
    } finally {
      setGuardando(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setTurnoFiltro('');
  };

  const nombreResponsable = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : 'Usuario autenticado';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Cierres de Caja
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Gestiona los cierres diarios de caja con arqueo y verificación de efectivo.
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
            onClick={abrirModal}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white shadow-sm shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Cierre</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Cierres</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
              {kpis.totalCierres}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {kpis.totalCierres === 1 ? 'turno cerrado' : 'turnos cerrados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Efectivo Esperado</p>
            <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
              {formatCurrency(kpis.efectivoEsperadoTotal)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Total del periodo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${kpis.diferenciaAcumulada === 0
              ? 'bg-emerald-50 text-emerald-600 ring-emerald-600/10'
              : kpis.diferenciaAcumulada < 0
                ? 'bg-rose-50 text-rose-600 ring-rose-600/10'
                : 'bg-blue-50 text-blue-600 ring-blue-600/10'
            }`}>
            {kpis.diferenciaAcumulada === 0 ? (
              <CheckCircle className="h-6 w-6" />
            ) : kpis.diferenciaAcumulada < 0 ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Diferencia Acumulada</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${kpis.diferenciaAcumulada === 0
                ? 'text-emerald-600'
                : kpis.diferenciaAcumulada < 0
                  ? 'text-rose-600'
                  : 'text-blue-600'
              }`}>
              {formatCurrency(kpis.diferenciaAcumulada)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {kpis.diferenciaAcumulada === 0 ? 'Cuadrado perfecto' : kpis.diferenciaAcumulada < 0 ? 'Faltante' : 'Sobrante'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por responsable..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={turnoFiltro}
              onChange={(e) => setTurnoFiltro(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer"
            >
              <option value="">Todos los turnos</option>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
            {(busqueda || fechaDesde || fechaHasta || turnoFiltro) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="h-12 w-12 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                title="Limpiar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Cargando cierres de caja...</p>
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
                  <th className="p-4">Turno</th>
                  <th className="p-4">Responsable</th>
                  <th className="p-4 text-right">Total Ingresos</th>
                  <th className="p-4 text-right">Efectivo Esperado</th>
                  <th className="p-4 text-right">Efectivo Físico</th>
                  <th className="p-4 text-right">Diferencia</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cierresFiltrados.length > 0 ? cierresFiltrados.map((cierre) => {
                  const difNum = Number(cierre.diferencia || 0);
                  return (
                    <tr key={cierre.id_cierre} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">
                        {cierre.fecha ? (cierre.fecha.includes('T') ? new Date(cierre.fecha).toLocaleDateString('es-PE') : new Date(cierre.fecha + 'T00:00:00').toLocaleDateString('es-PE')) : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold ${cierre.turno === 'Mañana'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-indigo-50 text-indigo-700'
                          }`}>
                          {cierre.turno === 'Mañana' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                          {cierre.turno}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{cierre.responsable || 'No asignado'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.total_ingresos)}</td>
                      <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.efectivo_esperado)}</td>
                      <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.efectivo_fisico)}</td>
                      <td className="p-4 text-right">
                        {difNum === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        ) : difNum < 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                            <AlertCircle className="h-3 w-3" />
                            {formatCurrency(difNum)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await api.get(`/cierres-caja/${cierre.id_cierre}`);
                              setSelectedCierre(res.data.data);
                            } catch (err) {
                              console.error("Error al traer detalle", err);
                              setSelectedCierre(cierre);
                            }
                            setDrawerAbierto(true);
                          }}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No hay cierres de caja registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative overflow-hidden shrink-0">
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
              </svg>
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{pasoModal === 1 ? 'Seleccionar Turno' : 'Arqueo de Caja'}</h2>
                  <p className="text-blue-100 text-sm mt-1">Gestiona el cierre de forma segura</p>
                </div>
                <button onClick={cerrarModal} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {pasoModal === 1 ? (
                <div className="space-y-4">

                  {/* ⚠️ CAMBIO 6: NUEVO selector de fecha */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Fecha del cierre
                    </label>
                    <input
                      type="date"
                      value={formCierre.fecha}
                      max={new Date().toLocaleDateString('en-CA')}
                      onChange={(e) => {
                        const nuevaFecha = e.target.value;
                        setFormCierre({ ...formCierre, fecha: nuevaFecha, turno: '' });
                        recalcularTurnosDisponibles(nuevaFecha);
                      }}
                      className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <p className="text-sm text-slate-600 text-center font-medium">¿Qué turno deseas cerrar?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => seleccionarTurno('Mañana')}
                      disabled={turnosDeshabilitados.mañana}
                      className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all active:scale-95 ${turnosDeshabilitados.mañana
                          ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                          : 'border-blue-100 bg-white hover:border-blue-500 hover:shadow-md'
                        }`}
                    >
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${turnosDeshabilitados.mañana ? 'bg-slate-300 text-slate-500' : 'bg-amber-100 text-amber-600'
                        }`}>
                        <Sun className="h-8 w-8" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Mañana</span>
                      <span className="text-xs text-slate-500 text-center">
                        {turnosDeshabilitados.mañana ? motivoDeshabilitado.mañana : 'Antes de las 2:00 PM'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => seleccionarTurno('Tarde')}
                      disabled={turnosDeshabilitados.tarde}
                      className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all active:scale-95 ${turnosDeshabilitados.tarde
                          ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                          : 'border-blue-100 bg-white hover:border-blue-500 hover:shadow-md'
                        }`}
                    >
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${turnosDeshabilitados.tarde ? 'bg-slate-300 text-slate-500' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                        <Moon className="h-8 w-8" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Tarde</span>
                      <span className="text-xs text-slate-500 text-center">
                        {turnosDeshabilitados.tarde ? motivoDeshabilitado.tarde : 'A partir de las 2:00 PM'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4 text-blue-500" />
                      <span>Responsable: <strong className="text-slate-900">{nombreResponsable}</strong></span>
                    </div>
                    {/* ⚠️ CAMBIO 7: mostrar fecha en el paso 2 */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>Fecha: <strong className="text-slate-900">{new Date(formCierre.fecha + 'T00:00:00').toLocaleDateString('es-PE')}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>Turno: <strong className="text-slate-900">{formCierre.turno}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <span>Efectivo Esperado: <strong className="text-slate-900">{formatCurrency(efectivoEsperado)}</strong></span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Efectivo Físico</label>
                    <input
                      type="number"
                      value={formCierre.efectivoFisico}
                      onChange={(e) => setFormCierre({ ...formCierre, efectivoFisico: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Diferencia</label>
                    <div className={`h-12 w-full rounded-xl border px-4 flex items-center text-sm font-bold tabular-nums ${calcularDiferencia() === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : calcularDiferencia() < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                      {formatCurrency(calcularDiferencia())}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Observaciones</label>
                    <textarea
                      value={formCierre.observaciones}
                      onChange={(e) => setFormCierre({ ...formCierre, observaciones: e.target.value })}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row gap-3">
              {pasoModal === 1 ? (
                <button type="button" onClick={cerrarModal} className="w-full h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => setPasoModal(1)} disabled={guardando} className="w-full sm:w-1/3 h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50">
                    Atrás
                  </button>
                  <button type="button" onClick={abrirConfirmacion} disabled={guardando || !formCierre.efectivoFisico} className="w-full sm:w-2/3 h-11 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                    Guardar Cierre
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmacionAbierta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">¿Confirmar cierre de turno?</h3>
                <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700">
                Estás a punto de cerrar el turno <strong className="text-slate-900">{formCierre.turno}</strong> del <strong className="text-slate-900">{new Date(formCierre.fecha + 'T00:00:00').toLocaleDateString('es-PE')}</strong> como <strong className="text-slate-900">{nombreResponsable}</strong>.
              </p>
              <p className="text-sm text-slate-700 mt-2">
                Efectivo esperado: <strong className="text-slate-900">{formatCurrency(efectivoEsperado)}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Efectivo físico: <strong className="text-slate-900">{formatCurrency(Number(formCierre.efectivoFisico))}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Diferencia: <strong className={`${calcularDiferencia() === 0 ? 'text-emerald-600' : calcularDiferencia() < 0 ? 'text-rose-600' : 'text-blue-600'
                  }`}>{formatCurrency(calcularDiferencia())}</strong>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmacionAbierta(false)}
                disabled={guardando}
                className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Sí, cerrar turno
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CierreDetailDrawer
        cierre={drawerAbierto ? selectedCierre : null}
        onClose={() => {
          setDrawerAbierto(false);
          setSelectedCierre(null);
        }}
      />
    </div>
  );
}

export default CierresCaja;