import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

import ConnectDataModal from '../canvas/ConnectDataModal';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`h-screen flex ${isDark ? 'dark' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-[64px]' : 'ml-[240px]'}`}
      >
        <TopBar
          onToggleTheme={toggleTheme}
          isDark={isDark}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <Outlet context={{ commandPaletteOpen, setCommandPaletteOpen }} />
        </main>
      </div>

      {/* Global Connection Modal overlay */}
      <ConnectDataModal />
    </div>
  );
}
