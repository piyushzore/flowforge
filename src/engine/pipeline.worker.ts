import { executePipelineCore, type NodeExecutionOutcome } from '@flowforge/shared-engine';

let isCancelled = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  if (type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (type === 'RUN') {
    isCancelled = false;
    const { nodes, edges, options } = payload;

    try {
      await executePipelineCore(
        nodes,
        edges,
        (outcome: NodeExecutionOutcome) => {
          if (isCancelled) return;
          self.postMessage({
            type: 'NODE_COMPLETE',
            nodeId: outcome.nodeId,
            data: outcome.data,
            error: outcome.error,
            warnings: outcome.warnings,
            progress: outcome.progress
          });
        },
        {
          autonomousHealing: options?.autonomousHealing,
          onDriftDetected: (incident) => {
            if (isCancelled) return;
            self.postMessage({
              type: 'DRIFT_DETECTED',
              incident
            });
          }
        }
      );

      if (!isCancelled) {
        self.postMessage({ type: 'RUN_COMPLETE' });
      }
    } catch (err: any) {
      if (!isCancelled) {
        self.postMessage({
          type: 'RUN_ERROR',
          error: err?.message || 'Execution error in worker'
        });
      }
    }
  }
};
