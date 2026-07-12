import React from 'react';
import {
  Activity, Zap, Timer, Layers, AlertTriangle,
  CheckCircle2, XCircle, Radio, BarChart3, Gauge,
  ArrowDownUp, Server, Cpu
} from 'lucide-react';
import { usePipelineStore, type ProcessingMode } from '../../store/pipeline-store';

const modeConfig: Record<ProcessingMode, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  batch: {
    label: 'Batch',
    icon: <Layers size={14} />,
    desc: 'Process all data in one pass',
    color: 'blue',
  },
  'micro-batch': {
    label: 'Micro-Batch',
    icon: <Cpu size={14} />,
    desc: 'Fast batches with lower latency',
    color: 'violet',
  },
  stream: {
    label: 'Stream',
    icon: <Radio size={14} />,
    desc: 'Continuous real-time processing',
    color: 'emerald',
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function RunControlPanel() {
  const { isRunning, processingMode, setProcessingMode, runStats, stopRun } = usePipelineStore();

  if (!isRunning && !runStats) return null;

  const stats = runStats;
  const isStream = processingMode === 'stream';
  const hasError = stats?.errorNodeId !== null && stats?.errorNodeId !== undefined;
  const isComplete = !isRunning && stats && !hasError;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in-up">
      <div className={`
        bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
        border rounded-2xl shadow-2xl
        min-w-[520px] max-w-[680px]
        transition-all duration-500
        ${hasError
          ? 'border-red-300 dark:border-red-800 shadow-red-500/10'
          : isComplete
            ? 'border-emerald-300 dark:border-emerald-800 shadow-emerald-500/10'
            : 'border-slate-200 dark:border-slate-700 shadow-blue-500/5'
        }
      `}>
        {/* Top bar: status + mode selector */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {/* Status indicator */}
            {isRunning && !hasError && (
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className={`absolute inset-0 rounded-full ${isStream ? 'bg-emerald-500' : 'bg-blue-500'} opacity-20 animate-ping`} />
                <div className={`w-2.5 h-2.5 rounded-full ${isStream ? 'bg-emerald-500' : 'bg-blue-500'}`} />
              </div>
            )}
            {hasError && (
              <XCircle size={18} className="text-red-500" />
            )}
            {isComplete && (
              <CheckCircle2 size={18} className="text-emerald-500" />
            )}

            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {hasError ? 'Pipeline Failed' : isComplete ? 'Pipeline Completed' : isStream ? 'Streaming Live' : 'Running Pipeline'}
              </span>
              {stats && (
                <span className="ml-2 text-[11px] text-slate-500 font-mono">
                  {formatDuration(stats.elapsedMs)}
                </span>
              )}
            </div>
          </div>

          {/* Processing mode selector — only when not running */}
          {!isRunning && !hasError && !isComplete && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              {(Object.keys(modeConfig) as ProcessingMode[]).map((mode) => {
                const cfg = modeConfig[mode];
                const active = processingMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setProcessingMode(mode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                      active
                        ? `bg-white dark:bg-slate-700 text-${cfg.color}-600 dark:text-${cfg.color}-400 shadow-sm`
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Stop button */}
          {isRunning && (
            <button
              onClick={stopRun}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-red-50 dark:bg-red-950 text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-all"
            >
              <div className="w-2 h-2 rounded-sm bg-red-500" />
              Stop
            </button>
          )}
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="px-4 py-3">
            <div className="grid grid-cols-5 gap-3">
              {/* Rows processed */}
              <StatCard
                icon={<BarChart3 size={13} />}
                label="Rows"
                value={formatNumber(stats.processedRows)}
                subValue={!isStream ? `/ ${formatNumber(stats.totalRows)}` : undefined}
                color="blue"
              />
              {/* Throughput */}
              <StatCard
                icon={<Gauge size={13} />}
                label="Throughput"
                value={formatNumber(stats.throughput)}
                subValue="rows/s"
                color="emerald"
              />
              {/* Latency */}
              <StatCard
                icon={<Timer size={13} />}
                label="Latency"
                value={`${stats.latency}`}
                subValue="ms"
                color="amber"
              />
              {/* Nodes */}
              <StatCard
                icon={<Server size={13} />}
                label="Nodes"
                value={`${stats.nodesCompleted}`}
                subValue={`/ ${stats.nodesTotal}`}
                color="violet"
              />
              {/* Status */}
              <StatCard
                icon={hasError ? <AlertTriangle size={13} /> : <Activity size={13} />}
                label="Status"
                value={hasError ? 'Error' : isComplete ? 'Done' : isStream ? 'Live' : 'OK'}
                color={hasError ? 'red' : isComplete ? 'emerald' : 'blue'}
              />
            </div>

            {/* Progress bar for batch mode */}
            {!isStream && stats.totalRows > 0 && isFinite(stats.totalRows) && (
              <div className="mt-3">
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hasError
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : isComplete
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min((stats.processedRows / stats.totalRows) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {hasError && stats.errorMessage && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-red-700 dark:text-red-400">{stats.errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-slate-400">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-base font-bold font-mono ${colorMap[color] || colorMap.blue}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-[10px] text-slate-400 font-mono">{subValue}</span>
        )}
      </div>
    </div>
  );
}
