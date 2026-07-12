import React from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default' | 'purple';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  error:
    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info:
    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  default:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  purple:
    'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  default: 'bg-slate-400',
  purple: 'bg-violet-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `.trim()}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
