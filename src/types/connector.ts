export type ConnectorCategory = 'database' | 'warehouse' | 'cloud-storage' | 'saas' | 'streaming' | 'file' | 'generic';

export type ConnectorDirection = 'source' | 'destination' | 'both';

export type AuthType = 'none' | 'api-key' | 'oauth2' | 'bearer' | 'basic' | 'connection-string' | 'service-account' | 'iam';

export type ConnectionHealth = 'healthy' | 'degraded' | 'error' | 'unknown';

export type SyncMode = 'full-refresh' | 'incremental' | 'cdc';

export interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'textarea' | 'file' | 'toggle';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: ConnectorCategory;
  direction: ConnectorDirection;
  icon: string;
  color: string;
  description: string;
  shortDescription: string;
  authType: AuthType;
  authFields: AuthField[];
  supportedSyncModes: SyncMode[];
  maturity: 'ga' | 'beta' | 'alpha' | 'community';
  popular?: boolean;
  tags?: string[];
}

export interface ConnectorInstance {
  id: string;
  definitionId?: string;
  connectorId?: string;
  name: string;
  config: Record<string, string>;
  health: ConnectionHealth;
  lastTested?: string;
  lastUsed?: string;
  createdAt: string;
  createdBy?: string;
  pipelinesUsing: string[] | number;
  schema?: ConnectorSchema;
}

export interface ConnectorSchema {
  tables: TableSchema[];
  lastDiscovered: string;
}

export interface TableSchema {
  name: string;
  fields: SchemaField[];
  rowCount?: number;
}

export interface SchemaField {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  description?: string;
}
