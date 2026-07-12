import type { Node, Edge } from '@xyflow/react';

export type NodeCategory = 'source' | 'transform' | 'destination' | 'control' | 'orchestration' | 'note';

export type SourceType = 'google-sheets' | 'postgres' | 'mysql' | 'sql-server' | 'oracle' | 'mongodb' | 'mariadb' | 'sqlite' | 'snowflake' | 'bigquery' | 'redshift' | 'databricks' | 'clickhouse' | 's3' | 'gcs' | 'azure-blob' | 'sftp' | 'csv-upload' | 'salesforce' | 'hubspot' | 'shopify' | 'stripe' | 'ga4' | 'mailchimp' | 'zendesk' | 'google-ads' | 'meta-ads' | 'quickbooks' | 'slack' | 'airtable' | 'kafka' | 'kinesis' | 'webhook' | 'rest-api' | 'graphql' | 'jdbc';

export type TransformType = 'filter' | 'sort' | 'deduplicate' | 'rename' | 'change-type' | 'add-remove-fields' | 'null-handling' | 'group-by' | 'join' | 'union' | 'pivot' | 'unpivot' | 'window-function' | 'trim-case' | 'regex' | 'split-column' | 'concat' | 'date-parse' | 'lookup' | 'api-enrichment' | 'validation' | 'ai-transform' | 'custom-code';

export type ControlType = 'conditional' | 'merge' | 'loop' | 'wait-delay';

export type OrchestationType = 'schedule' | 'webhook-trigger' | 'file-trigger' | 'dependency-trigger' | 'manual-trigger';

export type NodeSubType = SourceType | TransformType | ControlType | OrchestationType | 'annotation';

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'timestamp' | 'json' | 'array' | 'unknown';
  nullable?: boolean;
  description?: string;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'starts-with' | 'ends-with' | 'greater-than' | 'less-than' | 'gte' | 'lte' | 'is-null' | 'is-not-null' | 'in' | 'not-in' | 'regex';
  value: string;
  logic?: 'AND' | 'OR';
}

export interface AggregateRule {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count-distinct';
  alias?: string;
}

export interface JoinConfig {
  joinType: 'inner' | 'left' | 'right' | 'full';
  leftField: string;
  rightField: string;
}

export interface ScheduleConfig {
  frequency: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  time?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  cronExpression?: string;
  timezone?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

export interface ValidationRule {
  id: string;
  field: string;
  rule: 'not-null' | 'unique' | 'regex' | 'range' | 'value-list';
  params?: Record<string, unknown>;
}

export interface PipelineNodeData {
  label: string;
  description?: string;
  category: NodeCategory;
  subType: NodeSubType;
  connectorId?: string;
  configured: boolean;
  error?: string;
  fixSuggestion?: string;
  disabled?: boolean;
  
  // Config specific to node type
  config?: Record<string, unknown>;
  
  // Filter specific
  conditions?: FilterCondition[];
  
  // Rename specific
  renames?: Record<string, string>;
  
  // Change type specific
  typeChanges?: Record<string, string>;
  
  // Join specific
  joinConfig?: JoinConfig;
  
  // GroupBy specific
  groupByFields?: string[];
  aggregates?: AggregateRule[];
  
  // Schedule specific
  schedule?: ScheduleConfig;
  
  // Retry specific
  retryConfig?: RetryConfig;
  
  // Validation specific
  validationRules?: ValidationRule[];
  
  // Schema info
  inputSchema?: FieldSchema[];
  outputSchema?: FieldSchema[];
  
  // Preview data
  previewData?: Record<string, unknown>[];
  
  // Run state
  runStatus?: 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'skipped';
  runProgress?: number;
  runDuration?: number;
  rowsProcessed?: number;
  runError?: string;
  
  // Comments
  comments?: NodeComment[];
  
  // Note node content
  noteContent?: string;
  noteColor?: string;
}

export interface NodeComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export type PipelineNode = Node<PipelineNodeData>;
export type PipelineEdge = Edge;

export type PipelineStatus = 'draft' | 'active' | 'paused' | 'error';

export interface PipelineVersion {
  id: string;
  name?: string;
  timestamp: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  autoSave: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  status: PipelineStatus;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  versions: PipelineVersion[];
  currentVersionIndex: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  workspaceId: string;
  tags?: string[];
  schedule?: ScheduleConfig;
  alertConfig?: AlertConfig;
}

export interface AlertConfig {
  onFailure: boolean;
  onPartialSuccess: boolean;
  onDurationExceeded?: number;
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook';
  target: string;
  enabled: boolean;
}

export type RunStatus = 'running' | 'success' | 'failed' | 'partial' | 'cancelled';
export type RunTrigger = 'manual' | 'schedule' | 'webhook' | 'dependency' | 'file-arrival';

export interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: RunStatus;
  trigger: RunTrigger;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  rowsIn: number;
  rowsOut: number;
  error?: string;
  nodeResults: NodeRunResult[];
}

export interface NodeRunResult {
  nodeId: string;
  nodeName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  rowsIn: number;
  rowsOut: number;
  error?: string;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: string;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales-crm' | 'marketing' | 'ecommerce' | 'finance' | 'engineering' | 'general';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  connectorTypes: string[];
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  icon: string;
  usageCount: number;
}
