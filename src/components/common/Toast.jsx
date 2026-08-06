import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export default function Toast() {
  const { toast, hideToast } = useCalendar();

  // Auto-dismiss — LOGIC UNCHANGED
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => hideToast(), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  if (!toast) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error:   <AlertCircle  className="w-5 h-5 text-rose-500 shrink-0" />,
    info:    <Info         className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  // Left border accent stripe colors
  const borderMap = {
    success: 'border-l-emerald-400',
    error:   'border-l-rose-400',
    info:    'border-l-indigo-400',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] transition-all duration-300">
      <div
        className={`
          flex items-center gap-3 px-4 py-3.5 rounded-2xl neu-card-sm border-l-4
          max-w-sm ${borderMap[toast.type] || borderMap.info}
        `}
      >
        {iconMap[toast.type] || iconMap.info}
        <p className="text-sm font-semibold text-slate-700 pr-2 flex-1">{toast.message}</p>
        <button
          onClick={hideToast}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg neu-btn flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
