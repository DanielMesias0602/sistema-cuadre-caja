// Helper para manejar la hora de Perú (UTC-5) sin depender del navegador.
// Se usa toLocaleString con timeZone 'America/Lima'.

export const TURNO_MANANA = {
  nombre: 'Mañana',
  horaCierre: '14:00',
  avisoPreventivo: '13:00',
  avisoUrgente: '13:45',
  avisoFinal: '13:55',
};

export const TURNO_TARDE = {
  nombre: 'Tarde',
  horaCierre: '20:00',
  avisoPreventivo: '19:00',
  avisoUrgente: '19:45',
  avisoFinal: '19:55',
};

// Devuelve la hora actual en Perú (formato "HH:MM:SS")
export const getHoraPeru = () => {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Lima',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Devuelve la fecha actual en Perú (formato "YYYY-MM-DD")
export const getFechaPeru = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

// Convierte "HH:MM" a minutos totales
export const hhmmToMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Devuelve cuántos minutos faltan entre horaActual ("HH:MM:SS" o "HH:MM")
// y horaObjetivo ("HH:MM")
export const minutosRestantes = (horaActual, horaObjetivo) => {
  const actual = hhmmToMinutos(horaActual.slice(0, 5));
  const objetivo = hhmmToMinutos(horaObjetivo);
  return Math.max(0, objetivo - actual);
};