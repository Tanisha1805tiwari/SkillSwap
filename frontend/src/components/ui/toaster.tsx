'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Simple global toast store
const toastListeners: Array<(toast: Toast) => void> = [];

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

function emit(type: ToastType, message: string) {
  const t: Toast = { id: Math.random().toString(36).slice(2), type, message };
  toastListeners.forEach((l) => l(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    toastListeners.push(handler);
    return () => { const i = toastListeners.indexOf(handler); if (i > -1) toastListeners.splice(i, 1); };
  }, []);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
    info: <Info className="w-4 h-4 text-cyan-400" />,
  };

  const borders = {
    success: 'border-emerald-500/20',
    error: 'border-red-500/20',
    info: 'border-cyan-500/20',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl glass-card border pointer-events-auto',
            'animate-slide-up shadow-xl min-w-[280px] max-w-sm',
            borders[t.type]
          )}
        >
          {icons[t.type]}
          <span className="text-sm text-white flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-muted-foreground hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
