import React, { useState } from 'react';
import {
  X,
  Trash2,
  Copy,
  EyeOff,
  Eye,
  MessageSquare,
  Settings,
  Table,
  Code,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Filter,
  Type,
  Hash,
  GitMerge,
  LayoutGrid,
  ArrowRightLeft,
  Layers,
  Columns,
  Shield,
  Eraser,
  Split,
  Link2,
  CalendarClock,
  Globe,
  Search,
  Bot,
  Terminal,
  FunctionSquare,
  Database,
  FileSpreadsheet,
  Cloud,
  Calendar,
  Webhook,
  Play,
} from 'lucide-react';
import type { PipelineNodeData, FieldSchema, FilterCondition } from '../../types/pipeline';

interface ConfigPanelProps {
  nodeId: string;
  nodeData: PipelineNodeData;
  onUpdate: (data: Partial<PipelineNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ConfigPanel({ nodeId, nodeData, onUpdate, onDelete, onClose }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'configure' | 'preview' | 'advanced'>('configure');

  // Sample fields for demo
  const sampleFields: FieldSchema[] = [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'company', type: 'string' },
    { name: 'plan', type: 'string' },
    { name: 'mrr', type: 'number' },
    { name: 'signup_date', type: 'date' },
    { name: 'status', type: 'string' },
    { name: 'country', type: 'string' },
  ];

  const renderConfigContent = () => {
    switch (nodeData.subType) {
      case 'filter':
        return <FilterConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'rename':
        return <RenameConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'change-type':
        return <ChangeTypeConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'join':
        return <JoinConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'group-by':
        return <GroupByConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'sort':
        return <SortConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'deduplicate':
        return <DeduplicateConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={sampleFields} />;
      case 'schedule':
        return <ScheduleConfigContent nodeData={nodeData} onUpdate={onUpdate} />;
      default:
        if (nodeData.category === 'source' || nodeData.category === 'destination') {
          return <ConnectionConfigContent nodeId={nodeId} nodeData={nodeData} onUpdate={onUpdate} />;
        }
        return <GenericConfigContent nodeData={nodeData} onUpdate={onUpdate} />;
    }
  };

  const samplePreviewData = [
    { id: 1, name: 'Acme Corp', email: 'contact@acme.com', plan: 'Enterprise', mrr: 2500 },
    { id: 2, name: 'TechStart', email: 'hello@techstart.io', plan: 'Growth', mrr: 800 },
    { id: 3, name: 'DataFlow', email: 'info@dataflow.co', plan: 'Starter', mrr: 150 },
    { id: 4, name: 'CloudNine', email: 'team@cloudnine.dev', plan: 'Growth', mrr: 1200 },
    { id: 5, name: 'NetPrime', email: 'ops@netprime.com', plan: 'Enterprise', mrr: 3800 },
  ];

  return (
    <div className="w-[420px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs
            ${nodeData.category === 'source' ? 'bg-emerald-500' : 
              nodeData.category === 'transform' ? 'bg-blue-500' : 
              nodeData.category === 'destination' ? 'bg-violet-500' : 
              nodeData.category === 'control' ? 'bg-amber-500' : 'bg-slate-500'}`}>
            {nodeData.category[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{nodeData.label}</h3>
            <p className="text-[11px] text-slate-500 capitalize">{nodeData.subType.replace(/-/g, ' ')}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {(['configure', 'preview', 'advanced'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors relative ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'configure' && <><Settings size={12} className="inline mr-1" />Configure</>}
            {tab === 'preview' && <><Table size={12} className="inline mr-1" />Preview</>}
            {tab === 'advanced' && <><Code size={12} className="inline mr-1" />Advanced</>}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'configure' && (
          <div className="p-4">
            {/* Node description */}
            <div className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg mb-4">
              <HelpCircle size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {getNodeDescription(nodeData.subType)}
              </p>
            </div>

            {/* Error message */}
            {nodeData.error && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg mb-4 border border-red-200 dark:border-red-800">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[12px] text-red-700 dark:text-red-400">{nodeData.error}</p>
                  {nodeData.fixSuggestion && (
                    <button className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                      <Lightbulb size={11} /> {nodeData.fixSuggestion}
                    </button>
                  )}
                </div>
              </div>
            )}

            {renderConfigContent()}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Preview</h4>
              <span className="text-[11px] text-slate-500">
                {(nodeData.previewData as any[] || samplePreviewData).length} rows × {Object.keys((nodeData.previewData as any[] || samplePreviewData)[0] || {}).length} columns
              </span>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      {Object.keys((nodeData.previewData as any[] || samplePreviewData)[0] || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-slate-500 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(nodeData.previewData as any[] || samplePreviewData).map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        {Object.values(row).map((val: any, j: number) => (
                          <td key={j} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="p-4">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Raw Configuration (JSON)</h4>
            <pre className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(nodeData, null, 2)}
            </pre>

            {/* Retry config */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Retry Policy</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-slate-600 dark:text-slate-400">Max Retries</label>
                  <select
                    className="text-[12px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    defaultValue="3"
                  >
                    {[0, 1, 2, 3, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-slate-600 dark:text-slate-400">Retry Delay (sec)</label>
                  <input type="number" defaultValue={10} min={1} max={300}
                    className="w-20 text-[12px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-slate-600 dark:text-slate-400">Timeout (sec)</label>
                  <input type="number" defaultValue={300} min={10} max={3600}
                    className="w-20 text-[12px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onUpdate({ disabled: !nodeData.disabled })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {nodeData.disabled ? <Eye size={13} /> : <EyeOff size={13} />}
          {nodeData.disabled ? 'Enable' : 'Disable'}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Copy size={13} /> Duplicate
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors ml-auto"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

// ============ Config Sub-Components ============

function FilterConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const conditions: FilterCondition[] = nodeData.conditions || [
    { id: '1', field: 'status', operator: 'equals', value: 'active', logic: 'AND' },
  ];

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not-equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater-than', label: 'Greater than' },
    { value: 'less-than', label: 'Less than' },
    { value: 'is-null', label: 'Is null' },
    { value: 'is-not-null', label: 'Is not null' },
  ];

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    const newConditions = conditions.map(c => c.id === id ? { ...c, ...updates } : c);
    onUpdate({ conditions: newConditions });
  };
  
  const addCondition = () => {
    onUpdate({
      conditions: [...conditions, { id: String(Date.now()), field: '', operator: 'equals', value: '', logic: 'AND' }]
    });
  };

  const removeCondition = (id: string) => {
    onUpdate({
      conditions: conditions.filter(c => c.id !== id)
    });
  };

  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Conditions</label>
      {conditions.map((cond, i) => (
        <div key={cond.id}>
          {i > 0 && (
            <div className="flex justify-center my-1">
              <select 
                value={cond.logic}
                onChange={(e) => updateCondition(cond.id, { logic: e.target.value as 'AND' | 'OR' })}
                className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 border-0 font-medium cursor-pointer"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <select
              value={cond.field}
              className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
            >
              <option value="">Field...</option>
              {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <select
              value={cond.operator}
              className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
            >
              {operators.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            <input
              value={cond.value}
              placeholder="Value"
              className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
            />
            <button 
              onClick={() => removeCondition(cond.id)}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-400 hover:text-red-600"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        className="w-full py-1.5 text-[12px] text-blue-600 border border-dashed border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
        onClick={addCondition}
      >
        + Add condition
      </button>
      <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg mt-4">
        <CheckCircle2 size={13} className="text-emerald-600" />
        <span className="text-[11px] text-emerald-700 dark:text-emerald-400">12 of 15 rows match</span>
      </div>
    </div>
  );
}

function RenameConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const renames = nodeData.renames || {};
  const handleRename = (field: string, newName: string) => {
    onUpdate({ renames: { ...renames, [field]: newName } });
  };

  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Rename Fields</label>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="flex-1 text-[12px] text-slate-600 dark:text-slate-400 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg truncate">
              {f.name}
            </span>
            <ArrowRightLeft size={12} className="text-slate-400 flex-shrink-0" />
            <input
              value={renames[f.name] || f.name}
              className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              onChange={(e) => handleRename(f.name, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeTypeConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const types = ['string', 'number', 'boolean', 'date', 'timestamp', 'json'];
  const typeChanges = nodeData.typeChanges || {};
  
  const handleChangeType = (field: string, newType: string) => {
    onUpdate({ typeChanges: { ...typeChanges, [field]: newType } });
  };

  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Change Data Types</label>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="flex-1 text-[12px] text-slate-600 dark:text-slate-400 truncate">{f.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">{f.type}</span>
            <span className="text-slate-400">→</span>
            <select
              value={typeChanges[f.name] || f.type}
              className="w-28 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              onChange={(e) => handleChangeType(f.name, e.target.value)}
            >
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Join Type</label>
        <div className="grid grid-cols-4 gap-1">
          {(['inner', 'left', 'right', 'full'] as const).map((type) => (
            <button
              key={type}
              className={`py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                (nodeData.joinConfig?.joinType || 'inner') === type
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Match Fields</label>
        <div className="flex gap-2 items-center">
          <select className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <option value="">Left field...</option>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
          <span className="text-slate-400">=</span>
          <select className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
            <option value="">Right field...</option>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function GroupByConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const aggFunctions = ['sum', 'avg', 'count', 'min', 'max', 'count-distinct'];
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Group By Fields</label>
        <div className="space-y-1">
          {fields.slice(0, 4).map((f) => (
            <label key={f.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-blue-600" defaultChecked={f.name === 'plan' || f.name === 'country'} />
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{f.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Aggregations</label>
        <div className="space-y-2">
          {fields.filter(f => f.type === 'number').map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <span className="flex-1 text-[12px] text-slate-600 dark:text-slate-400">{f.name}</span>
              <select className="w-32 text-[12px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                {aggFunctions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SortConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Sort Rules</label>
      <div className="flex gap-2 items-center">
        <select className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <select className="w-24 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <button className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-400"><X size={12} /></button>
      </div>
      <button className="w-full py-1.5 text-[12px] text-blue-600 border border-dashed border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
        + Add sort rule
      </button>
    </div>
  );
}

function DeduplicateConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Key Fields (match duplicates on)</label>
        <div className="space-y-1">
          {fields.map((f) => (
            <label key={f.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300 text-blue-600" defaultChecked={f.name === 'email'} />
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{f.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Keep</label>
        <div className="flex gap-2">
          <button className="flex-1 py-1.5 text-[12px] rounded-lg font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700">First</button>
          <button className="flex-1 py-1.5 text-[12px] rounded-lg font-medium bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Last</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleConfigContent({ nodeData, onUpdate }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Frequency</label>
        <select className="w-full text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          <option value="minutely">Every X minutes</option>
          <option value="hourly">Hourly</option>
          <option value="daily" selected>Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom cron</option>
        </select>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Time</label>
        <input type="time" defaultValue="09:00" className="w-full text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300" />
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Timezone</label>
        <select className="w-full text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern (US)</option>
          <option value="America/Los_Angeles">Pacific (US)</option>
          <option value="Europe/London">London</option>
          <option value="Asia/Kolkata">India (IST)</option>
        </select>
      </div>
      <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <p className="text-[11px] text-slate-500 mb-1 font-medium">Generated cron expression</p>
        <code className="text-[12px] font-mono text-slate-700 dark:text-slate-300">0 9 * * *</code>
      </div>
      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium mb-1">Next 3 runs</p>
        <ul className="space-y-0.5 text-[11px] text-blue-600 dark:text-blue-400">
          <li>Tomorrow 9:00 AM UTC</li>
          <li>Jul 12 9:00 AM UTC</li>
          <li>Jul 13 9:00 AM UTC</li>
        </ul>
      </div>
    </div>
  );
}

import { useUIStore } from '../../store/ui-store';

function ConnectionConfigContent({ nodeId, nodeData, onUpdate }: { nodeId: string; nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void }) {
  const isSource = nodeData.category === 'source';
  const openModal = useUIStore(s => s.openModal);

  const handleOpenConnect = () => {
    openModal('connect-data', {
      id: nodeId,
      label: nodeData.label,
      category: nodeData.category,
      subType: nodeData.subType
    });
  };

  return (
    <div className="space-y-4">
      {nodeData.configured ? (
        <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Connected
            </span>
            <span className="text-[10px] text-slate-400">Last updated: {String(nodeData.lastUpdated || 'Just now')}</span>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {String(nodeData.connectionName || 'Connected Source')}
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              {Number(nodeData.rowCount || 0).toLocaleString()} rows | {Number(nodeData.columnCount || 0)} columns
            </p>
          </div>

          {nodeData.outputSchema && Array.isArray(nodeData.outputSchema) && (
            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-950 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detected Schema:</span>
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                {nodeData.outputSchema.map((field: any, idx: number) => (
                  <span key={idx} className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    {field.name} <span className="text-slate-400 font-mono text-[9px]">({field.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1.5">
            <button
              onClick={handleOpenConnect}
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-750 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
            >
              Reconnect
            </button>
            <button
              onClick={handleOpenConnect}
              className="flex-1 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-all"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Database className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Configure Connection</h4>
            <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto">This node is not connected to a live data source yet.</p>
          </div>
          <button
            onClick={handleOpenConnect}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
          >
            🔌 Connect Data Source
          </button>
        </div>
      )}
    </div>
  );
}

function GenericConfigContent({ nodeData, onUpdate }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Label</label>
        <input
          value={nodeData.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        />
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Description</label>
        <textarea
          defaultValue={nodeData.description || ''}
          placeholder="Describe what this step does..."
          rows={3}
          className="w-full text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 resize-none"
        />
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-[12px] text-blue-700 dark:text-blue-400 font-medium">
          Configuration for {nodeData.subType.replace(/-/g, ' ')} nodes is available in the full version.
        </p>
      </div>
    </div>
  );
}

function getNodeDescription(subType: string): string {
  const descriptions: Record<string, string> = {
    'filter': 'Filter rows based on conditions. Only rows matching all conditions will pass through to the next step.',
    'sort': 'Sort rows by one or more fields in ascending or descending order.',
    'deduplicate': 'Remove duplicate rows based on key fields. Choose to keep the first or last occurrence.',
    'rename': 'Rename column names without changing the data. Useful for standardizing field names across sources.',
    'change-type': 'Cast data types for specific fields. For example, convert strings to numbers or dates.',
    'add-remove-fields': 'Add new computed fields or remove unwanted columns from the data.',
    'null-handling': 'Handle null values by replacing them with defaults, dropping rows, or applying custom rules.',
    'group-by': 'Group rows by one or more fields and compute aggregate values like sum, average, or count.',
    'join': 'Combine two data sources by matching rows on key fields. Supports inner, left, right, and full joins.',
    'union': 'Combine multiple data sources with the same schema into a single output.',
    'pivot': 'Transform rows into columns. Turn unique values in a column into separate columns.',
    'unpivot': 'Transform columns into rows. Turn multiple columns into key-value pairs.',
    'window-function': 'Apply window functions like ranking, running totals, and lag/lead without grouping.',
    'trim-case': 'Clean text data by trimming whitespace and changing case (upper, lower, title).',
    'regex': 'Extract or replace text patterns using regular expressions with a live preview.',
    'split-column': 'Split a column into multiple columns using a delimiter.',
    'concat': 'Concatenate multiple columns into a single field.',
    'date-parse': 'Parse date strings into date objects or format dates into custom string patterns.',
    'lookup': 'Enrich each row by looking up data from a reference table or source.',
    'api-enrichment': 'Call an external API to enrich data, with built-in rate limiting and caching.',
    'validation': 'Validate data quality with rules. Route failing rows to a quarantine output.',
    'ai-transform': 'Describe your transformation in plain English and let AI generate the logic.',
    'custom-code': 'Write custom Python or SQL code for complex transformations not covered by visual tools.',
    'schedule': 'Set up a recurring schedule to trigger this pipeline automatically.',
    'webhook-trigger': 'Generate a unique URL that triggers this pipeline when it receives a POST request.',
    'file-trigger': 'Automatically start the pipeline when a new file appears in a watched location.',
    'dependency-trigger': 'Start this pipeline only after another pipeline completes successfully.',
    'manual-trigger': 'Manually trigger this pipeline with a Run Now button or API call.',
    'conditional': 'Branch the pipeline based on a condition. Route data to different paths.',
    'merge': 'Merge multiple pipeline branches back into a single flow.',
    'loop': 'Iterate over items in a list or repeat a set of steps for each row.',
    'wait-delay': 'Pause pipeline execution for a specified duration before continuing.',
  };
  return descriptions[subType] || 'Configure this step to process your data.';
}
