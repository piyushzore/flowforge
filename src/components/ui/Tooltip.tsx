import React, { useState } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-4',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-4',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-4',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-4',
};

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      <div
        role="tooltip"
        className={`
          absolute z-50 pointer-events-none
          ${positionClasses[position]}
          transition-all duration-150 ease-in-out
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `.trim()}
      >
        <div className="relative bg-slate-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg max-w-xs">
          {content}
          {/* Arrow */}
          <span className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      </div>
    </div>
  );
}
