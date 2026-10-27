import type { PipelineNode, PipelineEdge } from '../types/pipeline';
import { topoSort, topoSortDetailed, executePipelineCore, type DriftIncident } from '@flowforge/shared-engine';
import { synthesizeHealingPatch } from '../lib/ai-healer';

export { topoSort, topoSortDetailed };

let activeWorker: Worker | null = null;

export function cancelPipelineExecution(): void {
  if (activeWorker) {
    try {
      activeWorker.postMessage({ type: 'CANCEL' });
      activeWorker.terminate();
    } catch {
      // ignore
    }
    activeWorker = null;
  }
}

export async function executePipelineLocal(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  onNodeComplete: (nodeId: string, outputData: any[], error?: string) => void,
  options?: {
    autonomousHealing?: boolean;
    onDriftDetected?: (incident: DriftIncident) => void;
  }
): Promise<void> {
  // If running in browser environment with Worker support, execute in isolated Web Worker
  if (typeof Worker !== 'undefined') {
    cancelPipelineExecution();

    return new Promise<void>((resolve) => {
      try {
        const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });
        activeWorker = worker;

        worker.onmessage = (event: MessageEvent) => {
          const { type, nodeId, data, error, incident } = event.data || {};

          if (type === 'NODE_COMPLETE') {
            onNodeComplete(nodeId, data, error);
          } else if (type === 'DRIFT_DETECTED' && incident) {
            options?.onDriftDetected?.(incident);
          } else if (type === 'RUN_COMPLETE' || type === 'RUN_ERROR') {
            worker.terminate();
            if (activeWorker === worker) activeWorker = null;
            resolve();
          }
        };

        worker.onerror = (err) => {
          console.error('Pipeline worker error:', err);
          worker.terminate();
          if (activeWorker === worker) activeWorker = null;
          resolve();
        };

        // Serialize plain node and edge data for transfer
        const serializableNodes = JSON.parse(JSON.stringify(nodes));
        const serializableEdges = JSON.parse(JSON.stringify(edges));

        worker.postMessage({
          type: 'RUN',
          payload: {
            nodes: serializableNodes,
            edges: serializableEdges,
            options: {
              autonomousHealing: options?.autonomousHealing
            }
          }
        });
      } catch (err) {
        console.warn('Failed to start Web Worker, falling back to main-thread execution:', err);
        // Fallback to in-process execution below
        executeInProcess();
      }

      async function executeInProcess() {
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
          // reported per node
        }
        resolve();
      }
    });
  }

  // Non-worker environment (Node.js, Vitest, SSR)
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
