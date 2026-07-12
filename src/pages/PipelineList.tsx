import React, { useState } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { Search, Filter, Plus, MoreVertical, GitBranch, Play, Pause, Copy, Trash2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function PipelineList() {
  const { pipelines, createPipeline, deletePipeline, duplicatePipeline, activatePipeline, pausePipeline } = usePipelineStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredPipelines = pipelines.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const id = createPipeline('New Pipeline');
    navigate(`/pipelines/${id}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pipelines</h1>
          <p className="text-sm text-slate-500 mt-1">Build, manage, and monitor your data flows.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Create Pipeline
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search pipelines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Filter size={14} /> Status
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Last Updated</th>
                <th className="px-6 py-3 font-medium">Nodes</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPipelines.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Link to={`/pipelines/${p.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <GitBranch size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{p.name}</p>
                        <p className="text-[11px] text-slate-500">{p.description || 'No description'}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                      p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      p.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {p.nodes.length} nodes
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.status === 'active' ? (
                        <button onClick={() => pausePipeline(p.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded" title="Pause">
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button onClick={() => activatePipeline(p.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded" title="Activate">
                          <Play size={16} />
                        </button>
                      )}
                      <button onClick={() => duplicatePipeline(p.id)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Duplicate">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => deletePipeline(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPipelines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No pipelines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
