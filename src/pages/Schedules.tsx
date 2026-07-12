import { usePipelineStore } from '../store/pipeline-store';
import { Calendar, Plus, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Schedules() {
  const { pipelines } = usePipelineStore();
  const scheduledPipelines = pipelines.filter(p => p.schedule);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedules & Triggers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage automated pipeline executions.</p>
        </div>
        <Link to="/pipelines" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> New Schedule
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Pipeline</th>
              <th className="px-6 py-3 font-medium">Schedule</th>
              <th className="px-6 py-3 font-medium">Next Run</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {scheduledPipelines.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                    p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {p.name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Every {p.schedule?.frequency} at {p.schedule?.time} {p.schedule?.timezone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  Today, {p.schedule?.time}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {scheduledPipelines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No active schedules found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
