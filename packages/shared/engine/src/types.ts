export type NodeCategory =
  | 'source'
  | 'transform'
  | 'destination'
  | 'control'
  | 'orchestration'
  | 'note'
  | 'validation';

export type NodeSubType = string;

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'timestamp' | 'json' | 'array' | 'unknown';
  nullable?: boolean;
  description?: string;
}

export interface FilterCondition {
  id?: string;
  field: string;
  operator:
    | 'equals'
    | 'not-equals'
    | 'contains'
    | 'not-contains'
    | 'starts-with'
    | 'ends-with'
    | 'greater-than'
    | 'less-than'
    | 'gte'
    | 'lte'
    | 'is-null'
    | 'is-not-null'
    | 'in'
    | 'not-in'
    | 'regex';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface AggregateRule {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count-distinct' | 'count-rows' | 'count-non-null';
  alias?: string;
  mode?: 'rows' | 'non-null';
}

export interface JoinConfig {
  joinType: 'inner' | 'left' | 'right' | 'full';
  leftField?: string;
  rightField?: string;
  leftKeys?: string[];
  rightKeys?: string[];
  leftPrefix?: string;
  rightPrefix?: string;
  typeInsensitive?: boolean;
}

export interface ValidationRule {
  id?: string;
  field: string;
  rule?: 'not-null' | 'unique' | 'regex' | 'range' | 'value-list';
  type?: 'not_null' | 'regex' | 'range' | 'unique';
  pattern?: string;
  params?: {
    pattern?: string;
    min?: number;
    max?: number;
    values?: any[];
  };
}

export interface SCDConfig {
  primaryKey?: string;
  trackColumns?: string[];
  autoColumns?: {
    effectiveDate?: boolean;
    endDate?: boolean;
    isCurrent?: boolean;
    version?: boolean;
  };
}

export interface DriftAnomaly {
  field: string;
  type: 'renamed_column' | 'type_mismatch' | 'currency_symbol' | 'null_spike' | 'missing_required';
  severity: 'warning' | 'critical';
  details: string;
  expectedType?: string;
  receivedType?: string;
  suggestedAlias?: string;
  sampleValue?: any;
}

export interface DriftIncident {
  id: string;
  nodeId: string;
  nodeName: string;
  anomalies: DriftAnomaly[];
  detectedAt: string;
  totalSampled: number;
  affectedRowsCount: number;
  sampleProblemRows: Record<string, any>[];
  suggestedPatchCode?: string;
  diagnosis?: string;
  confidence?: number;
  status: 'pending' | 'healed' | 'quarantined' | 'ignored';
}

export interface EngineNodeData {
  label?: string;
  category?: NodeCategory;
  subType?: NodeSubType;
  config?: Record<string, any>;
  previewData?: any[];
  conditions?: FilterCondition[];
  renames?: Array<{ oldName: string; newName: string }> | Record<string, string>;
  groupByFields?: string[];
  aggregates?: AggregateRule[];
  typeChanges?: Record<string, 'string' | 'number' | 'boolean' | 'date'>;
  validationRules?: ValidationRule[];
  scdConfig?: SCDConfig;
  joinConfig?: JoinConfig;
  preTransform?: string;
  autoHealEnabled?: boolean;
  selfHealingIncident?: DriftIncident;
  healedAt?: string;
  [key: string]: any;
}

export interface EngineNode<T = EngineNodeData> {
  id: string;
  data: T;
  type?: string;
  position?: { x: number; y: number };
}

export interface EngineEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, any>;
}

export interface NodeWarning {
  field?: string;
  message: string;
  count?: number;
  sampleFailedValues?: any[];
}

export interface ExecutionOptions {
  autonomousHealing?: boolean;
  onDriftDetected?: (incident: DriftIncident) => void;
  patchSynthesizer?: (incident: DriftIncident, samples: any[]) => Promise<{ patchCode: string; diagnosis: string }>;
  sleepMs?: number;
}
