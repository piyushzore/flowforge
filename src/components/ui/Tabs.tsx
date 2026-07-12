import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`border-b border-slate-200 dark:border-slate-800 ${className}`}>
      <nav className="flex gap-0 -mb-px" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`
                relative inline-flex items-center gap-2 px-4 py-2.5
                text-sm font-medium whitespace-nowrap
                border-b-2 transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40
                ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `.trim()}
            >
              {tab.icon && (
                <span className={`inline-flex shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`
                    inline-flex items-center justify-center rounded-full px-2 py-0.5
                    text-xs font-medium min-w-[20px]
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }
                  `.trim()}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
