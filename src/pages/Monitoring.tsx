import { useState } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { Search, Filter, Calendar, Play, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Monitoring() {
  const { runs } = usePipelineStore();
  const [search, setSearch] = useState('');

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Run History</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor pipeline executions and troubleshoot failures.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by pipeline name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Filter size={14} /> Status
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Calendar size={14} /> Time Range
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Pipeline</th>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Rows In/Out</th>
                <th className="px-6 py-3 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      run.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {run.status === 'success' ? <CheckCircle2 size={12} /> :
                       run.status === 'failed' ? <XCircle size={12} /> :
                       <Play size={12} className="animate-pulse" />}
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {run.pipelineName}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <div className="flex flex-col">
                      <span>{new Date(run.startedAt).toLocaleString()}</span>
                      <span className="text-[11px]">{formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {run.duration}s
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm">
                      <span className="text-slate-900 dark:text-slate-300">{run.rowsIn.toLocaleString()} in</span>
                      <span className="text-slate-500">{run.rowsOut.toLocaleString()} out</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 capitalize">
                    {run.trigger}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No runs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
