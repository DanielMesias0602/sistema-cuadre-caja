import { Calendar } from 'lucide-react';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export function SingleDatePicker({ value, onChange, placeholder = "Seleccionar fecha" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-[42px] w-full shadow-sm transition-all focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20">
      <Calendar className="text-slate-400 w-4 h-4 flex-shrink-0" />
      <ReactDatePicker
        selected={value ? new Date(value + 'T00:00:00') : null}
        onChange={(date) => {
          const formatted = date ? date.toLocaleDateString('en-CA') : '';
          onChange(formatted);
        }}
        placeholderText={placeholder}
        dateFormat="dd/MM/yyyy"
        className="flex-1 min-w-0 border-0 bg-transparent outline-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer appearance-none truncate"
        calendarClassName="premium-calendar"
        popperClassName="premium-calendar-popper"
        showPopperArrow={false}
      />
    </div>
  );
}