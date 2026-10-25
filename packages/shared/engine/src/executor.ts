import type { EngineNode, EngineEdge, ExecutionOptions, NodeWarning } from './types';
import { topoSort } from './topo';
import { detectNodeDrift } from './drift';
import {
  executeFilter,
  executeSort,
  executeRename,
  executeDeduplicate,
  executeGroupBy,
  executeChangeType,
  executeNullHandling,
  executeTrimCase,
  executeConcat,
  executeWindowFunction,
  executeValidation,
  executeSCD,
  executeJoin,
  executeUnion
} from './transforms';

export interface NodeExecutionOutcome {
  nodeId: string;
  data: Record<string, any>[];
  warnings?: NodeWarning[];
  error?: string;
}

/**
 * Pure, portable execution engine that runs identical pipeline transformations
 * in Node.js, serverless functions, Web Workers, or the browser DOM.
 */
export async function executePipelineCore(
  nodes: EngineNode[],
  edges: EngineEdge[],
  onNodeComplete?: (outcome: NodeExecutionOutcome) => void,
  options?: ExecutionOptions
): Promise<Map<string, Record<string, any>[]>> {
  const sortedIds = topoSort(nodes, edges);
  const results = new Map<string, Record<string, any>[]>();

  for (const nodeId of sortedIds) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    const warnings: NodeWarning[] = [];
    const ctx = { warnings };

    try {
      const category = node.data.category;
      const subType = node.data.subType || '';
      const config = node.data.config || {};

      // ─── SOURCE NODES ──────────────────────────────────────────────
      if (category === 'source' || subType === 'webhook' || subType === 'webhook-trigger') {
        const data = Array.isArray(node.data.previewData) ? [...node.data.previewData] : [];
        results.set(nodeId, data);
        onNodeComplete?.({ nodeId, data, warnings });
        continue;
      }

      // ─── TRANSFORM & VALIDATION NODES ─────────────────────────────
      if (category === 'transform' || category === 'validation') {
        const incomingEdges = edges.filter(e => e.target === nodeId);
        if (incomingEdges.length === 0) {
          results.set(nodeId, []);
          onNodeComplete?.({ nodeId, data: [], warnings });
          continue;
        }

        // 1. JOIN (Requires multiple inputs or left/right sources)
        if (subType === 'join') {
          const joinConf = node.data.joinConfig || config.joinConfig || {};
          const leftSourceId = incomingEdges[0]?.source;
          const rightSourceId = incomingEdges[1]?.source;

          const leftData = results.get(leftSourceId) || [];
          const rightData = results.get(rightSourceId) || [];

          const joined = executeJoin(leftData, rightData, joinConf);
          results.set(nodeId, joined);
          onNodeComplete?.({ nodeId, data: joined, warnings });
          continue;
        }

        // 2. UNION (Combines all incoming inputs)
        if (subType === 'union') {
          const datasets = incomingEdges.map(e => results.get(e.source) || []);
          const unionData = executeUnion(datasets);
          results.set(nodeId, unionData);
          onNodeComplete?.({ nodeId, data: unionData, warnings });
          continue;
        }

        // Single-input transforms
        const primaryInputId = incomingEdges[0].source;
        const inputData = results.get(primaryInputId) || [];
        let outputData = inputData.map(r => ({ ...r }));

        // In-flight Healer: Execute pre-transform patch shim if present
        if (node.data.preTransform) {
          try {
            // Note: in browser worker or server this applies the patch
            const patchFn = new Function('row', `return (${node.data.preTransform})(row)`) as (row: Record<string, any>) => Record<string, any>;
            outputData = outputData.map(patchFn);
          } catch (e) {
            warnings.push({ message: `Pre-transform patch failed: ${(e as Error).message}` });
          }
        } else {
          // Schema Drift Detection
          const incident = detectNodeDrift(node, outputData);
          if (incident) {
            if (options?.autonomousHealing && options.patchSynthesizer) {
              const sol = await options.patchSynthesizer(incident, outputData.slice(0, 5));
              node.data.preTransform = sol.patchCode;
              node.data.healedAt = new Date().toISOString();
              try {
                const patchFn = new Function('row', `return (${sol.patchCode})(row)`) as (row: Record<string, any>) => Record<string, any>;
                outputData = outputData.map(patchFn);
              } catch (e) {
                warnings.push({ message: `Autonomous patch application failed: ${(e as Error).message}` });
              }
            } else if (options?.onDriftDetected) {
              node.data.selfHealingIncident = incident;
              options.onDriftDetected(incident);
            }
          }
        }

        // Apply specific transform
        if (subType === 'filter') {
          outputData = executeFilter(outputData, node.data.conditions || config.conditions);
        } else if (subType === 'sort') {
          outputData = executeSort(outputData, config);
        } else if (subType === 'rename') {
          outputData = executeRename(outputData, node.data.renames || config.renames);
        } else if (subType === 'deduplicate') {
          outputData = executeDeduplicate(outputData, config);
        } else if (subType === 'group-by') {
          outputData = executeGroupBy(
            outputData,
            node.data.groupByFields || config.groupByFields,
            node.data.aggregates || config.aggregates
          );
        } else if (subType === 'change-type') {
          outputData = executeChangeType(
            outputData,
            node.data.typeChanges || config.typeChanges || {},
            ctx
          );
        } else if (subType === 'null-handling') {
          outputData = executeNullHandling(outputData, config);
        } else if (subType === 'trim-case') {
          outputData = executeTrimCase(outputData, config);
        } else if (subType === 'concat') {
          outputData = executeConcat(outputData, config);
        } else if (subType === 'window-function') {
          outputData = executeWindowFunction(outputData, config);
        } else if (category === 'validation' || subType === 'quality-check') {
          outputData = executeValidation(outputData, node.data.validationRules || config.rules);
        } else if (subType.startsWith('scd-type-')) {
          outputData = executeSCD(outputData, subType, node.data.scdConfig);
        } else if (subType === 'ai-transform' && node.data.config?.generatedCode) {
          try {
            const fn = new Function('rows', `return (${node.data.config.generatedCode})(rows)`);
            const res = fn(outputData);
            if (Array.isArray(res)) outputData = res;
          } catch (err: any) {
            warnings.push({ message: `AI transform runtime error: ${err.message}` });
          }
        } else if (subType === 'custom-code' && node.data.config?.code) {
          try {
            const fn = new Function(
              'rows',
              `${node.data.config.code}\nif (typeof transform === 'function') return transform(rows); return rows;`
            );
            const res = fn(outputData);
            if (Array.isArray(res)) outputData = res;
          } catch (err: any) {
            warnings.push({ message: `Custom code runtime error: ${err.message}` });
          }
        }

        results.set(nodeId, outputData);
        onNodeComplete?.({ nodeId, data: outputData, warnings });
        continue;
      }

      // ─── DESTINATION NODES ─────────────────────────────────────────
      if (category === 'destination') {
        const incomingEdges = edges.filter(e => e.target === nodeId);
        const inputData = incomingEdges.length > 0 ? results.get(incomingEdges[0].source) || [] : [];
        results.set(nodeId, inputData);
        onNodeComplete?.({ nodeId, data: inputData, warnings });
        continue;
      }

      // Other nodes (note, control, etc.)
      results.set(nodeId, []);
      onNodeComplete?.({ nodeId, data: [], warnings });
    } catch (err: any) {
      onNodeComplete?.({ nodeId, data: [], error: err.message, warnings });
      throw err;
    }
  }

  return results;
}
