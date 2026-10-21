import { useState } from 'react';
import {
  Settings as SettingsIcon, Key, Lock, Eye, EyeOff, Plus,
  Trash2, Copy, CheckCircle2, AlertTriangle, Shield, Users,
  Globe, Bell, Palette, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Secret {
  id: string;
  name: string;
  value: string;
  createdAt: string;
  masked: boolean;
}

const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'secrets', label: 'Secrets', icon: Key },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Settings() {
  const { org, role } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [secrets, setSecrets] = useState<Secret[]>([
    { id: '1', name: 'SNOWFLAKE_PASSWORD', value: '••••••••', createdAt: '2026-10-01', masked: true },
    { id: '2', name: 'STRIPE_SECRET_KEY', value: '••••••••', createdAt: '2026-10-10', masked: true },
  ]);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [showNewSecretValue, setShowNewSecretValue] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const handleAddSecret = () => {
    if (!newSecretName.trim() || !newSecretValue.trim()) return;
    const id = `secret-${Date.now()}`;
    setSecrets(prev => [...prev, {
      id,
      name: newSecretName.trim().toUpperCase().replace(/\s+/g, '_'),
      value: newSecretValue.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      masked: true,
    }]);
    setNewSecretName('');
    setNewSecretValue('');
    setSaveMsg('Secret saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleDeleteSecret = (id: string) => {
    setSecrets(prev => prev.filter(s => s.id !== id));
  };

  const handleCopyRef = (name: string, id: string) => {
    navigator.clipboard.writeText(`{{ secrets.${name} }}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleMask = (id: string) => {
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, masked: !s.masked } : s));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon size={24} className="text-slate-500" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your workspace, secrets, and preferences.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-48 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Workspace</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Organization Name</label>
                    <input
                      defaultValue={org?.name || 'My Organization'}
                      className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Plan</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{org?.plan_tier || 'Free'}</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-bold">
                        {org?.seat_limit || 3} seats
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Your Role</label>
                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{role || 'member'}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setSaveMsg('Settings saved!'); setTimeout(() => setSaveMsg(''), 2000); }}
                  className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
                {saveMsg && <span className="ml-3 text-xs text-emerald-600 font-medium">{saveMsg}</span>}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Appearance</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</p>
                    <p className="text-xs text-slate-500">Follows your system preference</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">Auto</span>
                </div>
              </div>
            </div>
          )}

          {/* Secrets Tab */}
          {activeTab === 'secrets' && (
            <div className="space-y-5">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Secrets are stored in your browser. Reference them in node configs using <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono text-xs">{`{{ secrets.NAME }}`}</code>
                </p>
              </div>

              {/* Add new secret */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Plus size={15} className="text-blue-500" /> Add Secret
                </h2>
                <div className="flex gap-3">
                  <input
                    value={newSecretName}
                    onChange={e => setNewSecretName(e.target.value)}
                    placeholder="SECRET_NAME"
                    className="flex-1 text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="relative flex-1">
                    <input
                      type={showNewSecretValue ? 'text' : 'password'}
                      value={newSecretValue}
                      onChange={e => setNewSecretValue(e.target.value)}
                      placeholder="Secret value"
                      className="w-full text-sm px-3 py-2 pr-9 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setShowNewSecretValue(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewSecretValue ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handleAddSecret}
                    disabled={!newSecretName.trim() || !newSecretValue.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
                {saveMsg && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 size={11} /> {saveMsg}</p>}
              </div>

              {/* Secrets list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{secrets.length} Secrets</p>
                </div>
                {secrets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    No secrets added yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {secrets.map(secret => (
                      <div key={secret.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <Lock size={13} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">{secret.name}</p>
                            <p className="text-[11px] text-slate-400">Added {secret.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {secret.masked ? '••••••••' : secret.value.slice(0, 12) + (secret.value.length > 12 ? '…' : '')}
                          </span>
                          <button onClick={() => toggleMask(secret.id)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            {secret.masked ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                          <button onClick={() => handleCopyRef(secret.name, secret.id)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Copy reference">
                            {copiedId === secret.id ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <button onClick={() => handleDeleteSecret(secret.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-blue-500" /> Security Settings
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Two-Factor Authentication', desc: 'Add an extra layer of protection', status: 'Not configured', action: 'Enable' },
                    { label: 'Session Timeout', desc: 'Auto-logout after inactivity', status: '24 hours', action: 'Change' },
                    { label: 'API Rate Limiting', desc: 'Requests per minute per org', status: '1,000 / min', action: 'Upgrade' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">{item.status}</span>
                        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">{item.action}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Bell size={16} className="text-blue-500" /> Notification Preferences
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Pipeline Failure', desc: 'Get notified when a pipeline fails' },
                  { label: 'Run Completion', desc: 'Notification after every successful run' },
                  { label: 'Schedule Reminders', desc: 'Upcoming scheduled pipeline alerts' },
                  { label: 'Team Activity', desc: 'When teammates create or edit pipelines' },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-200 peer-checked:bg-blue-600 rounded-full peer transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Slack Webhook URL</label>
                <input
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
