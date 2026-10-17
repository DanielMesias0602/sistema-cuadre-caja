export function SummaryCard({ title, value, subtitle, icon: Icon, color = 'blue', highlight = false }) {
  const colorStyles = {
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600 bg-orange-100',
      border: 'border-orange-100',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600 bg-blue-100',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600 bg-emerald-100',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600 bg-amber-100',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600 bg-rose-100',
      border: 'border-rose-100',
    },
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600 bg-indigo-100',
      border: 'border-indigo-100',
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between ${
        highlight ? 'ring-2 ring-orange-500/20' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${style.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs font-medium text-gray-500 mt-1 flex items-center gap-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
