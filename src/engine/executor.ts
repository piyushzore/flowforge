import type { PipelineNode, PipelineEdge } from '../types/pipeline';
import { topoSort, executePipelineCore, type DriftIncident } from '@flowforge/shared-engine';
import { synthesizeHealingPatch } from '../lib/ai-healer';

export { topoSort };

export async function executePipelineLocal(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  onNodeComplete: (nodeId: string, outputData: any[], error?: string) => void,
  options?: {
    autonomousHealing?: boolean;
    onDriftDetected?: (incident: DriftIncident) => void;
  }
) {
  try {
    await executePipelineCore(
      nodes as any,
      edges as any,
      (outcome) => {
        onNodeComplete(outcome.nodeId, outcome.data, outcome.error);
      },
      {
        autonomousHealing: options?.autonomousHealing,
        onDriftDetected: options?.onDriftDetected,
        patchSynthesizer: synthesizeHealingPatch
      }
    );
  } catch {
    // Errors are reported per-node via onNodeComplete
  }
}
