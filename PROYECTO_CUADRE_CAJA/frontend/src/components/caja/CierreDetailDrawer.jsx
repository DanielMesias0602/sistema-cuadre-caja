import { useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  User,
  Users,
  Sun,
  Moon,
  Wallet,
  TrendingUp,
  CreditCard,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';

export function CierreDetailDrawer({ cierre, onClose }) {
  const open = Boolean(cierre);
  const lastCierre = useRef(cierre);
  if (cierre) lastCierre.current = cierre;
  const cData = lastCierre.current;
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!cData) return null;

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return '-';
    if (typeof fechaRaw === 'string' && fechaRaw.includes('T')) {
      const d = new Date(fechaRaw);
      return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
    }
    const d = new Date(fechaRaw + 'T00:00:00');
    return !isNaN(d.getTime()) ? d.toLocaleDateString('es-PE') : fechaRaw;
  };

  const formatearHora = (timestampRaw) => {
    if (!timestampRaw) return '--:--';
    const d = new Date(timestampRaw);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Lima',
    });
  };

  const calcularRangoTiempo = (primeraTs, ultimaTs) => {
    if (!primeraTs || !ultimaTs) return '--:--';
    const primera = new Date(primeraTs).getTime();
    const ultima = new Date(ultimaTs).getTime();
    if (isNaN(primera) || isNaN(ultima)) return '--:--';

    if (Math.abs(ultima - primera) < 60_000) {
      return `A las ${formatearHora(primeraTs)}`;
    }

    return `${formatearHora(primeraTs)} - ${formatearHora(ultimaTs)}`;
  };

  const diferencia = Number(cData.diferencia || 0);
  const esTurnoManana = (cData.turno || '').toLowerCase() === 'mañana';
  const estadoUpper = String(cData.estado || 'CERRADO').toUpperCase();
  const pendientesEvidencia = Number(cData.operaciones_pendientes_evidencia || 0);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
          }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del Cierre de Caja"
        className={`absolute inset-y-0 right-0 flex w-full max-w-full sm:max-w-[520px] flex-col bg-white text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <header className="border-b border-slate-100 px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
              {estadoUpper}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>

          <div className="mt-3 sm:mt-4 flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Cierre #{cData.id_cierre || '-'}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold ${esTurnoManana
                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                }`}
            >
              {esTurnoManana ? <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
              Turno {cData.turno}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
              <span className="tabular-nums">{formatearFecha(cData.fecha)}</span>
            </div>
            {cData.fecha_fin && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                <span className="tabular-nums">
                  {new Date(cData.fecha_fin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 sm:mt-5">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">Efectivo Físico Arqueado</p>
            <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(cData.efectivo_fisico)}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:gap-6">

            {/* RESPONSABLE */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">Responsable de Caja</p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {cData.responsable || 'No asignado'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">
                    ID Usuario: {cData.id_usuario_responsable || '-'}
                  </p>
                </div>
              </div>
            </section>

            {/* PARTICIPANTES DEL TURNO */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <h3 className="mb-3 sm:mb-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                Equipo del Turno
              </h3>

              <div className="space-y-3 sm:space-y-4">
                {cData.participantes && cData.participantes.length > 0 ? (
                  cData.participantes.map((p) => (
                    <div
                      key={p.id_usuario}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs sm:text-sm font-semibold text-slate-900">
                              {p.nombre_completo}
                            </p>
                            <p className="mt-0.5 sm:mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
                              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                              {calcularRangoTiempo(p.primera_operacion, p.ultima_operacion)}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-indigo-50 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-indigo-700">
                          {Number(p.total_operaciones)} {Number(p.total_operaciones) === 1 ? 'op.' : 'ops.'}
                        </span>
                      </div>

                      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-2 sm:p-3">
                          <p className="text-[10px] sm:text-xs text-slate-500">Total vendido</p>
                          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold tabular-nums text-slate-900">
                            {formatCurrency(p.total_ventas)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2 sm:p-3">
                          <p className="text-[10px] sm:text-xs text-emerald-700">En efectivo</p>
                          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold tabular-nums text-emerald-800">
                            {formatCurrency(p.efectivo_vendido)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-slate-500">
                    Solo el responsable registró operaciones.
                  </p>
                )}
              </div>
            </section>

            {/* RESUMEN FINANCIERO */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <h3 className="mb-3 sm:mb-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> Resumen Financiero del Turno
              </h3>
              <dl className="flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-600 min-w-0">Total Ingresos</dt>
                  <dd className="font-bold text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.total_ingresos)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-600 min-w-0">
                    <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Total No Efectivo</span>
                  </dt>
                  <dd className="font-semibold text-slate-700 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.total_no_efectivo)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-2">
                  <dt className="text-slate-600 font-medium min-w-0">Efectivo Esperado</dt>
                  <dd className="font-semibold text-slate-700 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.efectivo_esperado)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-slate-600 min-w-0">
                    <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Total Salidas</span>
                  </dt>
                  <dd className="font-semibold text-slate-700 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.total_salidas)}
                  </dd>
                </div>

                <div className="mt-1 sm:mt-2 border-t border-dashed border-slate-200 pt-2 sm:pt-3 flex items-center justify-between gap-2">
                  <dt className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 min-w-0">Efec. después de Salidas</dt>
                  <dd className="text-sm sm:text-base font-black text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.efectivo_despues_salidas ?? (Number(cData.efectivo_esperado || 0) - Number(cData.total_salidas || 0)))}
                  </dd>
                </div>
              </dl>
            </section>

            {/* AVISO: EVIDENCIA EMPRESA PENDIENTE */}
            {pendientesEvidencia > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">
                      Evidencia de empresa pendiente
                    </p>
                    <p className="mt-1 text-[11px] sm:text-xs leading-relaxed text-amber-800">
                      <strong>
                        {pendientesEvidencia} {pendientesEvidencia === 1 ? 'operación tiene' : 'operaciones tienen'}
                      </strong>{' '}
                      pago no efectivo sin evidencia de empresa registrada.
                      El cierre ya está cerrado; la evidencia puede subirse después desde el historial de operaciones.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* CUADRE Y ARQUEO */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <h3 className="mb-3 sm:mb-4 flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" /> Cuadre y Arqueo
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-slate-600">Efectivo Esperado</span>
                  <span className="font-bold text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.efectivo_esperado)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-slate-600">Efectivo Físico Contado</span>
                  <span className="font-bold text-slate-900 tabular-nums flex-shrink-0">
                    {formatCurrency(cData.efectivo_fisico)}
                  </span>
                </div>

                <div
                  className={`mt-3 sm:mt-4 rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${diferencia === 0
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : diferencia < 0
                      ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                      : 'border-blue-200 bg-blue-50/70 text-blue-900'
                    }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${diferencia === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : diferencia < 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {diferencia === 0 ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : diferencia < 0 ? (
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                        {diferencia === 0 ? 'Cuadre Perfecto' : diferencia < 0 ? 'Faltante' : 'Sobrante'}
                      </p>
                      <p className="text-[10px] sm:text-xs opacity-80">
                        {diferencia === 0
                          ? 'Sin desajustes'
                          : diferencia < 0
                            ? 'Físico menor al esperado'
                            : 'Físico mayor al esperado'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-lg sm:text-xl font-black tabular-nums ${diferencia === 0
                        ? 'text-emerald-700'
                        : diferencia < 0
                          ? 'text-rose-700'
                          : 'text-blue-700'
                        }`}
                    >
                      {formatCurrency(diferencia)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* OBSERVACIONES */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <h3 className="mb-2 flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" /> Observaciones del Cierre
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 rounded-lg p-2.5 sm:p-3.5 border border-slate-100 leading-relaxed whitespace-pre-wrap">
                {cData.observaciones || cData.observacion || 'Sin observaciones registradas al momento del arqueo.'}
              </p>
            </section>

          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 sm:h-11 w-full rounded-xl bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
          >
            Cerrar Detalle
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default CierreDetailDrawer;