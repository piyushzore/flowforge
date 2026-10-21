import { useState, useMemo } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  BarChart3, Hash, Percent, Eye, ChevronDown, ChevronUp
} from 'lucide-react';

interface ColumnProfile {
  name: string;
  type: string;
  totalRows: number;
  nullCount: number;
  nullPercent: number;
  uniqueCount: number;
  uniquePercent: number;
  minValue: string;
  maxValue: string;
  sampleValues: string[];
  qualityScore: number;
}

function profileColumn(data: Record<string, unknown>[], colName: string): ColumnProfile {
  const totalRows = data.length;
  const values = data.map(r => r[colName]);
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  const nullCount = totalRows - nonNull.length;
  const uniqueVals = new Set(nonNull.map(v => String(v)));

  const isNumeric = nonNull.every(v => !isNaN(Number(v)));
  let minValue = '';
  let maxValue = '';
  if (isNumeric && nonNull.length > 0) {
    const nums = nonNull.map(v => Number(v));
    minValue = String(Math.min(...nums));
    maxValue = String(Math.max(...nums));
  } else if (nonNull.length > 0) {
    const strs = nonNull.map(v => String(v)).sort();
    minValue = strs[0];
    maxValue = strs[strs.length - 1];
  }

  const sampleValues = Array.from(uniqueVals).slice(0, 5);

  const nullScore = Math.max(0, 100 - (nullCount / totalRows) * 100);
  const uniquenessScore = uniqueVals.size > 1 ? 100 : 50;
  const qualityScore = Math.round((nullScore * 0.7 + uniquenessScore * 0.3));

  return {
    name: colName,
    type: isNumeric ? 'number' : 'string',
    totalRows,
    nullCount,
    nullPercent: totalRows > 0 ? Math.round((nullCount / totalRows) * 100) : 0,
    uniqueCount: uniqueVals.size,
    uniquePercent: totalRows > 0 ? Math.round((uniqueVals.size / totalRows) * 100) : 0,
    minValue,
    maxValue,
    sampleValues,
    qualityScore,
  };
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'red';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-${color}-100 text-${color}-700 dark:bg-${color}-950/40 dark:text-${color}-400`}>
      {score >= 80 ? <CheckCircle2 size={10} /> : score >= 60 ? <AlertTriangle size={10} /> : <XCircle size={10} />}
      {score}
    </span>
  );
}

function ColumnCard({ profile }: { profile: ColumnProfile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Hash size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{profile.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
            {profile.type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Percent size={11} />
            {profile.nullPercent}% null
          </div>
          <QualityBadge score={profile.qualityScore} />
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
          {/* Quality bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Quality Score</span>
              <span className="font-semibold">{profile.qualityScore}/100</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${profile.qualityScore >= 80 ? 'bg-emerald-500' : profile.qualityScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${profile.qualityScore}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Rows', value: profile.totalRows.toLocaleString() },
              { label: 'Null Count', value: `${profile.nullCount} (${profile.nullPercent}%)` },
              { label: 'Unique Values', value: `${profile.uniqueCount} (${profile.uniquePercent}%)` },
              { label: 'Min / Max', value: profile.minValue && profile.maxValue ? `${profile.minValue} / ${profile.maxValue}` : '—' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Sample values */}
          {profile.sampleValues.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Sample Values</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.sampleValues.map((v, i) => (
                  <span key={i} className="text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataQuality() {
  const { pipelines } = usePipelineStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const allNodes = useMemo(() => {
    const nodes: { pipelineId: string; pipelineName: string; nodeId: string; label: string; previewData: Record<string, unknown>[] }[] = [];
    pipelines.forEach(p => {
      p.nodes.forEach(n => {
        if (n.data.previewData && Array.isArray(n.data.previewData) && n.data.previewData.length > 0) {
          nodes.push({
            pipelineId: p.id,
            pipelineName: p.name,
            nodeId: n.id,
            label: n.data.label,
            previewData: n.data.previewData as Record<string, unknown>[],
          });
        }
      });
    });
    return nodes;
  }, [pipelines]);

  const selectedNodeData = allNodes.find(n => n.nodeId === selectedNodeId);

  const columnProfiles = useMemo(() => {
    if (!selectedNodeData || !selectedNodeData.previewData.length) return [];
    const columns = Object.keys(selectedNodeData.previewData[0]);
    return columns.map(col => profileColumn(selectedNodeData.previewData, col));
  }, [selectedNodeData]);

  const overallScore = columnProfiles.length > 0
    ? Math.round(columnProfiles.reduce((s, c) => s + c.qualityScore, 0) / columnProfiles.length)
    : 0;

  const pipelinesWithData = useMemo(() => {
    const ids = new Set(allNodes.map(n => n.pipelineId));
    return pipelines.filter(p => ids.has(p.id));
  }, [pipelines, allNodes]);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={24} className="text-emerald-500" />
            Data Quality
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Column-level profiling and quality scores for your pipeline data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left — Node selector */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nodes with Data</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {allNodes.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  Run a pipeline first to generate data profiles.
                </div>
              ) : allNodes.map(n => (
                <button
                  key={n.nodeId}
                  onClick={() => { setSelectedNodeId(n.nodeId); setSelectedPipelineId(n.pipelineId); }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedNodeId === n.nodeId ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{n.label}</p>
                  <p className="text-[11px] text-slate-400 truncate">{n.pipelineName}</p>
                  <p className="text-[11px] text-slate-400">{n.previewData.length} rows · {Object.keys(n.previewData[0]).length} cols</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Profile detail */}
        <div className="lg:col-span-3">
          {!selectedNodeData ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center shadow-sm">
              <BarChart3 size={48} className="text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Select a node to profile</h3>
              <p className="text-sm text-slate-400">Choose a node from the left panel to see column-level quality metrics.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall score card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selectedNodeData.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedNodeData.pipelineName} · {selectedNodeData.previewData.length} rows · {columnProfiles.length} columns</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${overallScore >= 80 ? 'text-emerald-600' : overallScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {overallScore}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overall Score</div>
                  </div>
                </div>
                <div className="mt-3 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overallScore >= 80 ? 'bg-emerald-500' : overallScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
              </div>

              {/* Column profiles */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Column Profiles</p>
                {columnProfiles.map(profile => (
                  <ColumnCard key={profile.name} profile={profile} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
