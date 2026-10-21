import { Calendar } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export function DateRangePicker({ fechaDesde, fechaHasta, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11 w-full min-w-[250px]">
      <Calendar className="text-slate-400 w-4 h-4 flex-shrink-0" />
      <ReactDatePicker
        selected={fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null}
        onChange={(date) => {
          const formatted = date ? date.toLocaleDateString('en-CA') : '';
          onChange({ fechaDesde: formatted, fechaHasta });
        }}
        selectsStart
        startDate={fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null}
        endDate={fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null}
        placeholderText="Desde"
        dateFormat="dd/MM/yyyy"
        className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm text-slate-700 focus:ring-0 cursor-pointer appearance-none truncate"
        calendarClassName="premium-calendar"
        popperClassName="premium-calendar-popper z-50"
      />
      <span className="text-slate-400 flex-shrink-0">-</span>
      <ReactDatePicker
        selected={fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null}
        onChange={(date) => {
          const formatted = date ? date.toLocaleDateString('en-CA') : '';
          onChange({ fechaDesde, fechaHasta: formatted });
        }}
        selectsEnd
        startDate={fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null}
        endDate={fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null}
        minDate={fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null}
        placeholderText="Hasta"
        dateFormat="dd/MM/yyyy"
        className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm text-slate-700 focus:ring-0 cursor-pointer appearance-none truncate"
        calendarClassName="premium-calendar"
        popperClassName="premium-calendar-popper z-50"
      />
    </div>
  );
}