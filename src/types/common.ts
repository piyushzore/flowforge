export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  lastActive: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  members: WorkspaceMember[];
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Notification {
  id: string;
  type: 'run-failure' | 'run-success' | 'alert' | 'comment' | 'invite' | 'system';
  title: string;
  message: string;
  pipelineId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'activate' | 'pause' | 'run' | 'rollback' | 'invite' | 'permission-change';
  targetType: 'pipeline' | 'connector' | 'user' | 'workspace' | 'settings';
  targetName: string;
  targetId: string;
  timestamp: string;
  details?: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  type: 'connector' | 'transform' | 'template';
  description: string;
  author: string;
  authorAvatar?: string;
  rating: number;
  installCount: number;
  icon: string;
  category: string;
  installed?: boolean;
  version: string;
  updatedAt: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  environment: 'development' | 'staging' | 'production';
  masked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}
