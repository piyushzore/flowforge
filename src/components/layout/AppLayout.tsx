import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

import ConnectDataModal from '../canvas/ConnectDataModal';
import ShortcutsModal from '../ui/ShortcutsModal';
import OnboardingModal from '../ui/OnboardingModal';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcut if typing in input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      {/* Keyboard Shortcuts Guide */}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Welcome Onboarding Tour */}
      <OnboardingModal />
    </div>
  );
}
