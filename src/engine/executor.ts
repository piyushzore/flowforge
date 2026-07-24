import type { PipelineNode, PipelineEdge } from '../types/pipeline';

// Helper to topologically sort the graph
export function topoSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  nodes.forEach(n => { adj.set(n.id, []); inDeg.set(n.id, 0); });
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  });
  const queue = nodes.filter(n => (inDeg.get(n.id) || 0) === 0).map(n => n.id);
  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const neighbor of (adj.get(id) || [])) {
      const deg = (inDeg.get(neighbor) || 1) - 1;
      inDeg.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }
  return result;
}

export async function executePipelineLocal(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  onNodeComplete: (nodeId: string, outputData: any[], error?: string) => void
) {
  const sortedIds = topoSort(nodes, edges);
  
  // Store the output dataset of each node
  const results = new Map<string, any[]>();

  for (const nodeId of sortedIds) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    try {
      if (node.data.category === 'source') {
        // Sources already have their preview data populated by the ConnectDataModal
        const data = node.data.previewData || [];
        results.set(nodeId, data);
        onNodeComplete(nodeId, data);
      } else if (node.data.category === 'transform' || node.data.category === 'validation') {
        // Get inputs from upstream edges
        const incomingEdges = edges.filter(e => e.target === nodeId);
        if (incomingEdges.length === 0) {
          results.set(nodeId, []);
          onNodeComplete(nodeId, []);
          continue;
        }

        // For simplicity, take the first incoming source's data as the primary input
        const primaryInputId = incomingEdges[0].source;
        let inputData = results.get(primaryInputId) || [];
        
        // Clone input data so we don't mutate previous node's output
        let outputData = JSON.parse(JSON.stringify(inputData));

        const subType = node.data.subType;
        const config = (node.data.config as any) || {};

        if (subType === 'filter' && config.conditions && Array.isArray(config.conditions)) {
          outputData = outputData.filter((row: any) => {
            return config.conditions.every((cond: any) => {
              const val = row[cond.field];
              if (val === undefined) return false;
              switch (cond.operator) {
                case 'equals': return val == cond.value;
                case 'not-equals': return val != cond.value;
                case 'contains': return String(val).toLowerCase().includes(String(cond.value).toLowerCase());
                case 'greater-than': return Number(val) > Number(cond.value);
                case 'less-than': return Number(val) < Number(cond.value);
                case 'is-null': return val === null || val === undefined || val === '';
                case 'is-not-null': return val !== null && val !== undefined && val !== '';
                default: return true;
              }
            });
          });
        } else if (subType === 'sort' && config.sortBy) {
           const field = config.sortBy;
           const order = config.order || 'asc';
           outputData.sort((a: any, b: any) => {
              if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
              if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
              return 0;
           });
        } else if (subType === 'rename' && config.renames) {
           outputData = outputData.map((row: any) => {
              const newRow = { ...row };
              for (const { oldName, newName } of config.renames) {
                 if (oldName in newRow && newName) {
                    newRow[newName] = newRow[oldName];
                    delete newRow[oldName];
                 }
              }
              return newRow;
           });
        } else if (subType === 'deduplicate' && config.subset) {
           const seen = new Set();
           outputData = outputData.filter((row: any) => {
              const key = Array.isArray(config.subset) 
                 ? config.subset.map((f: string) => row[f]).join('|') 
                 : row[config.subset];
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
           });
        } else if (node.data.category === 'validation') {
           // Phase 5 validation logic
           if (config.rules && Array.isArray(config.rules)) {
              outputData = outputData.filter((row: any) => {
                 return config.rules.every((rule: any) => {
                    const val = row[rule.field];
                    if (rule.type === 'not_null') return val !== null && val !== undefined && val !== '';
                    if (rule.type === 'regex') return new RegExp(rule.pattern).test(String(val));
                    return true;
                 });
              });
           }
        } else if (subType.startsWith('scd-type-')) {
           const scdConfig = node.data.scdConfig;
           if (scdConfig && scdConfig.primaryKey) {
             const pk = scdConfig.primaryKey;
             const trackCols = scdConfig.trackColumns || [];
             const overwriteCols = scdConfig.overwriteColumns || [];
             
             // In a real execution environment, this would hit the DB.
             // Here we simulate the logic in-memory.
             
             if (subType === 'scd-type-0') {
               // Pass-through
               outputData = [...outputData];
             } else if (subType === 'scd-type-1') {
               // Overwrite
               // Simulated: we just pass data through since we have no DB state to overwrite
               outputData = [...outputData];
             } else if (subType === 'scd-type-2') {
               // Add history
               outputData = outputData.map((row: any) => ({
                 ...row,
                 ...(scdConfig.autoColumns?.effectiveDate ? { effective_date: new Date().toISOString() } : {}),
                 ...(scdConfig.autoColumns?.endDate ? { end_date: null } : {}),
                 ...(scdConfig.autoColumns?.isCurrent ? { is_current: true } : {}),
                 ...(scdConfig.autoColumns?.version ? { version: 1 } : {})
               }));
             } else if (subType === 'scd-type-3') {
               // Previous value columns
               outputData = outputData.map((row: any) => {
                 const newRow = { ...row };
                 trackCols.forEach(col => {
                   newRow[`previous_${col}`] = null; // Simulated initial state
                 });
                 return newRow;
               });
             } else {
               // Types 4, 5, 6 - pass through for now
               outputData = [...outputData];
             }
           }
        }

        results.set(nodeId, outputData);
        onNodeComplete(nodeId, outputData);
        
        // Wait a tiny bit to simulate processing time visually
        await new Promise(r => setTimeout(r, 400));
        
      } else if (node.data.category === 'destination') {
        const incomingEdges = edges.filter(e => e.target === nodeId);
        if (incomingEdges.length > 0) {
           const primaryInputId = incomingEdges[0].source;
           const inputData = results.get(primaryInputId) || [];
           results.set(nodeId, inputData);
           onNodeComplete(nodeId, inputData);
        } else {
           onNodeComplete(nodeId, []);
        }
      }
    } catch (err: any) {
      console.error(`Error executing node ${nodeId}`, err);
      onNodeComplete(nodeId, [], err.message);
    }
  }
}
