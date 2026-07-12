import { create } from 'zustand';
import type { Notification } from '../types/common';
import { notifications as mockNotifications } from '../data/mock-users';
import { v4 as uuidv4 } from 'uuid';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  configPanelOpen: boolean;
  setConfigPanelOpen: (open: boolean) => void;
  
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;
  
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  nodePaletteSearch: string;
  setNodePaletteSearch: (s: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id, configPanelOpen: !!id }),
  configPanelOpen: false,
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  
  activeModal: null,
  modalData: null,
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  notifications: mockNotifications,
  addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: uuidv4() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  nodePaletteSearch: '',
  setNodePaletteSearch: (s) => set({ nodePaletteSearch: s }),
}));
