import React, { useState } from 'react';
import { Search, BookTemplate, ArrowRight } from 'lucide-react';
import { usePipelineStore } from '../store/pipeline-store';
import { useNavigate } from 'react-router-dom';

const mockTemplates = [
  {
    id: 't-1',
    name: 'Shopify Orders to BigQuery',
    description: 'Sync new Shopify orders to BigQuery for analysis, parsing nested JSON fields automatically.',
    category: 'e-commerce',
    complexity: 'medium',
    icon: '🛒'
  },
  {
    id: 't-2',
    name: 'Salesforce Leads to Google Sheets',
    description: 'Extract leads daily, clean up phone numbers, and push to a Google Sheet for the SDR team.',
    category: 'sales',
    complexity: 'simple',
    icon: '☁️'
  },
  {
    id: 't-3',
    name: 'Stripe Payments to Snowflake',
    description: 'Ingest Stripe payment events, filter for successful charges, and load into Snowflake.',
    category: 'finance',
    complexity: 'medium',
    icon: '💳'
  },
  {
    id: 't-4',
    name: 'PostgreSQL to Data Warehouse',
    description: 'Full database replication using Change Data Capture (CDC) with null handling.',
    category: 'engineering',
    complexity: 'advanced',
    icon: '🐘'
  }
];

export default function Templates() {
  const [search, setSearch] = useState('');
  const { createPipeline } = usePipelineStore();
  const navigate = useNavigate();

  const handleUseTemplate = (templateName: string) => {
    const id = createPipeline(`${templateName} (Copy)`);
    navigate(`/pipelines/${id}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Start building instantly with pre-configured pipeline templates.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockTemplates.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(template => (
              <div key={template.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md bg-white dark:bg-slate-900 group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{template.name}</h3>
                      <span className="text-[11px] text-slate-500 capitalize">{template.category}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                    template.complexity === 'simple' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                    template.complexity === 'advanced' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                  }`}>
                    {template.complexity}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
                  {template.description}
                </p>

                <div className="flex justify-end">
                  <button 
                    onClick={() => handleUseTemplate(template.name)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors group-hover:translate-x-1 duration-200"
                  >
                    Use Template <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
