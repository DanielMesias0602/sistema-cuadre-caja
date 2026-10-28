import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Bell, X } from 'lucide-react';
import {
  TURNO_MANANA,
  TURNO_TARDE,
  getHoraPeru,
  getFechaPeru,
  hhmmToMinutos,
} from '../../utils/horaPeru';

const STORAGE_KEY = 'turnoAlertThresholds';

const calcularAvisoActivo = (idsDescartados) => {
  const horaActual = getHoraPeru().slice(0, 5);
  const horaMin = hhmmToMinutos(horaActual);

  const turnos = [
    { config: TURNO_MANANA, color: 'amber' },
    { config: TURNO_TARDE, color: 'indigo' },
  ];

  for (const { config, color } of turnos) {
    const cierreMin = hhmmToMinutos(config.horaCierre);
    const dif = cierreMin - horaMin;

    let nivel = null;
    let Icon = null;
    let titulo = '';
    let mensaje = '';

    // El rango asegura que el banner se mantenga visible durante 1 minuto exacto
    if (dif <= 30 && dif > 29) {
      nivel = 'preventivo';
      Icon = Bell;
      titulo = `Cambio de turno ${config.nombre}`;
      mensaje = `Faltan 30 minutos para el cambio de turno previsto (${config.horaCierre}).`;
    } else if (dif <= 10 && dif > 9) {
      nivel = 'urgente';
      Icon = Clock;
      titulo = `Cambio de turno ${config.nombre} en pocos minutos`;
      mensaje = `Faltan 10 minutos. Prepara el cierre de caja.`;
    } else if (dif <= 5 && dif > 4) {
      nivel = 'final';
      Icon = AlertTriangle;
      titulo = `Cambio de turno ${config.nombre} inminente`;
      mensaje = `Faltan 5 minutos. Realiza el cierre ahora.`;
    }

    if (nivel) {
      const idAviso = `${config.nombre}-${nivel}`;
      if (idsDescartados.includes(idAviso)) return null;
      return { turno: config.nombre, nivel, color, titulo, mensaje, Icon, idAviso };
    }
  }

  return null;
};

// Paleta de colores Premium para la tarjeta flotante
const getEstilos = (nivel, turnoColor) => {
  if (nivel === 'preventivo') {
    return turnoColor === 'amber'
      ? { iconBg: 'bg-amber-100', iconText: 'text-amber-600', bar: 'bg-amber-500' }
      : { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', bar: 'bg-indigo-500' };
  }
  if (nivel === 'urgente') {
    return { iconBg: 'bg-orange-100', iconText: 'text-orange-600', bar: 'bg-orange-500' };
  }
  return { iconBg: 'bg-rose-100', iconText: 'text-rose-600', bar: 'bg-rose-500' };
};

export function TurnoAlertBanner() {
  const [horaTick, setHoraTick] = useState(0);
  
  const [descartados, setDescartados] = useState(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (!guardado) return { fecha: getFechaPeru(), ids: [] };
      const { fecha, ids } = JSON.parse(guardado);
      return { fecha, ids: fecha === getFechaPeru() ? (ids || []) : [] };
    } catch {
      return { fecha: getFechaPeru(), ids: [] };
    }
  });

  // TRUCO DE PRECISIÓN: Sincronizar exactamente con el segundo 00 de cada minuto
  useEffect(() => {
    let timeoutId;
    
    const tickExacto = () => {
      setHoraTick((t) => t + 1);
      // Calcular cuántos milisegundos faltan para el próximo minuto exacto
      const msHastaProximoMinuto = 60000 - (Date.now() % 60000);
      timeoutId = setTimeout(tickExacto, msHastaProximoMinuto);
    };

    // Iniciar el primer temporizador
    timeoutId = setTimeout(tickExacto, 60000 - (Date.now() % 60000));
    
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (!guardado) return;
      const { fecha } = JSON.parse(guardado);
      if (fecha !== getFechaPeru()) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignorar
    }
  }, [horaTick]);

  const descartadosHoy = descartados.fecha === getFechaPeru() ? descartados.ids : [];
  const aviso = calcularAvisoActivo(descartadosHoy);

  if (!aviso) return null;

  const styles = getEstilos(aviso.nivel, aviso.color);
  const Icon = aviso.Icon;

  const handleDescartar = () => {
    const nuevosDescartados = [...descartadosHoy, aviso.idAviso];
    setDescartados({ fecha: getFechaPeru(), ids: nuevosDescartados });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fecha: getFechaPeru(), ids: nuevosDescartados })
      );
    } catch {
      // ignorar
    }
  };

  return (
    // DISEÑO FLOTANTE (TOAST):
    // fixed -> flota sobre la aplicación
    // top-24 right-6 -> posición en la esquina superior derecha (debajo del header)
    // w-[380px] -> ancho fijo para que no sea un rectángulo alargado
    // rounded-3xl -> bordes muy curvos
    // z-[9999] -> siempre visible por encima de todo
    <div className="fixed top-24 right-6 z-[9999] w-[380px] bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-in-right">
      
      {/* Franja superior decorativa */}
      <div className={`h-1.5 w-full ${styles.bar}`} />

      <div className="p-4 flex items-start gap-4 relative">
        {/* Icono con fondo circular */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Textos */}
        <div className="flex-1 pr-6">
          <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight">{aviso.titulo}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">{aviso.mensaje}</p>
        </div>
        
        {/* Botón de cerrar */}
        <button
          type="button"
          onClick={handleDescartar}
          className="absolute top-4 right-4 shrink-0 rounded-full p-1 text-slate-300 dark:text-slate-500 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Descartar este aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TurnoAlertBanner;