import { create } from 'zustand';
import { currentUser as demoUser, workspaces as demoWorkspaces } from '../data/mock-users';
import type { User, Workspace, AuditEntry } from '../types/common';
import { v4 as uuidv4 } from 'uuid';

interface UserState {
  currentUser: User | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  auditLog: AuditEntry[];
  isDemoMode: boolean;
  
  loadDemoWorkspace: () => void;
  setCurrentUser: (user: User | null) => void;
  addAuditLog: (action: string, resourceType: string, resourceId: string, details?: any) => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  currentUser: null,
  workspaces: [],
  activeWorkspaceId: null,
  auditLog: [],
  isDemoMode: false,

  loadDemoWorkspace: () => {
    set({
      currentUser: demoUser,
      workspaces: demoWorkspaces,
      activeWorkspaceId: demoWorkspaces[0]?.id || null,
      isDemoMode: true
    });
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },
  
  addAuditLog: (action, targetType, targetId, details) => {
    const entry: AuditEntry = {
      id: uuidv4(),
      userId: get().currentUser?.id || 'system',
      userName: get().currentUser?.name || 'System',
      action: action as any,
      targetType: targetType as any,
      targetName: targetId,
      targetId,
      timestamp: new Date().toISOString(),
      details
    };
    set(state => ({ auditLog: [entry, ...state.auditLog] }));
  }
}));
