import type { EngineNode, EngineEdge } from './types';

export interface TopoSortResult {
  sortedIds: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
  cycleEdgeIds?: string[];
  errorMessage?: string;
}

/**
 * Topologically sorts DAG nodes using Kahn's algorithm and detects cycles with path tracking.
 */
export function topoSortDetailed<
  N extends { id: string } = EngineNode,
  E extends { source: string; target: string; id?: string } = EngineEdge
>(nodes: N[], edges: E[]): TopoSortResult {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  const edgeMap = new Map<string, string>(); // 'source->target' -> edgeId

  nodes.forEach(n => {
    adj.set(n.id, []);
    inDeg.set(n.id, 0);
  });

  edges.forEach((e, index) => {
    if (adj.has(e.source) && inDeg.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
      edgeMap.set(`${e.source}->${e.target}`, e.id || `edge-${index}`);
    }
  });

  const queue: string[] = [];
  inDeg.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const sortedIds: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    sortedIds.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDeg.get(neighbor) || 1) - 1;
      inDeg.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedIds.length === nodes.length) {
    return { sortedIds, hasCycle: false };
  }

  // Cycle detected: identify offending nodes (remaining nodes with inDeg > 0)
  const remainingNodes = nodes.filter(n => (inDeg.get(n.id) || 0) > 0).map(n => n.id);
  const cycleEdges: string[] = [];
  remainingNodes.forEach(src => {
    const targets = adj.get(src) || [];
    targets.forEach(tgt => {
      if (remainingNodes.includes(tgt)) {
        const edgeId = edgeMap.get(`${src}->${tgt}`);
        if (edgeId) cycleEdges.push(edgeId);
      }
    });
  });

  // Build cycle path description if possible
  const cycleDesc = remainingNodes.slice(0, 4).join(' → ') + ' → ' + remainingNodes[0];
  const errorMessage = `Cycle detected in pipeline graph: ${cycleDesc}`;

  return {
    sortedIds,
    hasCycle: true,
    cycleNodes: remainingNodes,
    cycleEdgeIds: cycleEdges,
    errorMessage
  };
}

/**
 * Backward-compatible topoSort signature that throws a clear error on cycle detection
 */
export function topoSort<
  N extends { id: string } = EngineNode,
  E extends { source: string; target: string; id?: string } = EngineEdge
>(nodes: N[], edges: E[]): string[] {
  const result = topoSortDetailed(nodes, edges);
  if (result.hasCycle) {
    throw new Error(result.errorMessage || 'Cycle detected in pipeline graph');
  }
  return result.sortedIds;
}
