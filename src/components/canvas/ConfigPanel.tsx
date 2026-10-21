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
  RefreshCw,
} from 'lucide-react';
import SCDConfigContent from './SCDConfigPanel';
import type { PipelineNodeData, FieldSchema, FilterCondition, JoinConfig } from '../../types/pipeline';
import { usePipelineStore } from '../../store/pipeline-store';

interface ConfigPanelProps {
  nodeId: string;
  nodeData: PipelineNodeData;
  onUpdate: (data: Partial<PipelineNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ConfigPanel({ nodeId, nodeData, onUpdate, onDelete, onClose }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'configure' | 'preview' | 'advanced'>('configure');

  const activePipelineId = usePipelineStore(s => s.activePipelineId);
  const pipeline = usePipelineStore(s => s.pipelines.find(p => p.id === activePipelineId));

  // Determine actual fields based on node connections and previewData
  let dynamicFields: FieldSchema[] = [];
  if (pipeline) {
    if (nodeData.previewData && Array.isArray(nodeData.previewData) && nodeData.previewData.length > 0) {
      const firstRow = nodeData.previewData[0] as Record<string, any>;
      dynamicFields = Object.keys(firstRow).map(key => {
        const val = firstRow[key];
        let type: 'string' | 'number' | 'boolean' | 'date' | 'json' = 'string';
        if (typeof val === 'number') type = 'number';
        else if (typeof val === 'boolean') type = 'boolean';
        else if (typeof val === 'object') type = 'json';
        return { name: key, type };
      });
    } else {
      // Look for ALL incoming edges to infer schema from the source nodes
      const incomingEdges = pipeline.edges.filter(e => e.target === nodeId);
      const allKeys = new Set<string>();
      
      incomingEdges.forEach(incomingEdge => {
        const sourceNode = pipeline.nodes.find(n => n.id === incomingEdge.source);
        if (sourceNode && sourceNode.data.previewData && Array.isArray(sourceNode.data.previewData) && sourceNode.data.previewData.length > 0) {
          const firstRow = sourceNode.data.previewData[0] as Record<string, any>;
          Object.keys(firstRow).forEach(key => {
            if (!allKeys.has(key)) {
              allKeys.add(key);
              const val = firstRow[key];
              let type: 'string' | 'number' | 'boolean' | 'date' | 'json' = 'string';
              if (typeof val === 'number') type = 'number';
              else if (typeof val === 'boolean') type = 'boolean';
              else if (typeof val === 'object') type = 'json';
              dynamicFields.push({ name: key, type });
            }
          });
        }
      });
    }
  }

  const renderConfigContent = () => {
    switch (nodeData.subType) {
      case 'filter':
        return <FilterConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'rename':
        return <RenameConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'change-type':
        return <ChangeTypeConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'join':
        return <JoinConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'group-by':
        return <GroupByConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'sort':
        return <SortConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'deduplicate':
        return <DeduplicateConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'scd-type-0':
      case 'scd-type-1':
      case 'scd-type-2':
      case 'scd-type-3':
      case 'scd-type-4':
      case 'scd-type-5':
      case 'scd-type-6':
        return <SCDConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'schedule':
        return <ScheduleConfigContent nodeData={nodeData} onUpdate={onUpdate} />;
      case 'quality-check':
        return <QualityCheckConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} />;
      case 'ai-transform':
        return <AITransformConfigContent nodeData={nodeData} onUpdate={onUpdate} fields={dynamicFields} sampleData={previewDataToRender} />;
      case 'custom-code':
        return <CustomCodeConfigContent nodeData={nodeData} onUpdate={onUpdate} />;
      default:
        if (nodeData.category === 'source' || nodeData.category === 'destination') {
          return <ConnectionConfigContent nodeId={nodeId} nodeData={nodeData} onUpdate={onUpdate} />;
        }
        return <GenericConfigContent nodeData={nodeData} onUpdate={onUpdate} />;
    }
  };

  let previewDataToRender = (nodeData.previewData as any[]) || [];

  if (previewDataToRender.length === 0 && pipeline) {
    const incomingEdges = pipeline.edges.filter(e => e.target === nodeId);
    if (incomingEdges.length > 0) {
      let sourceData: any[] = [];
      incomingEdges.forEach(incomingEdge => {
        const sourceNode = pipeline.nodes.find(n => n.id === incomingEdge.source);
        if (sourceNode && sourceNode.data.previewData && Array.isArray(sourceNode.data.previewData)) {
          if (sourceData.length === 0) sourceData = sourceNode.data.previewData;
        }
      });
      
      if (nodeData.subType === 'filter' && nodeData.conditions && nodeData.conditions.length > 0) {
        previewDataToRender = sourceData.filter(row => {
          let result = true;
          (nodeData.conditions as FilterCondition[]).forEach((cond, idx) => {
            if (!cond.field || !cond.operator || !cond.value) return;
            const val = row[cond.field];
            const cmpVal = isNaN(Number(cond.value)) ? cond.value : Number(cond.value);
            const rowVal = typeof val === 'number' && !isNaN(Number(cmpVal)) ? Number(val) : String(val);
            
            let condResult = false;
            switch(cond.operator) {
              case 'equals': condResult = rowVal == cmpVal; break;
              case 'not-equals': condResult = rowVal != cmpVal; break;
              case 'greater-than': condResult = Number(rowVal) > Number(cmpVal); break;
              case 'less-than': condResult = Number(rowVal) < Number(cmpVal); break;
              case 'contains': condResult = String(rowVal).includes(String(cmpVal)); break;
              default: condResult = true;
            }
            if (idx === 0) {
              result = condResult;
            } else {
              if (cond.logic === 'OR') result = result || condResult;
              else result = result && condResult;
            }
          });
          return result;
        });
      } else {
        previewDataToRender = sourceData;
      }
    }
  }

  return (
    <div className="w-80 xl:w-96 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full flex-shrink-0 overflow-hidden animate-slide-in-right">
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
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500">
                  {previewDataToRender.length} rows × {Object.keys(previewDataToRender[0] || {}).length} columns
                </span>
                <button 
                  onClick={() => {
                    if (previewDataToRender.length === 0) return;
                    const headers = Object.keys(previewDataToRender[0]).join(',');
                    const csvRows = previewDataToRender.map(row => Object.values(row).join(','));
                    const csvString = [headers, ...csvRows].join('\n');
                    const blob = new Blob([csvString], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${nodeData.label}-export.csv`;
                    a.click();
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <FileSpreadsheet size={12} /> Export CSV
                </button>
              </div>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      {Object.keys(previewDataToRender[0] || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-slate-500 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewDataToRender.map((row: any, i: number) => (
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
    { id: '1', field: '', operator: 'equals', value: '', logic: 'AND' },
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
  const joinConfig = nodeData.joinConfig || { joinType: 'inner', leftField: '', rightField: '' };

  const updateJoin = (updates: Partial<JoinConfig>) => {
    onUpdate({ joinConfig: { ...joinConfig, ...updates } as JoinConfig });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Join Type</label>
        <div className="grid grid-cols-4 gap-1">
          {(['inner', 'left', 'right', 'full'] as const).map((type) => (
            <button
              key={type}
              onClick={() => updateJoin({ joinType: type })}
              className={`py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                joinConfig.joinType === type
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
          <select 
            value={joinConfig.leftField}
            onChange={(e) => updateJoin({ leftField: e.target.value })}
            className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">Left field...</option>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
          <span className="text-slate-400">=</span>
          <select 
            value={joinConfig.rightField}
            onChange={(e) => updateJoin({ rightField: e.target.value })}
            className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
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
  const groupByFields = nodeData.groupByFields || [];
  const aggregates = nodeData.aggregates || [];

  const toggleGroup = (field: string) => {
    if (groupByFields.includes(field)) {
      onUpdate({ groupByFields: groupByFields.filter(f => f !== field) });
    } else {
      onUpdate({ groupByFields: [...groupByFields, field] });
    }
  };

  const updateAgg = (field: string, fn: string) => {
    const existing = aggregates.find(a => a.field === field);
    if (existing) {
      if (!fn) onUpdate({ aggregates: aggregates.filter(a => a.field !== field) });
      else onUpdate({ aggregates: aggregates.map(a => a.field === field ? { ...a, function: fn as any } : a) });
    } else {
      if (fn) onUpdate({ aggregates: [...aggregates, { field, function: fn as any }] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Group By Fields</label>
        <div className="space-y-1">
          {fields.slice(0, 4).map((f) => (
            <label key={f.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-600" 
                checked={groupByFields.includes(f.name)}
                onChange={() => toggleGroup(f.name)}
              />
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{f.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Aggregations</label>
        <div className="space-y-2">
          {fields.filter(f => f.type === 'number').map((f) => {
            const currentAgg = aggregates.find(a => a.field === f.name)?.function || '';
            return (
              <div key={f.name} className="flex items-center gap-2">
                <span className="flex-1 text-[12px] text-slate-600 dark:text-slate-400">{f.name}</span>
                <select 
                  value={currentAgg}
                  onChange={(e) => updateAgg(f.name, e.target.value)}
                  className="w-32 text-[12px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                >
                  <option value="">None</option>
                  {aggFunctions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SortConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const sortRules = (nodeData.sortRules as any[]) || [];
  
  const addSortRule = () => {
    onUpdate({ sortRules: [...sortRules, { field: '', order: 'asc' }] });
  };
  const updateSortRule = (idx: number, updates: any) => {
    const newRules = [...sortRules];
    newRules[idx] = { ...newRules[idx], ...updates };
    onUpdate({ sortRules: newRules });
  };
  const removeSortRule = (idx: number) => {
    onUpdate({ sortRules: sortRules.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Sort Rules</label>
      {sortRules.map((rule, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <select 
            value={rule.field}
            onChange={(e) => updateSortRule(idx, { field: e.target.value })}
            className="flex-1 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="">Select field...</option>
            {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
          <select 
            value={rule.order}
            onChange={(e) => updateSortRule(idx, { order: e.target.value })}
            className="w-24 text-[12px] px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button onClick={() => removeSortRule(idx)} className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-400"><X size={12} /></button>
        </div>
      ))}
      <button onClick={addSortRule} className="w-full py-1.5 text-[12px] text-blue-600 border border-dashed border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
        + Add sort rule
      </button>
    </div>
  );
}

function DeduplicateConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (d: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const dedupKeys = (nodeData.dedupKeys as string[]) || [];
  const dedupKeep = (nodeData.dedupKeep as string) || 'first';

  const toggleKey = (field: string) => {
    if (dedupKeys.includes(field)) {
      onUpdate({ dedupKeys: dedupKeys.filter(f => f !== field) });
    } else {
      onUpdate({ dedupKeys: [...dedupKeys, field] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Key Fields (match duplicates on)</label>
        <div className="space-y-1">
          {fields.map((f) => (
            <label key={f.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <input 
                type="checkbox" 
                checked={dedupKeys.includes(f.name)}
                onChange={() => toggleKey(f.name)}
                className="rounded border-slate-300 text-blue-600" 
              />
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{f.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Keep</label>
        <div className="flex gap-2">
          <button 
            onClick={() => onUpdate({ dedupKeep: 'first' })}
            className={`flex-1 py-1.5 text-[12px] rounded-lg font-medium ${dedupKeep === 'first' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}
          >First</button>
          <button 
            onClick={() => onUpdate({ dedupKeep: 'last' })}
            className={`flex-1 py-1.5 text-[12px] rounded-lg font-medium ${dedupKeep === 'last' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}
          >Last</button>
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
  const isDestination = nodeData.category === 'destination';
  const openModal = useUIStore(s => s.openModal);

  const activePipelineId = usePipelineStore(s => s.activePipelineId);
  const pipeline = usePipelineStore(s => s.pipelines.find(p => p.id === activePipelineId));

  const handleOpenConnect = () => {
    openModal('connect-data', {
      id: nodeId,
      label: nodeData.label,
      category: nodeData.category,
      subType: nodeData.subType
    });
  };

  const handleExportCSV = () => {
    if (!pipeline) return;
    
    const incomingEdges = pipeline.edges.filter(e => e.target === nodeId);
    if (incomingEdges.length === 0) return;
    
    let sourceData: any[] = [];
    incomingEdges.forEach(incomingEdge => {
      const sourceNode = pipeline.nodes.find(n => n.id === incomingEdge.source);
      if (sourceNode && sourceNode.data.previewData && Array.isArray(sourceNode.data.previewData)) {
        if (sourceData.length === 0) sourceData = sourceNode.data.previewData;
      }
    });
    
    if (sourceData.length === 0) return;
    
    const headers = Object.keys(sourceData[0]).join(',');
    const csvRows = sourceData.map(row => Object.values(row).join(','));
    const csvString = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nodeData.label}-export.csv`;
    a.click();
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
              className="flex-1 py-1.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
            >
              <RefreshCw size={12} /> Refresh Data
            </button>
            <button
              onClick={handleOpenConnect}
              className="flex-1 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-all"
            >
              Configure
            </button>
          </div>
          
          {isDestination && (
            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900">
              <button
                onClick={handleExportCSV}
                className="w-full py-1.5 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
              >
                <FileSpreadsheet size={12} /> Export Final CSV
              </button>
            </div>
          )}
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

// --- Validation / Quality Check Config Content ---
function QualityCheckConfigContent({ nodeData, onUpdate, fields }: { nodeData: PipelineNodeData; onUpdate: (data: Partial<PipelineNodeData>) => void; fields: FieldSchema[] }) {
  const config = nodeData.config || {};
  const rules: any[] = Array.isArray(config.rules) ? config.rules : [];

  const addRule = () => {
    onUpdate({
      config: {
        ...config,
        rules: [...rules, { field: fields[0]?.name || '', type: 'not_null', pattern: '' }]
      }
    });
  };

  const updateRule = (idx: number, updates: any) => {
    const newRules = [...rules];
    newRules[idx] = { ...newRules[idx], ...updates };
    onUpdate({ config: { ...config, rules: newRules } });
  };

  const removeRule = (idx: number) => {
    onUpdate({ config: { ...config, rules: rules.filter((_: any, i: number) => i !== idx) } });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        {rules.map((rule: any, idx: number) => (
          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 relative group">
            <button
              onClick={() => removeRule(idx)}
              className="absolute -right-2 -top-2 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <X size={10} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={rule.field}
                onChange={(e) => updateRule(idx, { field: e.target.value })}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                {fields.map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
              <select
                value={rule.type}
                onChange={(e) => updateRule(idx, { type: e.target.value })}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="not_null">Is Not Null</option>
                <option value="regex">Matches Regex</option>
              </select>
            </div>
            {rule.type === 'regex' && (
              <input
                type="text"
                placeholder="Regex pattern (e.g., ^[A-Z]+$)"
                value={rule.pattern}
                onChange={(e) => updateRule(idx, { pattern: e.target.value })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            )}
          </div>
        ))}

        <button
          onClick={addRule}
          className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
        >
          <Shield size={14} /> Add Validation Rule
        </button>
      </div>
    </div>
  );
}


// ─── AI Transform Config ──────────────────────────────────────────────────────

import { generateTransformWithAI } from '../../lib/ai-service';

function AITransformConfigContent({
  nodeData,
  onUpdate,
  fields,
  sampleData,
}: {
  nodeData: PipelineNodeData;
  onUpdate: (d: Partial<PipelineNodeData>) => void;
  fields: FieldSchema[];
  sampleData: Record<string, unknown>[];
}) {
  const [instruction, setInstruction] = React.useState<string>(
    (nodeData.config?.aiInstruction as string) || ''
  );
  const [generatedCode, setGeneratedCode] = React.useState<string>(
    (nodeData.config?.generatedCode as string) || ''
  );
  const [explanation, setExplanation] = React.useState<string>(
    (nodeData.config?.aiExplanation as string) || ''
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [previewResult, setPreviewResult] = React.useState<Record<string, unknown>[]>([]);

  const handleGenerate = async () => {
    if (!instruction.trim()) return;
    setLoading(true);
    setError('');
    setGeneratedCode('');
    setExplanation('');
    setPreviewResult([]);

    try {
      const result = await generateTransformWithAI(
        instruction,
        fields,
        sampleData
      );

      setGeneratedCode(result.code || '');
      setExplanation(result.explanation || '');
      setPreviewResult(result.previewData || []);

      onUpdate({
        config: {
          ...(nodeData.config || {}),
          aiInstruction: instruction,
          generatedCode: result.code,
          aiExplanation: result.explanation,
        },
        configured: true,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to generate transform');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div>
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Bot size={13} className="text-blue-500" />
          Transformation Instruction
        </label>
        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="e.g. Filter rows where revenue > 1000, add a 'revenue_tier' column based on revenue, and calculate percentage of total..."
          rows={4}
          className="w-full text-[12px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
        />
      </div>

      {/* Schema hint */}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fields.map(f => (
            <span key={f.name} className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded font-mono">
              {f.name}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!instruction.trim() || loading}
        className="w-full py-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-xl transition-all shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Bot size={13} /> Generate Transform
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-[11px] text-red-700 dark:text-red-400">
          ❌ {error}
        </div>
      )}

      {explanation && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">✅ What this does</p>
          <p className="text-[12px] text-emerald-800 dark:text-emerald-300">{explanation}</p>
        </div>
      )}

      {generatedCode && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Generated Code</p>
          <pre className="text-[10px] bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-slate-800">
            {generatedCode}
          </pre>
        </div>
      )}

      {previewResult.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preview ({previewResult.length} rows)</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  {Object.keys(previewResult[0]).slice(0, 5).map(k => (
                    <th key={k} className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewResult.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    {Object.values(row).slice(0, 5).map((v, j) => (
                      <td key={j} className="px-2 py-1.5 text-slate-700 dark:text-slate-300 font-mono truncate max-w-[80px]">
                        {String(v ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Code Config ───────────────────────────────────────────────────────

function CustomCodeConfigContent({
  nodeData,
  onUpdate,
}: {
  nodeData: PipelineNodeData;
  onUpdate: (d: Partial<PipelineNodeData>) => void;
}) {
  const [language, setLanguage] = React.useState<'javascript' | 'sql'>(
    (nodeData.config?.language as 'javascript' | 'sql') || 'javascript'
  );
  const [code, setCode] = React.useState<string>(
    (nodeData.config?.code as string) ||
      (language === 'javascript'
        ? '// rows: array of objects\n// Return transformed array\nfunction transform(rows) {\n  return rows.filter(r => r != null);\n}'
        : 'SELECT *\nFROM input\nWHERE 1=1')
  );

  const handleSave = () => {
    onUpdate({
      config: { ...(nodeData.config || {}), code, language },
      configured: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div>
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Terminal size={13} className="text-violet-500" />
          Language
        </label>
        <div className="flex gap-2">
          {(['javascript', 'sql'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                if (lang === 'javascript' && !code.includes('function')) {
                  setCode('// rows: array of objects\n// Return transformed array\nfunction transform(rows) {\n  return rows.filter(r => r != null);\n}');
                } else if (lang === 'sql' && !code.includes('SELECT')) {
                  setCode('SELECT *\nFROM input\nWHERE 1=1');
                }
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                language === lang
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              {lang === 'javascript' ? '⚡ JavaScript' : '🗄 SQL'}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div>
        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Code</label>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full text-[11px] font-mono px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-900 text-emerald-400 placeholder:text-slate-600 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 leading-relaxed"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold rounded-xl transition-all shadow-sm"
      >
        <CheckCircle2 size={13} /> Save Code
      </button>

      {nodeData.configured && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400 text-center">
          ✅ Code saved — will execute during pipeline run
        </div>
      )}
    </div>
  );
}

// ─── Loader2 import shim (already imported via lucide-react in parent) ────────
const Loader2 = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
