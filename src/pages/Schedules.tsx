import { useState } from 'react';
import { usePipelineStore } from '../store/pipeline-store';
import { Calendar, Plus, MoreVertical, Play, Power, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Schedules() {
  const { pipelines, updatePipeline, startRun } = usePipelineStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const scheduledPipelines = pipelines.filter(p => p.schedule || p.status === 'active');

  const toggleScheduleStatus = (pipelineId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    updatePipeline(pipelineId, { status: nextStatus });
    setActiveMenuId(null);
  };

  const handleTriggerNow = (pipelineId: string) => {
    startRun(pipelineId);
    setActiveMenuId(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedules & Automation Triggers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage scheduled cron routines, event webhooks, and automated pipeline execution.</p>
        </div>
        <Link to="/pipelines" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Configure Pipeline Schedule
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Pipeline</th>
              <th className="px-6 py-3 font-medium">Schedule / Frequency</th>
              <th className="px-6 py-3 font-medium">Next Scheduled Run</th>
              <th className="px-6 py-3 font-medium text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {scheduledPipelines.map(p => {
              const freq = p.schedule?.frequency || 'daily';
              const time = p.schedule?.time || '00:00';
              const tz = p.schedule?.timezone || 'UTC';
              const isActive = p.status === 'active';

              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase ${
                      isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/pipelines/${p.id}`} className="hover:text-blue-600 transition-colors">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Calendar size={14} className="text-slate-400" />
                      <span>Every {freq} at {time} ({tz})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>{isActive ? `Today at ${time} ${tz}` : 'Paused'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTriggerNow(p.id)}
                        title="Run Now"
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Play size={15} />
                      </button>
                      <button
                        onClick={() => toggleScheduleStatus(p.id, p.status)}
                        title={isActive ? 'Pause Schedule' : 'Activate Schedule'}
                        className={`p-1.5 rounded transition-colors ${
                          isActive
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {scheduledPipelines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">No active automated schedules configured</p>
                  <p className="text-xs text-slate-400 mt-1">Open any pipeline and add a Schedule trigger node or set its status to Active.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
