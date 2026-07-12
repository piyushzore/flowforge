import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  X,
  GitBranch,
  Plug,
  FileText,
  Zap,
  Plus,
  LayoutTemplate,
  Activity,
  Moon,
  Sun,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { usePipelineStore } from '../../store/pipeline-store';
import { useConnectorStore } from '../../store/connector-store';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  category: 'Pipelines' | 'Connectors' | 'Pages' | 'Actions';
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

// ─── Fuzzy match ────────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  if (lowerText.includes(lowerQuery)) return true;

  let qi = 0;
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const theme = useUIStore((s) => s.theme);
  const darkMode = theme === 'dark';

  const pipelines = usePipelineStore((s) => s.pipelines);
  const connectorInstances = useConnectorStore((s) => s.instances);

  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Register global shortcut ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, setOpen]);

  // ── Focus input on open ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // ── Close helper ────────────────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, [setOpen]);

  // ── Build items ─────────────────────────────────────────────────────────────

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Pipelines
    pipelines.forEach((p) => {
      items.push({
        id: `pipeline-${p.id}`,
        category: 'Pipelines',
        label: p.name,
        description: p.description || `${p.status} pipeline`,
        icon: <GitBranch className="w-4 h-4" />,
        onSelect: () => {
          navigate(`/pipelines/${p.id}`);
          close();
        },
      });
    });

    // Connectors
    connectorInstances.forEach((c) => {
      items.push({
        id: `connector-${c.id}`,
        category: 'Connectors',
        label: c.name,
        description: `Health: ${c.health}`,
        icon: <Plug className="w-4 h-4" />,
        onSelect: () => {
          navigate(`/connectors/${c.id}`);
          close();
        },
      });
    });

    // Pages
    const pages: { label: string; path: string; description: string }[] = [
      { label: 'Dashboard', path: '/', description: 'Overview and metrics' },
      { label: 'Pipelines', path: '/pipelines', description: 'Manage data pipelines' },
      { label: 'Connectors', path: '/connectors', description: 'Manage data sources and destinations' },
      { label: 'Monitoring', path: '/monitoring', description: 'Pipeline runs and health' },
      { label: 'Templates', path: '/templates', description: 'Browse pipeline templates' },
      { label: 'Settings', path: '/settings', description: 'Workspace settings' },
    ];
    pages.forEach((page) => {
      items.push({
        id: `page-${page.path}`,
        category: 'Pages',
        label: page.label,
        description: page.description,
        icon: <FileText className="w-4 h-4" />,
        onSelect: () => {
          navigate(page.path);
          close();
        },
      });
    });

    // Actions
    items.push(
      {
        id: 'action-create-pipeline',
        category: 'Actions',
        label: 'Create Pipeline',
        description: 'Start a new data pipeline',
        icon: <Plus className="w-4 h-4" />,
        shortcut: '⌘N',
        onSelect: () => {
          navigate('/pipelines/new');
          close();
        },
      },
      {
        id: 'action-add-connector',
        category: 'Actions',
        label: 'Add Connector',
        description: 'Connect a new data source or destination',
        icon: <Plug className="w-4 h-4" />,
        onSelect: () => {
          navigate('/connectors/new');
          close();
        },
      },
      {
        id: 'action-browse-templates',
        category: 'Actions',
        label: 'Browse Templates',
        description: 'Explore pre-built pipeline templates',
        icon: <LayoutTemplate className="w-4 h-4" />,
        onSelect: () => {
          navigate('/templates');
          close();
        },
      },
      {
        id: 'action-view-monitoring',
        category: 'Actions',
        label: 'View Monitoring',
        description: 'Check pipeline run statuses',
        icon: <Activity className="w-4 h-4" />,
        onSelect: () => {
          navigate('/monitoring');
          close();
        },
      },
      {
        id: 'action-toggle-dark-mode',
        category: 'Actions',
        label: 'Toggle Dark Mode',
        description: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
        icon: darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        shortcut: '⌘D',
        onSelect: () => {
          toggleTheme();
          close();
        },
      }
    );

    return items;
  }, [pipelines, connectorInstances, darkMode, navigate, close, toggleDarkMode]);

  // ── Filtered items ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems.filter(
      (item) =>
        fuzzyMatch(query, item.label) ||
        (item.description && fuzzyMatch(query, item.description))
    );
  }, [query, allItems]);

  // ── Grouped items ─────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    const order = ['Actions', 'Pipelines', 'Connectors', 'Pages'];
    order.forEach((cat) => {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) groups[cat] = items;
    });
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(
    () => Object.values(grouped).flat(),
    [grouped]
  );

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatFiltered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatFiltered[selectedIndex]) {
            flatFiltered[selectedIndex].onSelect();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [flatFiltered, selectedIndex, close]
  );

  // ── Scroll selected into view ───────────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ── Reset index on query change ─────────────────────────────────────────────

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 py-3.5 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={close}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-4 py-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {category}
                  </span>
                </div>

                {/* Items */}
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left
                        transition-colors duration-75
                        ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }
                      `.trim()}
                    >
                      <span
                        className={`shrink-0 ${
                          isSelected
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        {item.description && (
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              isSelected
                                ? 'text-blue-500/70 dark:text-blue-400/70'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd
                          className={`shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border ${
                            isSelected
                              ? 'border-blue-200 dark:border-blue-700 text-blue-500 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 shrink-0 text-blue-400 dark:text-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
