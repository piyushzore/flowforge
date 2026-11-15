/**
 * dbt model export from FlowForge pipeline DAG.
 *
 * Traverses the pipeline in topological order and generates a single
 * dbt SQL file per terminal (destination) node, expressed as a CTE chain.
 *
 * Usage:
 *   const files = exportDbtModels(pipeline);
 *   files.forEach(f => downloadFile(f.filename, f.content));
 */

import type { Pipeline, PipelineNode } from '../types/pipeline';

export interface DbtFile {
  filename: string;
  content: string;
}

/** Sanitise a node label into a valid SQL identifier. */
function toIdentifier(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'node';
}

/** Build an adjacency map: nodeId → [upstream nodeIds] */
function buildUpstreamMap(pipeline: Pipeline): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const node of pipeline.nodes) map.set(node.id, []);
  for (const edge of pipeline.edges) {
    const upstreams = map.get(edge.target) ?? [];
    upstreams.push(edge.source);
    map.set(edge.target, upstreams);
  }
  return map;
}

/** Topological sort — returns node IDs in execution order. */
function topoSort(pipeline: Pipeline): string[] {
  const upstream = buildUpstreamMap(pipeline);
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const up of upstream.get(id) ?? []) visit(up);
    order.push(id);
  }

  for (const node of pipeline.nodes) visit(node.id);
  return order;
}

/** Describe what a transform node does in a SQL comment. */
function transformComment(node: PipelineNode): string {
  switch (node.data.subType) {
    case 'filter': return '-- filter rows';
    case 'sort': return '-- sort rows';
    case 'rename': return '-- rename columns';
    case 'deduplicate': return '-- deduplicate rows';
    case 'group-by': return '-- aggregate / group-by';
    case 'join': return '-- join datasets';
    case 'change-type': return '-- cast types';
    case 'duckdb-sql': return '-- custom DuckDB SQL';
    default: return `-- ${node.data.subType ?? 'transform'}`;
  }
}

/** Generate the SQL fragment for a single transform node. */
function nodeToSQL(node: PipelineNode, inputAlias: string): string {
  const comment = transformComment(node);
  switch (node.data.subType) {
    case 'filter': {
      const conds = ((node.data?.filterConfig as any)?.conditions ?? []) as Array<{ field: string; operator: string; value: unknown }>;
      if (!conds.length) return `${comment}\nSELECT * FROM ${inputAlias}`;
      const where = conds
        .map(c => `${c.field} ${c.operator ?? '='} '${c.value}'`)
        .join(' AND ');
      return `${comment}\nSELECT * FROM ${inputAlias}\nWHERE ${where}`;
    }
    case 'sort': {
      const sorts = ((node.data?.sortConfig as any)?.fields ?? []) as Array<{ field: string; direction: string }>;
      if (!sorts.length) return `${comment}\nSELECT * FROM ${inputAlias}`;
      const order = sorts.map(s => `${s.field} ${(s.direction ?? 'asc').toUpperCase()}`).join(', ');
      return `${comment}\nSELECT * FROM ${inputAlias}\nORDER BY ${order}`;
    }
    case 'deduplicate': {
      const fields = ((node.data?.deduplicateConfig as any)?.fields ?? []) as string[];
      if (!fields.length) return `${comment}\nSELECT DISTINCT * FROM ${inputAlias}`;
      const cols = fields.join(', ');
      return `${comment}\nSELECT * FROM (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY ${cols}) AS _rn\n  FROM ${inputAlias}\n)\nWHERE _rn = 1`;
    }
    case 'group-by': {
      const cfg = (node.data?.aggregateConfig ?? {}) as Record<string, unknown>;
      const groupBy = ((cfg["groupByFields"] as string[]) ?? []).join(', ');
      const aggs = ((cfg["aggregations"] as Array<{field: string; function: string; alias: string}>) ?? [])
        .map(a => `${a.function.toUpperCase()}(${a.field}) AS ${a.alias || a.field}`).join(',\n  ');
      if (!groupBy && !aggs) return `${comment}\nSELECT * FROM ${inputAlias}`;
      const selectParts = [groupBy, aggs].filter(Boolean).join(',\n  ');
      return `${comment}\nSELECT\n  ${selectParts}\nFROM ${inputAlias}${groupBy ? `\nGROUP BY ${groupBy}` : ''}`;
    }
    case 'rename': {
      const renames = ((node.data?.renameConfig as any)?.mappings ?? []) as Array<{ from: string; to: string }>;
      if (!renames.length) return `${comment}\nSELECT * FROM ${inputAlias}`;
      const cols = renames.map(r => `${r.from} AS ${r.to}`).join(',\n  ');
      return `${comment}\nSELECT\n  ${cols},\n  * EXCLUDE (${renames.map(r => r.from).join(', ')})\nFROM ${inputAlias}`;
    }
    case 'duckdb-sql': {
      const sql = (node.data?.sql as string | undefined) ?? `SELECT * FROM ${inputAlias}`;
      return `${comment}\n${sql.replace(/\binput\b/g, inputAlias)}`;
    }
    default:
      return `${comment}\nSELECT * FROM ${inputAlias}`;
  }
}

/** Export the full pipeline as dbt model files. */
export function exportDbtModels(pipeline: Pipeline): DbtFile[] {
  const nodeMap = new Map(pipeline.nodes.map(n => [n.id, n]));
  const upstream = buildUpstreamMap(pipeline);
  const order = topoSort(pipeline);

  // Map nodeId → its CTE alias (for SQL references)
  const idToAlias = new Map<string, string>();
  const usedAliases = new Set<string>();
  for (const id of order) {
    const node = nodeMap.get(id)!;
    let alias = toIdentifier(node.data?.label ?? node.data.subType ?? id);
    let attempt = alias;
    let n = 2;
    while (usedAliases.has(attempt)) attempt = `${alias}_${n++}`;
    idToAlias.set(id, attempt);
    usedAliases.add(attempt);
  }

  // Find terminal nodes (no outgoing edges)
  const hasDownstream = new Set(pipeline.edges.map(e => e.source));
  const terminals = pipeline.nodes.filter(n => !hasDownstream.has(n.id));
  if (terminals.length === 0) return [];

  const files: DbtFile[] = [];

  for (const terminal of terminals) {
    // Collect the ancestor subgraph of this terminal in topo order
    const ancestors = new Set<string>();
    function collectAncestors(id: string) {
      if (ancestors.has(id)) return;
      ancestors.add(id);
      for (const up of upstream.get(id) ?? []) collectAncestors(up);
    }
    collectAncestors(terminal.id);

    const subOrder = order.filter(id => ancestors.has(id));
    const ctes: string[] = [];

    for (const id of subOrder) {
      const node = nodeMap.get(id)!;
      const alias = idToAlias.get(id)!;
      const ups = upstream.get(id) ?? [];

      let sql: string;
      if (node.data.category === 'source') {
        // Source node → dbt source reference
        const sourceName = node.data?.connector ?? 'raw';
        const tableName = node.data?.table ?? toIdentifier(node.data?.label ?? 'source');
        sql = `SELECT * FROM {{ source('${sourceName}', '${tableName}') }}`;
      } else if (ups.length === 0) {
        sql = `SELECT * FROM {{ ref('missing_upstream') }}`;
      } else if (ups.length === 1) {
        const inputAlias = idToAlias.get(ups[0])!;
        sql = nodeToSQL(node, inputAlias);
      } else {
        // Multi-input (join/union) — emit a simplified placeholder
        const inputs = ups.map(u => idToAlias.get(u)!).join(', ');
        sql = `-- multi-input (${inputs})\nSELECT * FROM ${idToAlias.get(ups[0])!}`;
      }

      ctes.push(`${alias} AS (\n  ${sql.split('\n').join('\n  ')}\n)`);
    }

    const termAlias = idToAlias.get(terminal.id)!;
    const modelName = toIdentifier(terminal.data?.label ?? terminal.data?.subType ?? terminal.id);
    const content = [
      `-- Auto-generated by FlowForge dbt export`,
      `-- Pipeline: ${pipeline.name}`,
      `-- Model: ${modelName}`,
      `-- Generated: ${new Date().toISOString()}`,
      '',
      `WITH`,
      ctes.join(',\n\n'),
      '',
      `SELECT * FROM ${termAlias}`,
    ].join('\n');

    files.push({ filename: `models/${modelName}.sql`, content });
  }

  return files;
}

/** Trigger browser download of a text file. */
export function downloadDbtFile(file: DbtFile): void {
  const blob = new Blob([file.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.filename.replace(/\//g, '__');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Trigger browser download of all dbt models as individual files. */
export function downloadAllDbtModels(pipeline: Pipeline): void {
  const files = exportDbtModels(pipeline);
  if (files.length === 0) {
    alert('No terminal nodes found — add a destination or leaf node first.');
    return;
  }
  files.forEach(downloadDbtFile);
}
