import type { EngineNode, EngineEdge } from './types';

export interface TopoSortResult {
  sortedIds: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
  cycleEdgeIds?: string[];
  errorMessage?: string;
}

/**
 * Finds the exact cycle path among the remaining nodes using DFS with backtracking.
 */
function findCyclePath(nodes: string[], adj: Map<string, string[]>): string[] {
  const nodeSet = new Set(nodes);
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();
  let cycle: string[] = [];

  function dfs(curr: string): boolean {
    visited.add(curr);
    inStack.add(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!nodeSet.has(next)) continue;
      if (!visited.has(next)) {
        parent.set(next, curr);
        if (dfs(next)) return true;
      } else if (inStack.has(next)) {
        // Cycle detected: trace path from next back through parents to curr, then next
        const path: string[] = [next];
        let p: string | undefined = curr;
        while (p && p !== next) {
          path.push(p);
          p = parent.get(p);
        }
        path.push(next);
        cycle = path.reverse();
        return true;
      }
    }

    inStack.delete(curr);
    return false;
  }

  for (const n of nodes) {
    if (!visited.has(n)) {
      if (dfs(n)) break;
    }
  }

  return cycle.length > 0 ? cycle : nodes;
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
  const cyclePath = findCyclePath(remainingNodes, adj);
  const cycleDesc = cyclePath.join(' → ');
  const errorMessage = `Cycle detected: ${cycleDesc}`;

  // Collect offending edges forming the cycle
  const cycleEdges: string[] = [];
  for (let i = 0; i < cyclePath.length - 1; i++) {
    const edgeId = edgeMap.get(`${cyclePath[i]}->${cyclePath[i + 1]}`);
    if (edgeId && !cycleEdges.includes(edgeId)) {
      cycleEdges.push(edgeId);
    }
  }

  // Also include any other edges between remaining cycle nodes
  remainingNodes.forEach(src => {
    const targets = adj.get(src) || [];
    targets.forEach(tgt => {
      if (remainingNodes.includes(tgt)) {
        const edgeId = edgeMap.get(`${src}->${tgt}`);
        if (edgeId && !cycleEdges.includes(edgeId)) cycleEdges.push(edgeId);
      }
    });
  });

  return {
    sortedIds,
    hasCycle: true,
    cycleNodes: Array.from(new Set(cyclePath)),
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
