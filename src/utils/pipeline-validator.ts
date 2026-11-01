import { topoSortDetailed } from '@flowforge/shared-engine';
import type { PipelineNode, PipelineEdge } from '../types/pipeline';

export interface PreFlightIssue {
  nodeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PipelineValidationResult {
  valid: boolean;
  issues: PreFlightIssue[];
  errorNodeIds: Set<string>;
  warningNodeIds: Set<string>;
}

export function validatePipelinePreFlight(
  nodes: PipelineNode[],
  edges: PipelineEdge[]
): PipelineValidationResult {
  const issues: PreFlightIssue[] = [];
  const errorNodeIds = new Set<string>();
  const warningNodeIds = new Set<string>();

  if (!nodes || nodes.length === 0) {
    return {
      valid: false,
      issues: [{ message: 'Pipeline is empty. Add nodes to the canvas.', severity: 'error' }],
      errorNodeIds,
      warningNodeIds
    };
  }

  // 1. Cycle Detection
  const cycleCheck = topoSortDetailed(nodes, edges);
  if (cycleCheck.hasCycle) {
    issues.push({
      message: cycleCheck.errorMessage || 'Cycle detected in pipeline graph.',
      severity: 'error'
    });
    cycleCheck.cycleNodes?.forEach(id => errorNodeIds.add(id));
  }

  // 2. Missing Source Check
  const sourceNodes = nodes.filter(
    n => n.data.category === 'source' || n.data.subType === 'webhook' || n.data.subType === 'webhook-trigger'
  );
  if (sourceNodes.length === 0) {
    issues.push({
      message: 'Pipeline has no source or webhook trigger node to supply data.',
      severity: 'error'
    });
  }

  // 3. Disconnected Non-Source Nodes Check
  const incomingTargetMap = new Map<string, number>();
  edges.forEach(e => {
    incomingTargetMap.set(e.target, (incomingTargetMap.get(e.target) || 0) + 1);
  });

  nodes.forEach(node => {
    const isSource = node.data.category === 'source' || node.data.subType === 'webhook' || node.data.subType === 'webhook-trigger';
    const incomingCount = incomingTargetMap.get(node.id) || 0;

    if (!isSource && incomingCount === 0) {
      issues.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" is disconnected: missing an inbound data connection.`,
        severity: 'error'
      });
      errorNodeIds.add(node.id);
    }

    // 4. Join node validation (must have at least 2 inputs)
    if (node.data.subType === 'join' && incomingCount < 2) {
      issues.push({
        nodeId: node.id,
        message: `Join node "${node.data.label}" requires 2 incoming branches (currently has ${incomingCount}).`,
        severity: 'error'
      });
      errorNodeIds.add(node.id);
    }

    // 5. Unconfigured Node Check
    const config = node.data.config || {};
    if (isSource && !node.data.configured && !node.data.previewData && !node.data.fullData) {
      issues.push({
        nodeId: node.id,
        message: `Source node "${node.data.label}" is unconfigured: connect a data file or database table.`,
        severity: 'warning'
      });
      warningNodeIds.add(node.id);
    }

    if (node.data.subType === 'filter' && !node.data.conditions && !config.conditions && !(node.data as any).filterConfig?.conditions) {
      issues.push({
        nodeId: node.id,
        message: `Filter node "${node.data.label}" has no conditions configured.`,
        severity: 'warning'
      });
      warningNodeIds.add(node.id);
    }
  });

  const hasFatalErrors = issues.some(i => i.severity === 'error');

  return {
    valid: !hasFatalErrors,
    issues,
    errorNodeIds,
    warningNodeIds
  };
}
