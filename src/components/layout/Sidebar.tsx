import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Plug,
  Layers,
  Clock,
  Activity,
  BookTemplate,
  Users,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { id: 'pipelines', label: 'Pipelines', icon: <GitBranch size={20} />, path: '/pipelines' },
  { id: 'connectors', label: 'Connectors', icon: <Plug size={20} />, path: '/connectors' },
  { id: 'transforms', label: 'Transforms', icon: <Layers size={20} />, path: '/transforms' },
  { id: 'schedules', label: 'Schedules', icon: <Clock size={20} />, path: '/schedules' },
  { id: 'monitoring', label: 'Monitoring', icon: <Activity size={20} />, path: '/monitoring' },
  { id: 'templates', label: 'Templates', icon: <BookTemplate size={20} />, path: '/templates' },
  { id: 'team', label: 'Team', icon: <Users size={20} />, path: '/team' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  { id: 'marketplace', label: 'Marketplace', icon: <Store size={20} />, path: '/marketplace' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-40
        bg-white dark:bg-slate-950
        border-r border-slate-200 dark:border-slate-800
        flex flex-col
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[64px]' : 'w-[240px]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-4 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-base text-slate-900 dark:text-white tracking-tight">
            FlowForge
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {navItems.slice(0, 7).map((item) => (
            <NavItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </div>

        <div className="my-3 mx-2 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="space-y-0.5">
          {navItems.slice(7).map((item) => (
            <NavItem key={item.id} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={onToggle}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg
            text-slate-500 hover:text-slate-700 dark:hover:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-colors text-sm
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `
        flex items-center gap-2.5 px-3 py-2 rounded-lg
        transition-colors duration-100 text-[13px] font-medium
        ${collapsed ? 'justify-center' : ''}
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
        }
      `}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}
