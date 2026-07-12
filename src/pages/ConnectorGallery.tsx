import React, { useState } from 'react';
import { useConnectorStore } from '../store/connector-store';
import { Search, Info, Plus } from 'lucide-react';

export default function ConnectorGallery() {
  const { definitions, addInstance } = useConnectorStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', 'database', 'warehouse', 'saas', 'streaming', 'file', 'generic'];

  const filtered = definitions.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || d.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (defId: string) => {
    addInstance({
      name: `New ${defId} Connection`,
      connectorId: defId,
      config: {}
    });
    alert('Connector instance added!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connector Gallery</h1>
          <p className="text-sm text-slate-500 mt-1">Browse and install new data connectors.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar Filters */}
        <div className="w-48 flex-shrink-0 space-y-1 overflow-y-auto">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                category === c 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Main Gallery */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search connectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(def => (
                <div key={def.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col h-full bg-slate-50/50 dark:bg-slate-800/30 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-xl">
                      {def.icon}
                    </div>
                    {def.popular && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Popular
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{def.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 flex-1 line-clamp-2">{def.description}</p>
                  
                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <button 
                      onClick={() => handleInstall(def.id)}
                      className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Plus size={14} /> Add
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <Info size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                  No connectors found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
