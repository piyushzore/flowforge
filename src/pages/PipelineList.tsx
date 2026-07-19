import { useState } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { Search, Filter, Plus, GitBranch, Play, Pause, Copy, Trash2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function PipelineList() {
  const { pipelines, createPipeline, deletePipeline, duplicatePipeline, activatePipeline, pausePipeline, savePipeline } = usePipelineStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredPipelines = pipelines.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const id = createPipeline('New Pipeline');
    await savePipeline(id);
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPipelines.map(p => (
              <div key={p.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md bg-white dark:bg-slate-900 group flex flex-col relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                      <GitBranch size={20} />
                    </div>
                    <div>
                      <Link to={`/pipelines/${p.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                        {p.name}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                        </span>
                        <span>&bull;</span>
                        <span>{p.nodes.length} nodes</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                    p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    p.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {p.status}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
                  {p.description || 'No description provided.'}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                  <Link 
                    to={`/pipelines/${p.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    Open in Editor <GitBranch size={14} />
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                </div>
              </div>
            ))}
            {filteredPipelines.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                No pipelines found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
