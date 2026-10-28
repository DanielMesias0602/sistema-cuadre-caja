import { Receipt, ScrollText, CalendarDays, Images, ArrowUpRight, Maximize2, ImageOff, CheckCircle2 } from 'lucide-react';

export function EvidenceCard({ operacion, onImageClick, onClick }) {
  const docType = operacion.tipo_comprobante || 'FACTURA';
  const isFactura = docType.toUpperCase() === 'FACTURA';

  const styles = isFactura ? {
    icon: ScrollText,
    tile: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-800',
    pill: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-800',
    bar: 'from-blue-500 to-blue-300',
  } : {
    icon: Receipt,
    tile: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 ring-orange-200 dark:ring-orange-800',
    pill: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 ring-orange-200 dark:ring-orange-800',
    bar: 'from-brand-orange to-orange-300',
  };

  const Icon = styles.icon;

  const initials = (operacion.cliente || 'S/N').split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const imagenes = Array.isArray(operacion.evidencias) ? operacion.evidencias : [];
  const shown = imagenes.slice(0, 3);
  const extra = imagenes.length - shown.length;

  // NUEVO: Detectar si todos los pagos están verificados
  const pagos = Array.isArray(operacion.pagos) ? operacion.pagos : [];
  const todosVerificados = pagos.length > 0 && pagos.every(p => {
    const est = String(p.estado || '').toUpperCase();
    return est === 'VERIFICADO' || est === 'VERIFICADA' || est === 'COMPLETADO';
  });

  const obtenerUrl = (img) => {
    if (!img) return null;
    if (img.url_firmada) return img.url_firmada;
    if (img.storage_key?.startsWith('http')) return img.storage_key;
    return null;
  };

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-none cursor-pointer">
      <div className={`h-1 w-full bg-gradient-to-r ${styles.bar}`} />

      <header className="flex items-start gap-3.5 px-5 pt-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${styles.tile}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${styles.pill}`}>
            {docType}
          </span>
          <h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {operacion.serie}-{operacion.numero}
          </h3>
        </div>
        <time className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {operacion.fecha}
        </time>
      </header>

      <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cliente</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{operacion.cliente}</p>
        </div>
      </div>

      <div className={`mx-5 mt-4 grid h-48 gap-2 ${
        shown.length === 1 ? 'grid-cols-1' : shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3 grid-rows-2'
      }`}>
        {shown.map((img, i) => {
          const isLastWithExtra = extra > 0 && i === shown.length - 1;
          const url = obtenerUrl(img);

          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (url) onImageClick(url);
              }}
              className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 cursor-pointer group-hover:ring-brand-orange/30 ${
                shown.length >= 3 && i === 0 ? 'col-span-2 row-span-2' : ''
              }`}
            >
              {url ? (
                <>
                  <img
                    src={url}
                    alt="Evidencia"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="hidden absolute inset-0 flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                    <ImageOff className="h-6 w-6 mb-1" />
                    <span className="text-[10px]">Sin vista previa</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity delay-100" />
                  </div>
                </>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  <ImageOff className="h-6 w-6 mb-1" />
                  <span className="text-[10px]">Sin vista previa</span>
                </div>
              )}

              {isLastWithExtra && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-white backdrop-blur-sm">
                  +{extra}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/70 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 dark:bg-orange-950/40 text-brand-orange">
            <Images className="h-3.5 w-3.5" />
          </span>
          <span><strong className="text-slate-900 dark:text-slate-100">{imagenes.length}</strong> {imagenes.length === 1 ? 'evidencia' : 'evidencias'}</span>
        </span>
        
        {/* NUEVO: Cambia el botón si ya está conciliado */}
        {todosVerificados ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Conciliado
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-orange transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/40"
          >
            Conciliar
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </footer>
    </article>
  );
}