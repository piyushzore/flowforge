import React, { useState, useCallback } from 'react';
import { Database, Play, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { runDuckDBQuery } from '../../../engine/duckdb-worker';

interface DuckDBNodeConfigProps {
  sql: string;
  inputTableName?: string;
  onSqlChange: (sql: string) => void;
  previewRows?: Record<string, unknown>[];
  inputColumns?: string[];
}

export default function DuckDBNodeConfig({
  sql,
  inputTableName = 'input',
  onSqlChange,
  previewRows = [],
  inputColumns = [],
}: DuckDBNodeConfigProps) {
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await runDuckDBQuery({
      sql,
      tables: [{ name: inputTableName, rows: previewRows.slice(0, 500) }],
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.rows);
    }
  }, [sql, inputTableName, previewRows]);

  const resultCols = result && result.length > 0 ? Object.keys(result[0]) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg px-3 py-2">
        <Info size={13} className="shrink-0 text-blue-500" />
        <span>
          Upstream data is available as table <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{inputTableName}</code>.
          Columns: {inputColumns.length > 0 ? inputColumns.map(c => <code key={c} className="ml-1 font-mono bg-blue-100 dark:bg-blue-900/50 px-0.5 rounded">{c}</code>) : <em>none yet</em>}
        </span>
      </div>

      <div className="relative">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          SQL Query (DuckDB dialect)
        </label>
        <textarea
          value={sql}
          onChange={e => onSqlChange(e.target.value)}
          rows={8}
          placeholder={`SELECT *\nFROM ${inputTableName}\nWHERE amount > 100\nORDER BY created_at DESC\nLIMIT 1000`}
          className="w-full font-mono text-xs bg-slate-900 text-green-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 border border-slate-700"
          spellCheck={false}
        />
      </div>

      <button
        onClick={handleTest}
        disabled={loading || !sql.trim() || previewRows.length === 0}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        Test on Preview Data ({Math.min(previewRows.length, 500)} rows)
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-xs text-red-700 dark:text-red-300">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
          <pre className="whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={13} />
            {result.length} row{result.length !== 1 ? 's' : ''} returned
          </div>
          {result.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-40">
              <table className="text-xs w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    {resultCols.map(c => (
                      <th key={c} className="px-2 py-1 text-left font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      {resultCols.map(c => (
                        <td key={c} className="px-2 py-1 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[120px] truncate">
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Palette entry metadata for the DuckDB SQL node */
export const duckdbNodeMeta = {
  subType: 'duckdb-sql' as const,
  label: 'DuckDB SQL',
  category: 'transform' as const,
  description: 'Run DuckDB SQL in-browser (WASM)',
  icon: <Database size={15} />,
};
