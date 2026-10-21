import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['⌘', 'J'], description: 'Open AI Pipeline Designer', category: 'AI & Actions' },
  { keys: ['⌘', 'Z'], description: 'Undo last change', category: 'Canvas Controls' },
  { keys: ['⌘', 'Shift', 'Z'], description: 'Redo undone change', category: 'Canvas Controls' },
  { keys: ['⌘', 'Y'], description: 'Redo change (alt)', category: 'Canvas Controls' },
  { keys: ['Backspace'], description: 'Delete selected node', category: 'Canvas Controls' },
  { keys: ['Space', '+ Drag'], description: 'Pan around canvas', category: 'Navigation' },
  { keys: ['Scroll'], description: 'Zoom in / out of canvas', category: 'Navigation' },
  { keys: ['?'], description: 'Toggle this Shortcuts Guide', category: 'Help' },
  { keys: ['Esc'], description: 'Close modals & panels', category: 'Navigation' },
];

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[520px] max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Power user shortcuts for FlowForge</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">{cat}</h3>
              <div className="space-y-1.5">
                {SHORTCUTS.filter(s => s.category === cat).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <kbd key={i} className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center text-xs text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 font-mono font-semibold bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">?</kbd> anywhere to reopen</span>
          <button onClick={onClose} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
