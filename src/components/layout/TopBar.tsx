import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Settings,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Info,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ShortcutsModal from '../ui/ShortcutsModal';

interface TopBarProps {
  onToggleTheme: () => void;
  isDark: boolean;
  onOpenCommandPalette: () => void;
}

export default function TopBar({ onToggleTheme, isDark, onOpenCommandPalette }: TopBarProps) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U';

  const notifications = [
    { id: '1', type: 'error' as const, title: 'Pipeline Failed', message: 'Revenue Report failed at Group By step', time: '5 min ago', read: false },
    { id: '2', type: 'success' as const, title: 'Pipeline Completed', message: 'Customer Sync completed successfully', time: '12 min ago', read: false },
    { id: '3', type: 'info' as const, title: 'Schedule Updated', message: 'Order Analytics schedule changed to hourly', time: '1 hr ago', read: true },
    { id: '4', type: 'comment' as const, title: 'New Comment', message: 'Sarah commented on Lead Enrichment pipeline', time: '2 hr ago', read: true },
    { id: '5', type: 'success' as const, title: 'Connector Added', message: 'BigQuery connector configured successfully', time: '3 hr ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'comment': return <MessageSquare size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-slate-500" />;
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-30 w-full min-w-0 shrink-0">
      {/* Search */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-72"
      >
        <Search size={15} />
        <span>Search pipelines, connectors...</span>
        <kbd className="ml-auto text-[10px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400">
          ⌘K
        </kbd>
      </button>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Help / Shortcuts */}
        <button
          onClick={() => setShortcutsOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={18} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl animate-slide-in-up z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">Mark all read</button>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <div className="mt-0.5">
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
              {userInitials}
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl animate-slide-in-up z-50 py-1">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Settings size={15} /> Settings
                </button>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}
