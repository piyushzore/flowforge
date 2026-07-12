import { usePipelineStore } from '../store/pipeline-store';
import { useConnectorStore } from '../store/connector-store';
import { Activity, GitBranch, Plug, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { pipelines, runs } = usePipelineStore();
  const { instances } = useConnectorStore();

  const activePipelines = pipelines.filter(p => p.status === 'active').length;
  
  // Calculate success rate
  const recentRuns = runs.slice(0, 100);
  const successRuns = recentRuns.filter(r => r.status === 'success').length;
  const successRate = recentRuns.length > 0 ? Math.round((successRuns / recentRuns.length) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back to FlowForge. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/pipelines" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Create Pipeline
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Pipelines" 
          value={pipelines.length} 
          icon={<GitBranch size={20} className="text-blue-500" />} 
          trend="+2 this week"
        />
        <StatCard 
          title="Active Pipelines" 
          value={activePipelines} 
          icon={<Activity size={20} className="text-emerald-500" />} 
          trend="All healthy"
        />
        <StatCard 
          title="Connected Sources" 
          value={instances.length} 
          icon={<Plug size={20} className="text-violet-500" />} 
          trend="+1 this week"
        />
        <StatCard 
          title="Success Rate" 
          value={`${successRate}%`} 
          icon={<CheckCircle2 size={20} className="text-emerald-500" />} 
          trend="Last 100 runs"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Runs</h2>
            <Link to="/monitoring" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {runs.slice(0, 5).map(run => (
              <div key={run.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    run.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' :
                    run.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30 text-red-600' :
                    'bg-blue-50 dark:bg-blue-950/30 text-blue-600'
                  }`}>
                    {run.status === 'success' ? <CheckCircle2 size={16} /> :
                     run.status === 'failed' ? <XCircle size={16} /> :
                     <Play size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{run.pipelineName}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(run.startedAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{run.duration}s</span>
                      <span>•</span>
                      <span>{run.trigger}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{run.rowsOut.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-500">rows processed</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Pipeline Health</h2>
          </div>
          <div className="p-5 space-y-4">
            {pipelines.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    p.status === 'active' ? 'bg-emerald-500' : 
                    p.status === 'paused' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{p.name}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  p.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 
                  p.status === 'paused' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' : 
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {p.status.toUpperCase()}
                </span>
              </div>
            ))}
            {pipelines.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">No pipelines created yet.</p>
                <Link to="/pipelines" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Create one now</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <div className="mt-auto">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{trend}</p>
      </div>
    </div>
  );
}
