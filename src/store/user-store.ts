import { create } from 'zustand';
import { currentUser, workspaces } from '../data/mock-users';
import type { User, Workspace, AuditEntry } from '../types/common';
import { v4 as uuidv4 } from 'uuid';

interface UserState {
  currentUser: User | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  auditLog: AuditEntry[];
  
  addAuditLog: (action: string, resourceType: string, resourceId: string, details?: any) => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  currentUser,
  workspaces,
  activeWorkspaceId: workspaces[0]?.id || null,
  auditLog: [],
  
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
