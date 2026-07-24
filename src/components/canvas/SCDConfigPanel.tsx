import React, { useState } from 'react';
import type { PipelineNodeData, FieldSchema, SCDConfig } from '../../types/pipeline';
import { Layers, Key, Eye, Clock, Hash, Check } from 'lucide-react';

interface Props {
  nodeData: PipelineNodeData;
  onUpdate: (data: Partial<PipelineNodeData>) => void;
  fields: FieldSchema[];
}

export default function SCDConfigContent({ nodeData, onUpdate, fields }: Props) {
  const type = nodeData.subType;
  const config: SCDConfig = nodeData.scdConfig || {
    primaryKey: '',
    trackColumns: [],
    overwriteColumns: [],
    autoColumns: {
      effectiveDate: true,
      endDate: true,
      isCurrent: true,
      version: true
    }
  };

  const updateConfig = (updates: Partial<SCDConfig>) => {
    onUpdate({ scdConfig: { ...config, ...updates } });
  };

  const toggleTrackColumn = (field: string) => {
    const current = config.trackColumns || [];
    if (current.includes(field)) {
      updateConfig({ trackColumns: current.filter(f => f !== field) });
    } else {
      updateConfig({ trackColumns: [...current, field] });
    }
  };

  const toggleOverwriteColumn = (field: string) => {
    const current = config.overwriteColumns || [];
    if (current.includes(field)) {
      updateConfig({ overwriteColumns: current.filter(f => f !== field) });
    } else {
      updateConfig({ overwriteColumns: [...current, field] });
    }
  };

  const toggleAutoColumn = (key: keyof NonNullable<SCDConfig['autoColumns']>) => {
    const current = config.autoColumns || { effectiveDate: true, endDate: true, isCurrent: true, version: true };
    updateConfig({ autoColumns: { ...current, [key]: !current[key] } });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1 block">Primary Key (Identifies Record)</label>
        <select
          value={config.primaryKey}
          onChange={(e) => updateConfig({ primaryKey: e.target.value })}
          className="w-full text-[12px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Primary Key...</option>
          {fields.map(f => (
            <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-1">Unique identifier to match incoming records to existing records.</p>
      </div>

      {(type === 'scd-type-2' || type === 'scd-type-3' || type === 'scd-type-4' || type === 'scd-type-5' || type === 'scd-type-6') && (
        <div>
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Eye size={14} className="text-blue-500" />
            Columns to Track (History)
          </label>
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
            {fields.filter(f => f.name !== config.primaryKey).map(f => (
              <label key={f.name} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(config.trackColumns || []).includes(f.name)}
                  onChange={() => toggleTrackColumn(f.name)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[12px] text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{f.name}</span>
                <span className="text-[10px] text-slate-400 ml-auto font-mono">{f.type}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Changes to these columns will trigger history tracking.</p>
        </div>
      )}

      {(type === 'scd-type-1' || type === 'scd-type-5' || type === 'scd-type-6') && (
        <div>
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            Overwrite Columns (Type 1)
          </label>
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
            {fields.filter(f => f.name !== config.primaryKey && !(config.trackColumns || []).includes(f.name)).map(f => (
              <label key={f.name} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(config.overwriteColumns || []).includes(f.name)}
                  onChange={() => toggleOverwriteColumn(f.name)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[12px] text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{f.name}</span>
                <span className="text-[10px] text-slate-400 ml-auto font-mono">{f.type}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Changes to these columns update the current record only without history.</p>
        </div>
      )}

      {(type === 'scd-type-2' || type === 'scd-type-4' || type === 'scd-type-5' || type === 'scd-type-6') && (
        <div>
          <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Hash size={14} className="text-emerald-500" />
            Auto-Generated Columns
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'effectiveDate', label: 'effective_date' },
              { key: 'endDate', label: 'end_date' },
              { key: 'isCurrent', label: 'is_current' },
              { key: 'version', label: 'version' }
            ].map(col => (
              <label key={col.key} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoColumns ? config.autoColumns[col.key as keyof typeof config.autoColumns] : true}
                  onChange={() => toggleAutoColumn(col.key as keyof typeof config.autoColumns)}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
