import type { User, Workspace, Notification, AuditEntry } from '../types/common';

export const currentUser: User = {
  id: 'u-1',
  name: 'Alex Chen',
  email: 'alex@flowforge.io',
  role: 'admin',
  lastActive: new Date().toISOString(),
  createdAt: '2023-01-01T00:00:00Z'
};

export const workspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Production',
    members: [{ userId: 'u-1', role: 'admin', joinedAt: '2023-01-01T00:00:00Z' }],
    createdAt: '2023-01-01T00:00:00Z'
  }
];

export const notifications: Notification[] = [
  {
    id: 'n-1',
    type: 'run-failure',
    title: 'Pipeline Failed',
    message: 'Customer Sync failed',
    pipelineId: 'p-1',
    read: false,
    createdAt: new Date().toISOString()
  }
];
