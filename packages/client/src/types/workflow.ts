export type NodeType =
  | 'input'
  | 'validation'
  | 'dbInsert'
  | 'dbQuery'
  | 'dbUpdate'
  | 'dbDelete'
  | 'authJwt'
  | 'emailSend'
  | 'httpCall'
  | 'logicCondition'
  | 'response';

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  config: Record<string, any>;
  description?: string;
  status?: 'idle' | 'running' | 'success' | 'failed';
  outputData?: any;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface IntentGenerationResult {
  intent: 'create' | 'modify' | 'deploy' | 'test' | 'inspect';
  explanation: string;
  suggestedComponents: Array<
    'WorkflowGraph' | 'BackendExplainer' | 'ExecutionLogs' | 'DeployPanel' | 'APIPlayground' | 'NodeInspector'
  >;
  workflowUpdate?: {
    nodesAdded?: WorkflowNode[];
    nodesUpdated?: WorkflowNode[];
    nodesRemoved?: string[];
    edgesAdded?: WorkflowEdge[];
    edgesRemoved?: string[];
  };
}
