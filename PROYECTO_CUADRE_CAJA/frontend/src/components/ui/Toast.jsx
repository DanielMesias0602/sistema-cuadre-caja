import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';

let nextToastId = 0;

const toastStyles = {
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/90 dark:text-rose-200',
    icon: XCircle
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200',
    icon: AlertTriangle
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200',
    icon: CheckCircle
  }
};

export function ToastViewport() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    const activeTimers = timers.current;
    const removeToast = (id) => {
      const timer = activeTimers.get(id);
      if (timer) clearTimeout(timer);
      activeTimers.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    const handleToast = (event) => {
      const { message, variant = 'error' } = event.detail || {};
      if (!message) return;

      const id = ++nextToastId;
      const normalizedVariant = toastStyles[variant] ? variant : 'error';
      setToasts((current) => [...current, { id, message, variant: normalizedVariant }]);
      activeTimers.set(id, setTimeout(() => removeToast(id), 5000));
    };

    window.addEventListener('app:toast', handleToast);
    return () => {
      window.removeEventListener('app:toast', handleToast);
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const dismiss = (id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const style = toastStyles[toast.variant];
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${style.container}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-70 transition hover:opacity-100"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
