import React, { useState, useMemo, useRef } from 'react';
import { X, Search, Download, Table, ArrowUpDown, Hash, Columns } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface DataPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, unknown>[];
}

/** Rows ≤ this count use simple rendering; above uses virtual scrolling. */
const VIRTUAL_THRESHOLD = 200;
const ROW_HEIGHT = 34; // px per row

export default function DataPreviewModal({ open, onClose, title, data }: DataPreviewModalProps) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val => String(val ?? '').toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      result.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, search, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = columns.join(',');
    const rows = filteredData.map(r =>
      columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const useVirtual = filteredData.length > VIRTUAL_THRESHOLD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[920px] max-w-[94vw] h-[75vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Table size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                  {data.length.toLocaleString()} total rows
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live data inspector &amp; CSV exporter{useVirtual ? ' — virtual scrolling active' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download size={13} /> Export CSV
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/50 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter cell values..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Columns size={13} /> {columns.length} columns</span>
            <span className="flex items-center gap-1"><Hash size={13} /> {filteredData.length.toLocaleString()} rows{search ? ' (filtered)' : ''}</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {filteredData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              No matching records found.
            </div>
          ) : useVirtual ? (
            <VirtualTable columns={columns} rows={filteredData} rowHeight={ROW_HEIGHT} onSort={handleSort} sortCol={sortCol} _sortAsc={sortAsc} />
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[11px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-4 py-2.5 w-12 font-semibold text-slate-400">#</th>
                    {columns.map(col => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="px-4 py-2.5 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortCol === col ? 'text-blue-500' : ''}`} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-mono">
                      <td className="px-4 py-2 text-slate-400 text-[10px]">{idx + 1}</td>
                      {columns.map(col => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || val === '';
                        return (
                          <td key={col} className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-xs truncate">
                            {isNull ? (
                              <span className="text-slate-300 dark:text-slate-600 italic">null</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {filteredData.length.toLocaleString()} / {data.length.toLocaleString()} rows{useVirtual ? ' — virtual scroll' : ''}
          </span>
          <span className="text-xs text-slate-400">Scroll to see all data</span>
        </div>
      </div>
    </div>
  );
}

/** Virtualized table for large datasets (>200 rows). */
function VirtualTable({
  columns,
  rows,
  rowHeight,
  onSort,
  sortCol,
  _sortAsc,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  rowHeight: number;
  onSort: (col: string) => void;
  sortCol: string | null;
  _sortAsc: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Sticky header */}
      <div className="overflow-x-auto shrink-0 bg-slate-100 dark:bg-slate-800">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-4 py-2.5 w-12 font-semibold text-slate-400">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => onSort(col)}
                  className="px-4 py-2.5 font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown size={11} className={`text-slate-400 ${sortCol === col ? 'text-blue-500' : ''}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable virtualized body */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map(vRow => {
            const row = rows[vRow.index];
            return (
              <div
                key={vRow.key}
                data-index={vRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vRow.start}px)`,
                }}
                className="flex font-mono text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800"
              >
                <div className="px-4 py-2 w-12 shrink-0 text-slate-400 text-[10px]">{vRow.index + 1}</div>
                {columns.map(col => {
                  const val = row[col];
                  const isNull = val === null || val === undefined || val === '';
                  return (
                    <div key={col} className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate shrink-0" style={{ minWidth: 120 }}>
                      {isNull ? (
                        <span className="text-slate-300 dark:text-slate-600 italic">null</span>
                      ) : (
                        String(val)
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
