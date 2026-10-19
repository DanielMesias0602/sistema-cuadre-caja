import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { Plus, Calendar, User, Wallet, AlertCircle, CheckCircle, RefreshCw, Search, Lock, X, Sun, Moon, ArrowRight, AlertTriangle } from 'lucide-react';

export function CierresCaja() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cierres, setCierres] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pasoModal, setPasoModal] = useState(1);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('');
  
  // Formulario
  const [formCierre, setFormCierre] = useState({
    turno: '',
    efectivoFisico: '',
    observaciones: ''
  });
  const [efectivoEsperado, setEfectivoEsperado] = useState(0);

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

  // Cierres filtrados para KPIs y tabla
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

  // KPIs calculados
  const kpis = useMemo(() => {
    const totalCierres = cierresFiltrados.length;
    const efectivoEsperadoTotal = cierresFiltrados.reduce((acc, c) => acc + (c.efectivo_esperado || 0), 0);
    const diferenciaAcumulada = cierresFiltrados.reduce((acc, c) => acc + (c.diferencia || 0), 0);
    
    return {
      totalCierres,
      efectivoEsperadoTotal,
      diferenciaAcumulada
    };
  }, [cierresFiltrados]);

  const calcularEfectivoEsperado = async (turno) => {
    try {
      const res = await api.get('/operaciones');
      const data = res.data?.data || res.data;
      const operaciones = Array.isArray(data) ? data : [];
      
      const hoy = new Date().toISOString().split('T')[0];
      const opsHoy = operaciones.filter(op => op.fecha === hoy);
      
      if (opsHoy.length === 0) {
        setEfectivoEsperado(0);
        return;
      }
      
      let totalEfectivo = 0;
      let countPagos = 0;
      
      opsHoy.forEach(op => {
        const pagos = Array.isArray(op.pagos) ? op.pagos : [];
        pagos.forEach(p => {
          const medio = (p.medio_pago || '').toLowerCase();
          if (medio.includes('efectivo')) {
            // Filtrar por turno usando la hora de registro
            const horaRegistroRaw = op.hora_registro || op.hora;
            const horaRegistro = typeof horaRegistroRaw === 'string' ? horaRegistroRaw : '00:00';
            const [horas, minutos, segundos] = horaRegistro.split(':').map(Number);
            const horaDecimal = horas + minutos / 60 + segundos / 3600;
            
            // Mañana: antes de las 14:00 (hora < 14)
            // Tarde: 14:00 a 20:00 (hora >= 14 y hora < 20)
            if (turno === 'Mañana' && horaDecimal < 14) {
              totalEfectivo += Number(p.monto || 0);
              countPagos++;
            } else if (turno === 'Tarde' && horaDecimal >= 14 && horaDecimal < 20) {
              totalEfectivo += Number(p.monto || 0);
              countPagos++;
            }
          }
        });
      });
      
      setEfectivoEsperado(totalEfectivo);
    } catch (err) {
      console.error('Error al calcular efectivo esperado:', err);
      setEfectivoEsperado(0);
    }
  };

  const abrirModal = () => {
    setFormCierre({ turno: '', efectivoFisico: '', observaciones: '' });
    setEfectivoEsperado(0);
    setPasoModal(1);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPasoModal(1);
    setConfirmacionAbierta(false);
    setFormCierre({ turno: '', efectivoFisico: '', observaciones: '' });
    setEfectivoEsperado(0);
  };

  const seleccionarTurno = async (turno) => {
    setFormCierre({ ...formCierre, turno });
    await calcularEfectivoEsperado(turno);
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
      const payload = {
        turno: formCierre.turno,
        efectivo_fisico: Number(formCierre.efectivoFisico),
        efectivo_esperado: efectivoEsperado,
        diferencia: calcularDiferencia(),
        observaciones: formCierre.observaciones
        // id_usuario_responsable se toma del token JWT en el backend (security best practice)
      };
      
      await api.post('/cierres-caja', payload);
      await cargarDatos();
      cerrarModal();
    } catch (err) {
      console.error('Error al guardar cierre:', err);
      alert('Error al guardar el cierre de caja');
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
      {/* Encabezado */}
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

      {/* KPIs Superiores */}
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
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${
            kpis.diferenciaAcumulada === 0
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
            <p className={`mt-1 text-2xl font-black tabular-nums ${
              kpis.diferenciaAcumulada === 0
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

      {/* Filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por responsable..."
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

      {/* Tabla */}
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
                {cierresFiltrados.length > 0 ? cierresFiltrados.map((cierre) => (
                  <tr key={cierre.id_cierre} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">{cierre.fecha}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold ${
                        cierre.turno === 'Mañana'
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
                    <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.ingresos)}</td>
                    <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.efectivo_esperado)}</td>
                    <td className="p-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(cierre.efectivo_fisico)}</td>
                    <td className="p-4 text-right">
                      {cierre.diferencia === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          {formatCurrency(cierre.diferencia)}
                        </span>
                      ) : cierre.diferencia < 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                          <AlertTriangle className="h-3 w-3" />
                          {formatCurrency(cierre.diferencia)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                          <AlertCircle className="h-3 w-3" />
                          {formatCurrency(cierre.diferencia)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                )) : (
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

      {/* Modal Nuevo Cierre */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {pasoModal === 1 ? 'Seleccionar Turno' : 'Arqueo de Caja'}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pasoModal === 1 ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 text-center">
                  ¿Qué turno deseas cerrar?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => seleccionarTurno('Mañana')}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 transition-all hover:border-brand-orange hover:bg-orange-50 active:scale-95"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-white">
                      <Sun className="h-8 w-8" />
                    </div>
                    <span className="text-lg font-bold text-slate-900">Mañana</span>
                    <span className="text-xs text-slate-500">Antes de las 14:00</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => seleccionarTurno('Tarde')}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 transition-all hover:border-brand-orange hover:bg-orange-50 active:scale-95"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange text-white">
                      <Moon className="h-8 w-8" />
                    </div>
                    <span className="text-lg font-bold text-slate-900">Tarde</span>
                    <span className="text-xs text-slate-500">14:00 a 20:00</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="h-4 w-4" />
                  <span>Responsable: <strong className="text-slate-900">{nombreResponsable}</strong></span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Turno</label>
                  <div className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 flex items-center text-sm font-bold text-slate-900">
                    {formCierre.turno}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Efectivo Esperado</label>
                  <div className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 flex items-center text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(efectivoEsperado)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Efectivo Físico</label>
                  <input
                    type="number"
                    value={formCierre.efectivoFisico}
                    onChange={(e) => setFormCierre({ ...formCierre, efectivoFisico: e.target.value })}
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Diferencia</label>
                  <div className={`h-12 w-full rounded-xl border px-4 flex items-center text-sm font-bold tabular-nums ${
                    calcularDiferencia() === 0 
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
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-orange focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              {pasoModal === 1 ? (
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="h-11 w-full rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPasoModal(1)}
                    disabled={guardando}
                    className="h-11 flex-1 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={abrirConfirmacion}
                    disabled={guardando || !formCierre.efectivoFisico}
                    className="h-11 flex-[2] rounded-lg bg-brand-orange text-sm font-bold text-white shadow-md shadow-brand-orange/20 transition hover:bg-brand-orange-hover active:scale-95 disabled:opacity-50"
                  >
                    Guardar Cierre
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Premium */}
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
                Estás a punto de cerrar el turno <strong className="text-slate-900">{formCierre.turno}</strong> como <strong className="text-slate-900">{nombreResponsable}</strong>.
              </p>
              <p className="text-sm text-slate-700 mt-2">
                Efectivo esperado: <strong className="text-slate-900">{formatCurrency(efectivoEsperado)}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Efectivo físico: <strong className="text-slate-900">{formatCurrency(Number(formCierre.efectivoFisico))}</strong>
              </p>
              <p className="text-sm text-slate-700">
                Diferencia: <strong className={`${
                  calcularDiferencia() === 0 ? 'text-emerald-600' : calcularDiferencia() < 0 ? 'text-rose-600' : 'text-blue-600'
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
    </div>
  );
}

export default CierresCaja;
