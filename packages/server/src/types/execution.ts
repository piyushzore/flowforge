import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from './workflow';

export interface ExecutionStepLog {
  stepId: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  inputPayload?: any;
  outputPayload?: any;
  error?: string;
}

export interface WorkflowExecutionReport {
  executionId: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  logs: ExecutionStepLog[];
  startedAt: string;
  completedAt?: string;
}

export interface NodeExecutor {
  type: string;
  execute(
    node: WorkflowNode,
    inputs: Record<string, any>,
    context: Record<string, any>
  ): Promise<any>;
}
