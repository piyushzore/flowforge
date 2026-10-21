import { useState } from 'react';
import { Search, ArrowRight, Star, Download, Zap, Filter, TrendingUp, Users, ShoppingCart, DollarSign, BarChart3, Database } from 'lucide-react';
import { usePipelineStore } from '../store/pipeline-store';
import { useNavigate } from 'react-router-dom';
import type { PipelineNode, PipelineEdge } from '../types/pipeline';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  connectors: string[];
  icon: string;
  stars: number;
  uses: number;
  nodes: Partial<PipelineNode>[];
  edges: Partial<PipelineEdge>[];
}

const TEMPLATES: Template[] = [
  {
    id: 'tpl-1', icon: '📥', name: 'Google Sheets → BigQuery Sync', category: 'Ingestion',
    complexity: 'beginner', stars: 284, uses: 1842,
    connectors: ['google-sheets', 'bigquery'],
    description: 'Load data from Google Sheets, validate schema, clean nulls, and continuously sync to BigQuery.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 180 }, data: { label: 'Google Sheets Input', category: 'source', subType: 'google-sheets', configured: false, description: 'Load spreadsheet data' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 360, y: 110 }, data: { label: 'Validate Schema', category: 'transform', subType: 'quality-check', configured: false, description: 'Check column types' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 360, y: 250 }, data: { label: 'Handle Nulls', category: 'transform', subType: 'null-handling', configured: false, description: 'Fill or drop empty values' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 640, y: 180 }, data: { label: 'BigQuery Output', category: 'destination', subType: 'bigquery', configured: false, description: 'Write to analytics table' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n1', target: 'n3' }, { id: 'e3', source: 'n2', target: 'n4' }, { id: 'e4', source: 'n3', target: 'n4' }],
  },
  {
    id: 'tpl-2', icon: '⚡', name: 'Salesforce → Snowflake (SCD Type 2)', category: 'CRM',
    complexity: 'advanced', stars: 512, uses: 3210,
    connectors: ['salesforce', 'snowflake'],
    description: 'Sync Salesforce contacts and opportunities to Snowflake with full SCD Type 2 change history tracking.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 200 }, data: { label: 'Salesforce Contacts', category: 'source', subType: 'salesforce', configured: false, description: 'Load CRM contacts' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 340, y: 120 }, data: { label: 'Deduplicate', category: 'transform', subType: 'deduplicate', configured: false, description: 'Remove duplicates by email' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 340, y: 280 }, data: { label: 'SCD Type 2', category: 'transform', subType: 'scd-type-2', configured: false, description: 'Track historical changes' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 620, y: 200 }, data: { label: 'Snowflake DWH', category: 'destination', subType: 'snowflake', configured: false, description: 'Write to data warehouse' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
  },
  {
    id: 'tpl-3', icon: '🛒', name: 'Shopify Orders → Revenue Dashboard', category: 'E-commerce',
    complexity: 'intermediate', stars: 398, uses: 2560,
    connectors: ['shopify', 'bigquery'],
    description: 'Pull Shopify orders, group by product/region/day, calculate revenue KPIs, and load to BI-ready BigQuery tables.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 200 }, data: { label: 'Shopify Orders', category: 'source', subType: 'shopify', configured: false, description: 'Fetch order data' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 340, y: 120 }, data: { label: 'Filter Completed', category: 'transform', subType: 'filter', configured: false, description: 'Keep completed orders only' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 340, y: 280 }, data: { label: 'Revenue by Day', category: 'transform', subType: 'group-by', configured: false, description: 'Aggregate daily revenue' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 620, y: 200 }, data: { label: 'BigQuery Analytics', category: 'destination', subType: 'bigquery', configured: false, description: 'BI-ready revenue table' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
  },
  {
    id: 'tpl-4', icon: '💳', name: 'Stripe Payments → Financial Reporting', category: 'Finance',
    complexity: 'intermediate', stars: 301, uses: 1987,
    connectors: ['stripe', 'postgres'],
    description: 'Sync Stripe payments and subscriptions, compute MRR/ARR/churn metrics, and store in Postgres for reporting.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 200 }, data: { label: 'Stripe Payments', category: 'source', subType: 'stripe', configured: false, description: 'Load payment events' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 340, y: 120 }, data: { label: 'AI Transform', category: 'transform', subType: 'ai-transform', configured: false, description: 'Compute MRR/ARR metrics' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 340, y: 280 }, data: { label: 'Quality Check', category: 'transform', subType: 'quality-check', configured: false, description: 'Validate financial data' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 620, y: 200 }, data: { label: 'Postgres Reports', category: 'destination', subType: 'postgres', configured: false, description: 'Financial reporting DB' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n1', target: 'n3' }, { id: 'e3', source: 'n2', target: 'n4' }, { id: 'e4', source: 'n3', target: 'n4' }],
  },
  {
    id: 'tpl-5', icon: '📊', name: 'GA4 Events → User Behavior Analysis', category: 'Marketing',
    complexity: 'intermediate', stars: 267, uses: 1543,
    connectors: ['ga4', 'bigquery'],
    description: 'Pull Google Analytics 4 events, session data, filter by event type, pivot by date, and load to BigQuery for cohort analysis.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 200 }, data: { label: 'GA4 Events', category: 'source', subType: 'ga4', configured: false, description: 'User events from GA4' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 340, y: 120 }, data: { label: 'Filter Key Events', category: 'transform', subType: 'filter', configured: false, description: 'Keep purchase/signup events' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 340, y: 280 }, data: { label: 'Pivot by Date', category: 'transform', subType: 'pivot', configured: false, description: 'Events by day/event_type' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 620, y: 200 }, data: { label: 'BigQuery Analytics', category: 'destination', subType: 'bigquery', configured: false, description: 'Cohort analysis table' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }],
  },
  {
    id: 'tpl-6', icon: '🔄', name: 'Multi-Source Data Merge', category: 'Advanced',
    complexity: 'advanced', stars: 189, uses: 892,
    connectors: ['postgres', 'mysql', 'snowflake'],
    description: 'Join data from Postgres and MySQL, resolve conflicts, standardize schemas, and load unified records to Snowflake.',
    nodes: [
      { id: 'n1', type: 'pipeline-node', position: { x: 80, y: 120 }, data: { label: 'Postgres Source', category: 'source', subType: 'postgres', configured: false, description: 'Primary data source' } },
      { id: 'n2', type: 'pipeline-node', position: { x: 80, y: 280 }, data: { label: 'MySQL Source', category: 'source', subType: 'mysql', configured: false, description: 'Secondary data source' } },
      { id: 'n3', type: 'pipeline-node', position: { x: 360, y: 200 }, data: { label: 'Full Outer Join', category: 'transform', subType: 'join', configured: false, description: 'Merge both sources' } },
      { id: 'n4', type: 'pipeline-node', position: { x: 560, y: 200 }, data: { label: 'Standardize Schema', category: 'transform', subType: 'rename', configured: false, description: 'Normalize column names' } },
      { id: 'n5', type: 'pipeline-node', position: { x: 760, y: 200 }, data: { label: 'Snowflake DWH', category: 'destination', subType: 'snowflake', configured: false, description: 'Unified data warehouse' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n3' }, { id: 'e2', source: 'n2', target: 'n3' }, { id: 'e3', source: 'n3', target: 'n4' }, { id: 'e4', source: 'n4', target: 'n5' }],
  },
];

const CATEGORIES = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
const COMPLEXITY_COLORS = {
  beginner: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40',
  intermediate: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/40',
  advanced: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/40',
};

export default function Marketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { createPipeline, setNodes, setEdges } = usePipelineStore();
  const navigate = useNavigate();

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      || t.description.toLowerCase().includes(search.toLowerCase())
      || t.connectors.some(c => c.includes(search.toLowerCase()));
    const matchCat = category === 'All' || t.category === category;
    return matchSearch && matchCat;
  });

  const handleUseTemplate = (t: Template) => {
    const pid = createPipeline(t.name);
    setTimeout(() => {
      setNodes(pid, t.nodes as PipelineNode[]);
      setEdges(pid, t.edges as PipelineEdge[]);
      navigate(`/pipelines/${pid}`);
    }, 50);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap size={24} className="text-violet-500" />
            Marketplace
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Production-ready pipeline templates. Import and customize in one click.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Database size={13} /> {TEMPLATES.length} templates
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Templates', value: TEMPLATES.length.toString(), icon: <Database size={18} className="text-blue-500" /> },
          { label: 'Total Uses', value: TEMPLATES.reduce((s, t) => s + t.uses, 0).toLocaleString(), icon: <TrendingUp size={18} className="text-emerald-500" /> },
          { label: 'Community Stars', value: TEMPLATES.reduce((s, t) => s + t.stars, 0).toLocaleString(), icon: <Star size={18} className="text-amber-500" /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
            {stat.icon}
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, connector, or use case..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                category === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Zap size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No templates match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col">
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${COMPLEXITY_COLORS[t.complexity]}`}>
                      {t.complexity}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{t.category}</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
              </div>

              {/* Connectors */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Connectors</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.connectors.map(c => (
                    <span key={c} className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">
                      {c}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-400 self-center">{t.nodes.length} nodes</span>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="px-5 py-3 mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Star size={11} className="text-amber-400" /> {t.stars}</span>
                  <span className="flex items-center gap-1"><Download size={11} /> {t.uses.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => handleUseTemplate(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Use Template <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
