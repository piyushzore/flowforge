import { useState, useEffect, useMemo } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { Search, Filter, Calendar, Play, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Clock, Zap, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

const SLA_THRESHOLD_SECONDS = 15;

export default function Monitoring() {
  const { runs, loadRuns } = usePipelineStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'sla-breach'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRuns();

    // Subscribe to real-time run updates
    const channel = supabase
      .channel('pipeline_runs_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_runs' },
        () => {
          loadRuns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRuns]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRuns();
    setIsRefreshing(false);
  };

  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      const matchSearch = !search ||
        run.pipelineName.toLowerCase().includes(search.toLowerCase()) ||
        run.id.toLowerCase().includes(search.toLowerCase());

      const isSlaBreached = (run.duration || 0) > SLA_THRESHOLD_SECONDS;

      let matchStatus = true;
      if (statusFilter === 'success') matchStatus = run.status === 'success' && !isSlaBreached;
      else if (statusFilter === 'failed') matchStatus = run.status === 'failed';
      else if (statusFilter === 'sla-breach') matchStatus = isSlaBreached;

      return matchSearch && matchStatus;
    });
  }, [runs, search, statusFilter]);

  const stats = useMemo(() => {
    const total = runs.length;
    const successes = runs.filter(r => r.status === 'success').length;
    const failures = runs.filter(r => r.status === 'failed').length;
    const breaches = runs.filter(r => (r.duration || 0) > SLA_THRESHOLD_SECONDS).length;
    const avgDuration = total > 0
      ? (runs.reduce((acc, r) => acc + (r.duration || 0), 0) / total).toFixed(1)
      : '0';
    const rate = total > 0 ? Math.round((successes / total) * 100) : 100;

    return { total, successes, failures, breaches, avgDuration, rate };
  }, [runs]);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Run History & SLA Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track pipeline executions, latency, and SLA compliance in real time.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Runs</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Success Rate</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.rate}%</span>
            <span className="text-xs text-slate-400">({stats.successes} successful)</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.avgDuration}s</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">SLA Breaches ({`>${SLA_THRESHOLD_SECONDS}s`})</p>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${stats.breaches > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {stats.breaches}
            </span>
            <span className="text-xs text-slate-400">{stats.breaches === 0 ? '100% on target' : 'requires attention'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by pipeline name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['all', 'success', 'failed', 'sla-breach'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'all' ? 'All' :
                 tab === 'success' ? 'Successful' :
                 tab === 'failed' ? 'Failed' : 'SLA Breaches'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">SLA Target</th>
                <th className="px-6 py-3 font-medium">Pipeline</th>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Rows In/Out</th>
                <th className="px-6 py-3 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRuns.map(run => {
                const isSlaBreached = (run.duration || 0) > SLA_THRESHOLD_SECONDS;
                return (
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
                    <td className="px-6 py-4">
                      {isSlaBreached ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={11} /> SLA Breached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                          <Check size={11} /> On Target
                        </span>
                      )}
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
                    <td className="px-6 py-4 text-slate-500 font-mono">
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
                );
              })}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
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
  );
}
