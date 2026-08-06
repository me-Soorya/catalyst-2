import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading study sessions...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
      <span className="text-sm font-medium animate-pulse">{label}</span>
    </div>
  );
}
