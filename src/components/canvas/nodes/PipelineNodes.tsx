import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Database, FileSpreadsheet, Cloud, Upload, Webhook,
  Table, Filter, ArrowRightLeft, Columns, Hash, Type,
  GitMerge, LayoutGrid, Layers, FunctionSquare, Wand2,
  Code2, Search, Eraser, CalendarClock, Split, Link2,
  Shield, Bot, Terminal,
  Target, Send, Download, Server,
  GitBranch, Merge, Repeat, Clock,
  Calendar, Globe, FileInput, Play, StickyNote,
  CheckCircle2, XCircle, Loader2, AlertCircle,
} from 'lucide-react';
import type { PipelineNodeData, NodeCategory } from '../../types/pipeline';

// Icon mapping for node sub-types
const nodeIcons: Record<string, React.ReactNode> = {
  // Sources
  'google-sheets': <FileSpreadsheet size={16} />,
  'postgres': <Database size={16} />,
  'mysql': <Database size={16} />,
  'sql-server': <Database size={16} />,
  'oracle': <Database size={16} />,
  'mongodb': <Database size={16} />,
  'mariadb': <Database size={16} />,
  'sqlite': <Database size={16} />,
  'snowflake': <Cloud size={16} />,
  'bigquery': <Cloud size={16} />,
  'redshift': <Cloud size={16} />,
  'databricks': <Cloud size={16} />,
  'clickhouse': <Database size={16} />,
  's3': <Cloud size={16} />,
  'gcs': <Cloud size={16} />,
  'azure-blob': <Cloud size={16} />,
  'sftp': <Server size={16} />,
  'csv-upload': <Upload size={16} />,
  'salesforce': <Cloud size={16} />,
  'hubspot': <Cloud size={16} />,
  'shopify': <Cloud size={16} />,
  'stripe': <Cloud size={16} />,
  'ga4': <Cloud size={16} />,
  'mailchimp': <Cloud size={16} />,
  'zendesk': <Cloud size={16} />,
  'google-ads': <Cloud size={16} />,
  'meta-ads': <Cloud size={16} />,
  'quickbooks': <Cloud size={16} />,
  'slack': <Cloud size={16} />,
  'airtable': <Table size={16} />,
  'kafka': <Layers size={16} />,
  'kinesis': <Layers size={16} />,
  'webhook': <Webhook size={16} />,
  'rest-api': <Globe size={16} />,
  'graphql': <Code2 size={16} />,
  'jdbc': <Database size={16} />,
  // Transforms
  'filter': <Filter size={16} />,
  'sort': <ArrowRightLeft size={16} />,
  'deduplicate': <Layers size={16} />,
  'rename': <Type size={16} />,
  'change-type': <Hash size={16} />,
  'add-remove-fields': <Columns size={16} />,
  'null-handling': <Shield size={16} />,
  'group-by': <LayoutGrid size={16} />,
  'join': <GitMerge size={16} />,
  'union': <Merge size={16} />,
  'pivot': <ArrowRightLeft size={16} />,
  'unpivot': <ArrowRightLeft size={16} />,
  'window-function': <FunctionSquare size={16} />,
  'trim-case': <Eraser size={16} />,
  'regex': <Search size={16} />,
  'split-column': <Split size={16} />,
  'concat': <Link2 size={16} />,
  'date-parse': <CalendarClock size={16} />,
  'lookup': <Search size={16} />,
  'api-enrichment': <Globe size={16} />,
  'validation': <Shield size={16} />,
  'ai-transform': <Bot size={16} />,
  'custom-code': <Terminal size={16} />,
  // Control
  'conditional': <GitBranch size={16} />,
  'merge': <Merge size={16} />,
  'loop': <Repeat size={16} />,
  'wait-delay': <Clock size={16} />,
  // Orchestration
  'schedule': <Calendar size={16} />,
  'webhook-trigger': <Webhook size={16} />,
  'file-trigger': <FileInput size={16} />,
  'dependency-trigger': <GitBranch size={16} />,
  'manual-trigger': <Play size={16} />,
  // Note
  'annotation': <StickyNote size={16} />,
};

const categoryColors: Record<NodeCategory, { bg: string; text: string; border: string }> = {
  source: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  transform: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  destination: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  control: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  orchestration: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
  note: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
};

const statusIcons: Record<string, React.ReactNode> = {
  running: <Loader2 size={14} className="animate-spin-slow text-blue-500" />,
  success: <CheckCircle2 size={14} className="text-emerald-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  queued: <Clock size={14} className="text-slate-400 animate-progress-pulse" />,
};

function PipelineNodeComponent({ data, selected }: NodeProps<PipelineNodeData>) {
  const category = data.category || 'transform';
  const colors = categoryColors[category];
  const icon = nodeIcons[data.subType] || <Layers size={16} />;
  const statusIcon = data.runStatus && data.runStatus !== 'idle' ? statusIcons[data.runStatus] : null;
  const isNote = category === 'note';

  const runStateClass = data.runStatus === 'running'
    ? 'running'
    : data.runStatus === 'success'
    ? 'success'
    : data.runStatus === 'failed'
    ? 'failed'
    : '';

  const disabledClass = data.disabled ? 'disabled' : '';

  return (
    <div className={`pipeline-node ${category} ${runStateClass} ${disabledClass} ${selected ? 'selected' : ''}`}>
      {/* Input handle */}
      {category !== 'orchestration' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5"
        />
      )}

      {/* Node header */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.text}`}>
            {icon}
          </div>

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-slate-900 dark:text-white truncate">
                {data.label}
              </span>
              {statusIcon && <span className="flex-shrink-0">{statusIcon}</span>}
            </div>
            <span className={`text-[11px] ${colors.text} capitalize`}>
              {data.subType.replace(/-/g, ' ')}
            </span>
          </div>

          {/* Config status */}
          {!isNote && (
            <div className="flex-shrink-0">
              {data.error ? (
                <div className="relative group">
                  <AlertCircle size={14} className="text-red-500" />
                  <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-50">
                    <div className="bg-red-600 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap max-w-48 truncate">
                      {data.error}
                    </div>
                  </div>
                </div>
              ) : data.configured ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600" />
              )}
            </div>
          )}
        </div>

        {/* Note content */}
        {isNote && data.noteContent && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
            {data.noteContent}
          </p>
        )}

        {/* Run progress */}
        {data.runStatus === 'running' && data.runProgress !== undefined && (
          <div className="mt-2">
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${data.runProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">{data.rowsProcessed?.toLocaleString()} rows</span>
          </div>
        )}

        {/* Mini data preview */}
        {data.runStatus === 'success' && data.previewData && data.previewData.length > 0 && (
          <div className="mt-2 -mx-1 overflow-hidden rounded-md border border-slate-100 dark:border-slate-700">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  {Object.keys(data.previewData[0]).slice(0, 3).map((key) => (
                    <th key={key} className="px-1.5 py-0.5 text-left text-slate-500 font-medium truncate max-w-[60px]">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.previewData.slice(0, 2).map((row, i) => (
                  <tr key={i} className="border-t border-slate-50 dark:border-slate-800">
                    {Object.values(row).slice(0, 3).map((val, j) => (
                      <td key={j} className="px-1.5 py-0.5 text-slate-600 dark:text-slate-400 truncate max-w-[60px]">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Output handle */}
      {category !== 'note' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5"
        />
      )}
    </div>
  );
}

export const SourceNode = memo(PipelineNodeComponent);
export const TransformNode = memo(PipelineNodeComponent);
export const DestinationNode = memo(PipelineNodeComponent);
export const ControlFlowNode = memo(PipelineNodeComponent);
export const OrchestrationNode = memo(PipelineNodeComponent);
export const NoteNode = memo(PipelineNodeComponent);

export const nodeTypes = {
  source: SourceNode,
  transform: TransformNode,
  destination: DestinationNode,
  control: ControlFlowNode,
  orchestration: OrchestrationNode,
  note: NoteNode,
};
