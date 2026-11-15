import React, { useMemo } from 'react';
import { X, CheckCircle2, XCircle, Zap, Info } from 'lucide-react';
import type { HealedSolution } from '../../lib/ai-healer';

interface HealingDiffModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: (patchCode: string) => void;
  solution: HealedSolution;
  sampleBefore: Record<string, unknown>[];
  sampleAfter: Record<string, unknown>[];
}

/** Determine which cells changed between before/after rows at same index */
function changedFields(
  before: Record<string, unknown>[],
  after: Record<string, unknown>[]
): Set<string> {
  const changed = new Set<string>();
  const len = Math.min(before.length, after.length);
  for (let i = 0; i < len; i++) {
    for (const key of Object.keys(after[i])) {
      if (String(before[i]?.[key] ?? '') !== String(after[i][key] ?? '')) {
        changed.add(key);
      }
    }
  }
  return changed;
}

export default function HealingDiffModal({
  open,
  onClose,
  onApprove,
  solution,
  sampleBefore,
  sampleAfter,
}: HealingDiffModalProps) {
  const displayBefore = sampleBefore.slice(0, 8);
  const displayAfter = sampleAfter.slice(0, 8);
  const beforeCols = useMemo(() => (displayBefore[0] ? Object.keys(displayBefore[0]) : []), [displayBefore]);
  const afterCols = useMemo(() => (displayAfter[0] ? Object.keys(displayAfter[0]) : []), [displayAfter]);
  const changed = useMemo(() => changedFields(displayBefore, displayAfter), [displayBefore, displayAfter]);

  const confidencePct = Math.round((solution.confidence ?? 0) * 100);
  const confidenceColor =
    confidencePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
    confidencePct >= 50 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-white">
              <Zap size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Hot-Patch Preview — Side-by-Side Diff
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review data changes before applying the AI healing patch
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Diagnosis banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <Info size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p><strong>Diagnosis:</strong> {solution.diagnosis}</p>
              <p>
                <strong>Confidence:</strong>{' '}
                <span className={confidenceColor}>{confidencePct}%</span>
              </p>
            </div>
          </div>

          {/* Side-by-side diff table */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <XCircle size={13} className="text-red-400" />
                Before (Original)
                <span className="ml-auto text-slate-400">{displayBefore.length} rows shown</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-900/50 max-h-64">
                <table className="text-xs w-full">
                  <thead className="bg-red-50 dark:bg-red-950/30 sticky top-0">
                    <tr>
                      {beforeCols.map(c => (
                        <th key={c} className={`px-2 py-1.5 text-left font-medium border-b border-red-200 dark:border-red-900/50 whitespace-nowrap ${changed.has(c) ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {changed.has(c) ? '⚠ ' : ''}{c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayBefore.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        {beforeCols.map(c => (
                          <td key={c} className={`px-2 py-1 whitespace-nowrap max-w-[120px] truncate ${changed.has(c) ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {displayBefore.length === 0 && (
                      <tr><td className="px-3 py-2 text-slate-400 italic" colSpan={beforeCols.length || 1}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* After */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <CheckCircle2 size={13} className="text-emerald-400" />
                After (Patched)
                <span className="ml-auto text-slate-400">{displayAfter.length} rows shown</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-900/50 max-h-64">
                <table className="text-xs w-full">
                  <thead className="bg-emerald-50 dark:bg-emerald-950/30 sticky top-0">
                    <tr>
                      {afterCols.map(c => (
                        <th key={c} className={`px-2 py-1.5 text-left font-medium border-b border-emerald-200 dark:border-emerald-900/50 whitespace-nowrap ${changed.has(c) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {changed.has(c) ? '✓ ' : ''}{c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayAfter.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        {afterCols.map(c => (
                          <td key={c} className={`px-2 py-1 whitespace-nowrap max-w-[120px] truncate ${changed.has(c) ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                            {String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {displayAfter.length === 0 && (
                      <tr><td className="px-3 py-2 text-slate-400 italic" colSpan={afterCols.length || 1}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Changed fields legend */}
          {changed.size > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <strong>Changed fields:</strong>{' '}
              {[...changed].map(f => (
                <span key={f} className="inline-block px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded mr-1 font-mono">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Applying this patch will re-run the pipeline from the affected node.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => onApprove(solution.patchCode)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Zap size={13} className="fill-white" />
              Apply Patch
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
