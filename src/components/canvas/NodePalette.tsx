import React, { useState, useMemo } from 'react';
import {
  Search,
  Database, FileSpreadsheet, Cloud, Upload, Webhook,
  Filter, ArrowRightLeft, Layers, Type, Hash,
  LayoutGrid, GitMerge, Merge, FunctionSquare,
  Shield, Eraser, Split, Link2, CalendarClock, Globe,
  Bot, Terminal, Code2, Table, Columns, Search as SearchIcon,
  GitBranch, Repeat, Clock,
  Calendar, FileInput, Play,
  StickyNote, Target, Send, Server,
} from 'lucide-react';
import type { NodeCategory, NodeSubType } from '../../types/pipeline';

interface PaletteItem {
  subType: NodeSubType;
  label: string;
  category: NodeCategory;
  description: string;
  icon: React.ReactNode;
}

const paletteItems: PaletteItem[] = [
  // Sources
  { subType: 'google-sheets', label: 'Google Sheets', category: 'source', description: 'Read from Google Sheets', icon: <FileSpreadsheet size={15} /> },
  { subType: 'postgres', label: 'PostgreSQL', category: 'source', description: 'Read from PostgreSQL', icon: <Database size={15} /> },
  { subType: 'csv-upload', label: 'CSV Upload', category: 'source', description: 'Upload a CSV file', icon: <Upload size={15} /> },
  { subType: 'mysql', label: 'MySQL', category: 'source', description: 'Read from MySQL', icon: <Database size={15} /> },
  { subType: 'snowflake', label: 'Snowflake', category: 'source', description: 'Read from Snowflake', icon: <Cloud size={15} /> },
  { subType: 'bigquery', label: 'BigQuery', category: 'source', description: 'Read from BigQuery', icon: <Cloud size={15} /> },
  { subType: 'salesforce', label: 'Salesforce', category: 'source', description: 'Read from Salesforce', icon: <Cloud size={15} /> },
  { subType: 'hubspot', label: 'HubSpot', category: 'source', description: 'Read from HubSpot CRM', icon: <Cloud size={15} /> },
  { subType: 'stripe', label: 'Stripe', category: 'source', description: 'Read Stripe payments', icon: <Cloud size={15} /> },
  { subType: 'shopify', label: 'Shopify', category: 'source', description: 'Read Shopify orders', icon: <Cloud size={15} /> },
  { subType: 'airtable', label: 'Airtable', category: 'source', description: 'Read from Airtable', icon: <Table size={15} /> },
  { subType: 'rest-api', label: 'REST API', category: 'source', description: 'Generic REST connector', icon: <Globe size={15} /> },
  { subType: 'webhook', label: 'Webhook', category: 'source', description: 'Receive webhook data', icon: <Webhook size={15} /> },
  { subType: 'kafka', label: 'Kafka', category: 'source', description: 'Stream from Kafka', icon: <Layers size={15} /> },
  { subType: 's3', label: 'Amazon S3', category: 'source', description: 'Read from S3 bucket', icon: <Cloud size={15} /> },

  // Transforms
  { subType: 'filter', label: 'Filter', category: 'transform', description: 'Filter rows by conditions', icon: <Filter size={15} /> },
  { subType: 'sort', label: 'Sort', category: 'transform', description: 'Sort rows by fields', icon: <ArrowRightLeft size={15} /> },
  { subType: 'rename', label: 'Rename Fields', category: 'transform', description: 'Rename column names', icon: <Type size={15} /> },
  { subType: 'change-type', label: 'Change Type', category: 'transform', description: 'Cast data types', icon: <Hash size={15} /> },
  { subType: 'group-by', label: 'Group By', category: 'transform', description: 'Aggregate with grouping', icon: <LayoutGrid size={15} /> },
  { subType: 'join', label: 'Join', category: 'transform', description: 'Join two data sources', icon: <GitMerge size={15} /> },
  { subType: 'union', label: 'Union', category: 'transform', description: 'Combine multiple sources', icon: <Merge size={15} /> },
  { subType: 'deduplicate', label: 'Deduplicate', category: 'transform', description: 'Remove duplicate rows', icon: <Layers size={15} /> },
  { subType: 'add-remove-fields', label: 'Add/Remove Fields', category: 'transform', description: 'Add computed or remove fields', icon: <Columns size={15} /> },
  { subType: 'null-handling', label: 'Null Handling', category: 'transform', description: 'Handle null values', icon: <Shield size={15} /> },
  { subType: 'pivot', label: 'Pivot', category: 'transform', description: 'Rows to columns', icon: <ArrowRightLeft size={15} /> },
  { subType: 'unpivot', label: 'Unpivot', category: 'transform', description: 'Columns to rows', icon: <ArrowRightLeft size={15} /> },
  { subType: 'window-function', label: 'Window Function', category: 'transform', description: 'Rank, running total, lag/lead', icon: <FunctionSquare size={15} /> },
  { subType: 'trim-case', label: 'Text Clean', category: 'transform', description: 'Trim, uppercase, lowercase', icon: <Eraser size={15} /> },
  { subType: 'regex', label: 'Regex', category: 'transform', description: 'Extract/replace with regex', icon: <SearchIcon size={15} /> },
  { subType: 'split-column', label: 'Split Column', category: 'transform', description: 'Split by delimiter', icon: <Split size={15} /> },
  { subType: 'concat', label: 'Concatenate', category: 'transform', description: 'Combine columns', icon: <Link2 size={15} /> },
  { subType: 'date-parse', label: 'Date Parse', category: 'transform', description: 'Parse/format dates', icon: <CalendarClock size={15} /> },
  { subType: 'lookup', label: 'Lookup', category: 'transform', description: 'Enrich from reference data', icon: <SearchIcon size={15} /> },
  { subType: 'api-enrichment', label: 'API Enrichment', category: 'transform', description: 'Enrich via external API', icon: <Globe size={15} /> },
  { subType: 'validation', label: 'Validation', category: 'transform', description: 'Validate data quality', icon: <Shield size={15} /> },
  { subType: 'ai-transform', label: 'AI Transform', category: 'transform', description: 'Transform with plain English', icon: <Bot size={15} /> },
  { subType: 'custom-code', label: 'Custom Code', category: 'transform', description: 'Python or SQL script', icon: <Terminal size={15} /> },

  // Destinations
  { subType: 'postgres', label: 'Bronze Landing Zone', category: 'destination', description: 'Raw Bronze storage layer', icon: <Database size={15} /> },
  { subType: 'snowflake', label: 'Silver Cleaned Layer', category: 'destination', description: 'Validated Silver storage layer', icon: <Cloud size={15} /> },
  { subType: 'bigquery', label: 'Gold Analytics Layer', category: 'destination', description: 'Aggregated Gold storage layer', icon: <Cloud size={15} /> },
  { subType: 'google-sheets', label: 'BI Serving (Power BI/Tableau)', category: 'destination', description: 'Serve semantic data model to BI tools', icon: <FileSpreadsheet size={15} /> },
  { subType: 'slack', label: 'AI Serving Model', category: 'destination', description: 'Feed serving feature tables to ML/AI models', icon: <Bot size={15} /> },
  { subType: 'rest-api', label: 'Served API Endpoint', category: 'destination', description: 'Expose Gold layer data via secure API', icon: <Globe size={15} /> },

  // Control
  { subType: 'conditional', label: 'Conditional', category: 'control', description: 'Branch by condition', icon: <GitBranch size={15} /> },
  { subType: 'merge', label: 'Merge', category: 'control', description: 'Merge branches', icon: <Merge size={15} /> },
  { subType: 'loop', label: 'Loop', category: 'control', description: 'For-each iteration', icon: <Repeat size={15} /> },
  { subType: 'wait-delay', label: 'Wait/Delay', category: 'control', description: 'Pause execution', icon: <Clock size={15} /> },

  // Orchestration
  { subType: 'schedule', label: 'Schedule', category: 'orchestration', description: 'Trigger on schedule', icon: <Calendar size={15} /> },
  { subType: 'webhook-trigger', label: 'Webhook Trigger', category: 'orchestration', description: 'Trigger via webhook', icon: <Webhook size={15} /> },
  { subType: 'file-trigger', label: 'File Trigger', category: 'orchestration', description: 'Trigger on file arrival', icon: <FileInput size={15} /> },
  { subType: 'dependency-trigger', label: 'Dependency', category: 'orchestration', description: 'Trigger after pipeline', icon: <GitBranch size={15} /> },
  { subType: 'manual-trigger', label: 'Manual Trigger', category: 'orchestration', description: 'Run manually', icon: <Play size={15} /> },

  // Note
  { subType: 'annotation', label: 'Note', category: 'note', description: 'Add a sticky note', icon: <StickyNote size={15} /> },
];

const categoryLabels: Record<NodeCategory, string> = {
  source: 'Sources',
  transform: 'Transforms',
  destination: 'Destinations',
  control: 'Control Flow',
  orchestration: 'Orchestration',
  note: 'Notes',
};

const categoryOrder: NodeCategory[] = ['source', 'transform', 'destination', 'control', 'orchestration', 'note'];

const categoryBadgeColors: Record<NodeCategory, string> = {
  source: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  transform: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  destination: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  control: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orchestration: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  note: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

interface NodePaletteProps {
  className?: string;
}

export default function NodePalette({ className = '' }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(['source', 'transform', 'destination'])
  );

  const filteredItems = useMemo(() => {
    if (!search) return paletteItems;
    const q = search.toLowerCase();
    return paletteItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.includes(q)
    );
  }, [search]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  const toggleCategory = (cat: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData('application/reactflow-type', item.category);
    event.dataTransfer.setData('application/reactflow-subtype', item.subType);
    event.dataTransfer.setData('application/reactflow-label', item.label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`w-[220px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-1">
        {categoryOrder.map((cat) => {
          const items = groupedItems[cat];
          if (!items || items.length === 0) return null;
          const isExpanded = expandedCategories.has(cat) || search.length > 0;

          return (
            <div key={cat} className="mb-0.5">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryBadgeColors[cat].split(' ')[0]}`} />
                {categoryLabels[cat]}
                <span className="ml-auto text-[10px] font-normal">{items.length}</span>
              </button>

              {isExpanded && (
                <div className="space-y-0.5 px-2 pb-1">
                  {items.map((item, i) => (
                    <div
                      key={`${item.category}-${item.subType}-${i}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, item)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      title={item.description}
                    >
                      <span className={`flex-shrink-0 ${categoryBadgeColors[item.category].split(' ').slice(1).join(' ')}`}>
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white">
                          {item.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
