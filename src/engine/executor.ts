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
        // Sources get preview data or custom config payload
        const data = node.data.previewData || [];
        results.set(nodeId, data);
        onNodeComplete(nodeId, data);
      } else if (node.data.category === 'transform' || node.data.category === 'validation') {
        const incomingEdges = edges.filter(e => e.target === nodeId);
        if (incomingEdges.length === 0) {
          results.set(nodeId, []);
          onNodeComplete(nodeId, []);
          continue;
        }

        const subType = node.data.subType;
        const config = (node.data.config as any) || {};

        // 1. JOIN Transform (Requires multiple inputs or left/right sources)
        if (subType === 'join') {
          const joinConf = node.data.joinConfig || config.joinConfig || {};
          const leftSourceId = incomingEdges[0]?.source;
          const rightSourceId = incomingEdges[1]?.source;

          const leftData = results.get(leftSourceId) || [];
          const rightData = results.get(rightSourceId) || [];

          const joinType = joinConf.joinType || 'inner';
          const leftKey = joinConf.leftField || 'id';
          const rightKey = joinConf.rightField || 'id';

          let joined: any[] = [];

          if (joinType === 'inner') {
            leftData.forEach((lRow: any) => {
              const matches = rightData.filter((rRow: any) => String(rRow[rightKey]) === String(lRow[leftKey]));
              matches.forEach((rRow: any) => {
                joined.push({ ...rRow, ...lRow });
              });
            });
          } else if (joinType === 'left') {
            leftData.forEach((lRow: any) => {
              const matches = rightData.filter((rRow: any) => String(rRow[rightKey]) === String(lRow[leftKey]));
              if (matches.length > 0) {
                matches.forEach((rRow: any) => joined.push({ ...rRow, ...lRow }));
              } else {
                joined.push({ ...lRow });
              }
            });
          } else if (joinType === 'right') {
            rightData.forEach((rRow: any) => {
              const matches = leftData.filter((lRow: any) => String(lRow[leftKey]) === String(rRow[rightKey]));
              if (matches.length > 0) {
                matches.forEach((lRow: any) => joined.push({ ...lRow, ...rRow }));
              } else {
                joined.push({ ...rRow });
              }
            });
          } else if (joinType === 'full') {
            const matchedRightIndices = new Set<number>();
            leftData.forEach((lRow: any) => {
              const matches = rightData.filter((rRow: any, idx: number) => {
                const isMatch = String(rRow[rightKey]) === String(lRow[leftKey]);
                if (isMatch) matchedRightIndices.add(idx);
                return isMatch;
              });
              if (matches.length > 0) {
                matches.forEach((rRow: any) => joined.push({ ...rRow, ...lRow }));
              } else {
                joined.push({ ...lRow });
              }
            });
            rightData.forEach((rRow: any, idx: number) => {
              if (!matchedRightIndices.has(idx)) {
                joined.push({ ...rRow });
              }
            });
          }

          results.set(nodeId, joined);
          onNodeComplete(nodeId, joined);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // 2. UNION Transform (Combines rows from all incoming inputs)
        if (subType === 'union') {
          let unionData: any[] = [];
          incomingEdges.forEach(e => {
            const incoming = results.get(e.source) || [];
            unionData = unionData.concat(JSON.parse(JSON.stringify(incoming)));
          });
          results.set(nodeId, unionData);
          onNodeComplete(nodeId, unionData);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // For other single-source transforms:
        const primaryInputId = incomingEdges[0].source;
        let inputData = results.get(primaryInputId) || [];
        let outputData = JSON.parse(JSON.stringify(inputData));

        // 3. FILTER
        if (subType === 'filter') {
          const conditions = node.data.conditions || config.conditions;
          if (Array.isArray(conditions) && conditions.length > 0) {
            outputData = outputData.filter((row: any) => {
              return conditions.every((cond: any) => {
                const val = row[cond.field];
                if (val === undefined) return false;
                switch (cond.operator) {
                  case 'equals': return String(val) === String(cond.value);
                  case 'not-equals': return String(val) !== String(cond.value);
                  case 'contains': return String(val).toLowerCase().includes(String(cond.value).toLowerCase());
                  case 'not-contains': return !String(val).toLowerCase().includes(String(cond.value).toLowerCase());
                  case 'starts-with': return String(val).startsWith(String(cond.value));
                  case 'ends-with': return String(val).endsWith(String(cond.value));
                  case 'greater-than': return Number(val) > Number(cond.value);
                  case 'less-than': return Number(val) < Number(cond.value);
                  case 'gte': return Number(val) >= Number(cond.value);
                  case 'lte': return Number(val) <= Number(cond.value);
                  case 'is-null': return val === null || val === undefined || val === '';
                  case 'is-not-null': return val !== null && val !== undefined && val !== '';
                  default: return true;
                }
              });
            });
          }
        } 
        // 4. SORT
        else if (subType === 'sort' && config.sortBy) {
          const field = config.sortBy;
          const order = config.order || 'asc';
          outputData.sort((a: any, b: any) => {
            if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
            if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
            return 0;
          });
        } 
        // 5. RENAME FIELDS
        else if (subType === 'rename') {
          const renames = node.data.renames || config.renames;
          if (Array.isArray(renames)) {
            outputData = outputData.map((row: any) => {
              const newRow = { ...row };
              for (const { oldName, newName } of renames) {
                if (oldName in newRow && newName) {
                  newRow[newName] = newRow[oldName];
                  delete newRow[oldName];
                }
              }
              return newRow;
            });
          } else if (typeof renames === 'object') {
            outputData = outputData.map((row: any) => {
              const newRow = { ...row };
              Object.entries(renames).forEach(([oldName, newName]) => {
                if (oldName in newRow && newName) {
                  newRow[newName as string] = newRow[oldName];
                  delete newRow[oldName];
                }
              });
              return newRow;
            });
          }
        } 
        // 6. DEDUPLICATE
        else if (subType === 'deduplicate') {
          const subset = config.subset || config.fields;
          const seen = new Set();
          outputData = outputData.filter((row: any) => {
            const key = Array.isArray(subset)
              ? subset.map((f: string) => row[f]).join('|')
              : subset ? row[subset] : JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        } 
        // 7. GROUP BY & AGGREGATE
        else if (subType === 'group-by') {
          const groupFields: string[] = node.data.groupByFields || config.groupByFields || [];
          const aggregates = node.data.aggregates || config.aggregates || [];

          if (groupFields.length > 0 || aggregates.length > 0) {
            const groups = new Map<string, any[]>();
            outputData.forEach((row: any) => {
              const key = groupFields.map(f => String(row[f] ?? '')).join('___');
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(row);
            });

            const aggregatedRows: any[] = [];
            groups.forEach((rowsInGroup) => {
              const repRow: any = {};
              groupFields.forEach(f => {
                repRow[f] = rowsInGroup[0]?.[f];
              });

              aggregates.forEach((agg: any) => {
                const alias = agg.alias || `${agg.function}_${agg.field}`;
                const f = agg.field;
                const vals = rowsInGroup.map(r => Number(r[f])).filter(n => !isNaN(n));

                switch (agg.function) {
                  case 'sum':
                    repRow[alias] = vals.reduce((a, b) => a + b, 0);
                    break;
                  case 'avg':
                    repRow[alias] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
                    break;
                  case 'count':
                    repRow[alias] = rowsInGroup.length;
                    break;
                  case 'count-distinct':
                    repRow[alias] = new Set(rowsInGroup.map(r => r[f])).size;
                    break;
                  case 'min':
                    repRow[alias] = vals.length ? Math.min(...vals) : null;
                    break;
                  case 'max':
                    repRow[alias] = vals.length ? Math.max(...vals) : null;
                    break;
                  default:
                    repRow[alias] = rowsInGroup.length;
                }
              });

              aggregatedRows.push(repRow);
            });

            outputData = aggregatedRows;
          }
        }
        // 8. CHANGE DATA TYPE
        else if (subType === 'change-type') {
          const typeChanges = node.data.typeChanges || config.typeChanges || {};
          outputData = outputData.map((row: any) => {
            const updated = { ...row };
            Object.entries(typeChanges).forEach(([field, targetType]) => {
              if (field in updated && updated[field] !== null && updated[field] !== undefined) {
                switch (targetType) {
                  case 'number':
                    updated[field] = Number(updated[field]);
                    break;
                  case 'string':
                    updated[field] = String(updated[field]);
                    break;
                  case 'boolean':
                    updated[field] = Boolean(updated[field]);
                    break;
                  case 'date':
                    updated[field] = new Date(updated[field]).toISOString();
                    break;
                }
              }
            });
            return updated;
          });
        }
        // 9. NULL HANDLING
        else if (subType === 'null-handling') {
          const mode = config.mode || 'fill'; // 'drop' | 'fill'
          const fillValue = config.fillValue ?? '';
          const targetFields: string[] = config.fields || [];

          if (mode === 'drop') {
            outputData = outputData.filter((row: any) => {
              if (targetFields.length === 0) return Object.values(row).every(v => v !== null && v !== undefined && v !== '');
              return targetFields.every(f => row[f] !== null && row[f] !== undefined && row[f] !== '');
            });
          } else {
            outputData = outputData.map((row: any) => {
              const copy = { ...row };
              Object.keys(copy).forEach(k => {
                if ((targetFields.length === 0 || targetFields.includes(k)) && (copy[k] === null || copy[k] === undefined)) {
                  copy[k] = fillValue;
                }
              });
              return copy;
            });
          }
        }
        // 10. TEXT CLEAN / TRIM / CASE
        else if (subType === 'trim-case') {
          const operation = config.operation || 'trim'; // 'trim' | 'upper' | 'lower'
          const field = config.field;
          outputData = outputData.map((row: any) => {
            if (!field || !(field in row)) return row;
            const updated = { ...row };
            const str = String(updated[field] || '');
            if (operation === 'trim') updated[field] = str.trim();
            else if (operation === 'upper') updated[field] = str.toUpperCase();
            else if (operation === 'lower') updated[field] = str.toLowerCase();
            return updated;
          });
        }
        // 11. CONCAT COLUMNS
        else if (subType === 'concat') {
          const fields: string[] = config.fields || [];
          const separator = config.separator || ' ';
          const outField = config.outputField || 'concatenated';
          outputData = outputData.map((row: any) => ({
            ...row,
            [outField]: fields.map(f => String(row[f] ?? '')).join(separator)
          }));
        }
        // 12. WINDOW FUNCTIONS (rank, row_number, running_total)
        else if (subType === 'window-function') {
          const fn = config.function || 'row_number';
          const orderField = config.orderBy || 'id';
          const outCol = config.outputField || fn;

          outputData.sort((a: any, b: any) => (a[orderField] > b[orderField] ? 1 : -1));

          let runningSum = 0;
          outputData = outputData.map((row: any, idx: number) => {
            const res = { ...row };
            if (fn === 'row_number') res[outCol] = idx + 1;
            else if (fn === 'running_total' && config.valueField) {
              runningSum += Number(row[config.valueField] || 0);
              res[outCol] = runningSum;
            }
            return res;
          });
        }
        // 13. VALIDATION
        else if (node.data.category === 'validation' || subType === 'quality-check') {
          const rules = node.data.validationRules || config.rules || [];
          if (Array.isArray(rules) && rules.length > 0) {
            outputData = outputData.filter((row: any) => {
              return rules.every((rule: any) => {
                const val = row[rule.field];
                if (rule.rule === 'not-null' || rule.type === 'not_null') {
                  return val !== null && val !== undefined && val !== '';
                }
                if (rule.rule === 'regex' || rule.type === 'regex') {
                  return new RegExp(rule.pattern || rule.params?.pattern).test(String(val));
                }
                if (rule.rule === 'range' && rule.params) {
                  const num = Number(val);
                  if (rule.params.min !== undefined && num < rule.params.min) return false;
                  if (rule.params.max !== undefined && num > rule.params.max) return false;
                  return true;
                }
                return true;
              });
            });
          }
        } 
        // 14. SCD TYPE 0 - 6
        else if (subType.startsWith('scd-type-')) {
          const scdConfig = node.data.scdConfig;
          if (scdConfig && scdConfig.primaryKey) {
            const trackCols = scdConfig.trackColumns || [];
            
            if (subType === 'scd-type-0' || subType === 'scd-type-1') {
              outputData = [...outputData];
            } else if (subType === 'scd-type-2') {
              outputData = outputData.map((row: any) => ({
                ...row,
                ...(scdConfig.autoColumns?.effectiveDate ? { effective_date: new Date().toISOString() } : {}),
                ...(scdConfig.autoColumns?.endDate ? { end_date: null } : {}),
                ...(scdConfig.autoColumns?.isCurrent ? { is_current: true } : {}),
                ...(scdConfig.autoColumns?.version ? { version: 1 } : {})
              }));
            } else if (subType === 'scd-type-3') {
              outputData = outputData.map((row: any) => {
                const newRow = { ...row };
                trackCols.forEach(col => {
                  newRow[`previous_${col}`] = null;
                });
                return newRow;
              });
            } else {
              outputData = [...outputData];
            }
          }
        }

        results.set(nodeId, outputData);
        onNodeComplete(nodeId, outputData);
        await new Promise(r => setTimeout(r, 250));
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
