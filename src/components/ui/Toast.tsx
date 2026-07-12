import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/ui-store';
import type { Toast as ToastType } from '../../store/ui-store';

// ─── Individual Toast ───────────────────────────────────────────────────────────

const toastConfig: Record<
  ToastType['type'],
  { icon: React.ReactNode; borderColor: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    borderColor: 'border-l-emerald-500',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    borderColor: 'border-l-amber-500',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
  },
};

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 200);
    }, duration);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 w-96 max-w-[calc(100vw-2rem)]
        bg-white dark:bg-slate-900
        rounded-lg shadow-lg
        border border-slate-200 dark:border-slate-800
        border-l-4 ${config.borderColor}
        px-4 py-3
        transition-all duration-200 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `.trim()}
    >
      <span className={`shrink-0 mt-0.5 ${config.iconColor}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
