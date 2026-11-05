import { Calendar } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const parsearFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();
  const fechaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const fechaLatina = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const coincidencia = fechaISO || fechaLatina;
  if (!coincidencia) return null;

  const [anio, mes, dia] = fechaISO
    ? coincidencia.slice(1).map(Number)
    : [coincidencia[3], coincidencia[2], coincidencia[1]].map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio
    || fecha.getMonth() !== mes - 1
    || fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
};

const formatearFechaISO = (fecha) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

export function SingleDatePicker({ value, onChange, placeholder = "Seleccionar fecha" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 h-[42px] w-full shadow-sm dark:shadow-none transition-all focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20">
      <Calendar className="text-slate-400 dark:text-slate-500 w-4 h-4 flex-shrink-0" />
      <ReactDatePicker
        selected={parsearFecha(value)}
        onChange={(date) => {
          onChange(formatearFechaISO(date));
        }}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 cursor-pointer appearance-none truncate"
        calendarClassName="premium-calendar"
        popperClassName="premium-calendar-popper"
        showPopperArrow={false}
      />
    </div>
  );
}