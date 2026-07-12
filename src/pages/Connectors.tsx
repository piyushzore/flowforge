import React, { useState } from 'react';
import { useConnectorStore } from '../store/connector-store';
import { Search, Plus, Database, Cloud, Table, Settings, Trash2, Power } from 'lucide-react';

export default function Connectors() {
  const { instances, definitions } = useConnectorStore();
  const [search, setSearch] = useState('');

  const filteredInstances = instances.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connectors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your data sources and destinations.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Connector
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mb-6 p-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search connectors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInstances.map(instance => {
          const def = definitions.find(d => d.id === instance.connectorId);
          if (!def) return null;
          
          return (
            <div key={instance.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-800">
                  {def.icon}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <Settings size={14} />
                  </button>
                  <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{instance.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{def.name} • {def.category}</p>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${instance.health === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 capitalize">{instance.health}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {instance.pipelinesUsing} pipelines
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
