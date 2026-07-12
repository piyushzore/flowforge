import React from 'react';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: CardPadding;
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const isClickable = hover || !!onClick;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        bg-white dark:bg-slate-900 rounded-xl
        border border-slate-200 dark:border-slate-800
        ${paddingClasses[padding]}
        ${
          isClickable
            ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40'
            : ''
        }
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
