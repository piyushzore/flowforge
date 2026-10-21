import type { Pipeline, PipelineNode, PipelineEdge } from '../types/pipeline';

// ─── YAML Export ────────────────────────────────────────────────────────────

function toYamlValue(val: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val.includes('\n') || val.includes('"') || val.includes("'") || val.includes(':') || val.includes('#')) {
      return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '\n' + val.map(v => `${pad}  - ${toYamlValue(v, indent + 4)}`).join('\n');
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return '{}';
    return '\n' + entries.map(([k, v]) => `${pad}  ${k}: ${toYamlValue(v, indent + 2)}`).join('\n');
  }
  return String(val);
}

export function exportPipelineToYaml(pipeline: Pipeline): string {
  const lines: string[] = [];

  lines.push(`# FlowForge Pipeline Export`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`name: "${pipeline.name}"`);
  lines.push(`status: ${pipeline.status}`);
  lines.push(`description: "${pipeline.description || ''}"`);
  if (pipeline.schedule) {
    lines.push('schedule:');
    lines.push(`  frequency: ${pipeline.schedule.frequency}`);
    if (pipeline.schedule.cronExpression) lines.push(`  cron: "${pipeline.schedule.cronExpression}"`);
    if (pipeline.schedule.timezone) lines.push(`  timezone: ${pipeline.schedule.timezone}`);
  }
  lines.push('');

  lines.push('nodes:');
  pipeline.nodes.forEach(node => {
    lines.push(`  - id: "${node.id}"`);
    lines.push(`    label: "${node.data.label}"`);
    lines.push(`    category: ${node.data.category}`);
    lines.push(`    subType: ${node.data.subType}`);
    lines.push(`    position:`);
    lines.push(`      x: ${Math.round(node.position.x)}`);
    lines.push(`      y: ${Math.round(node.position.y)}`);
    if (node.data.description) lines.push(`    description: "${node.data.description}"`);
    if (node.data.config && Object.keys(node.data.config).length > 0) {
      lines.push(`    config:${toYamlValue(node.data.config, 4)}`);
    }
    if (node.data.conditions && (node.data.conditions as any[]).length > 0) {
      lines.push(`    conditions:${toYamlValue(node.data.conditions, 4)}`);
    }
  });

  lines.push('');
  lines.push('edges:');
  pipeline.edges.forEach(edge => {
    lines.push(`  - id: "${edge.id}"`);
    lines.push(`    source: "${edge.source}"`);
    lines.push(`    target: "${edge.target}"`);
  });

  return lines.join('\n');
}

export function downloadPipelineYaml(pipeline: Pipeline): void {
  const yaml = exportPipelineToYaml(pipeline);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pipeline.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── YAML Import ─────────────────────────────────────────────────────────────

interface ParsedPipelineYaml {
  name: string;
  status?: string;
  description?: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

// Simple line-by-line YAML parser for pipeline format
function parseSimpleYaml(text: string): Record<string, unknown> {
  const lines = text.split('\n').filter(l => !l.trim().startsWith('#') && l.trim() !== '');
  const result: Record<string, unknown> = {};
  let currentSection: string | null = null;
  let currentItem: Record<string, unknown> | null = null;
  const sections: Record<string, unknown[]> = { nodes: [], edges: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Top-level key
    if (!line.startsWith(' ') && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');

      if (key === 'nodes' || key === 'edges') {
        currentSection = key;
        currentItem = null;
      } else {
        currentSection = null;
        result[key] = val;
      }
      continue;
    }

    // List item start
    if (line.startsWith('  - ')) {
      const rest = trimmed.slice(2).trim();
      currentItem = {};
      if (currentSection) {
        (sections[currentSection] = sections[currentSection] || []).push(currentItem);
      }
      if (rest.includes(':')) {
        const colonIdx = rest.indexOf(':');
        const k = rest.slice(0, colonIdx).trim();
        const v = rest.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
        currentItem[k] = isNaN(Number(v)) ? v : Number(v);
      }
      continue;
    }

    // Property inside an item
    if (line.startsWith('    ') && currentItem) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1) {
        const k = trimmed.slice(0, colonIdx).trim();
        const v = trimmed.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
        if (k === 'x' || k === 'y') {
          if (!currentItem.position) currentItem.position = {};
          (currentItem.position as Record<string, number>)[k] = Number(v);
        } else {
          currentItem[k] = isNaN(Number(v)) || v === '' ? v : Number(v);
        }
      }
    }
  }

  result.nodes = sections.nodes;
  result.edges = sections.edges;
  return result;
}

export function importPipelineFromYaml(yamlText: string): ParsedPipelineYaml {
  const parsed = parseSimpleYaml(yamlText);
  const ts = Date.now();

  const nodes: PipelineNode[] = ((parsed.nodes as any[]) || []).map((n: any) => ({
    id: n.id || `imported-${ts}-${Math.random().toString(36).slice(2)}`,
    type: 'pipeline-node',
    position: { x: Number(n.position?.x ?? 100), y: Number(n.position?.y ?? 200) },
    data: {
      label: n.label || 'Imported Node',
      category: n.category || 'transform',
      subType: n.subType || 'filter',
      configured: false,
      description: n.description || '',
      config: n.config || {},
    },
  }));

  const edges: PipelineEdge[] = ((parsed.edges as any[]) || []).map((e: any) => ({
    id: e.id || `imported-edge-${ts}-${Math.random().toString(36).slice(2)}`,
    source: e.source,
    target: e.target,
    data: {},
  }));

  return {
    name: String(parsed.name || 'Imported Pipeline'),
    status: String(parsed.status || 'draft'),
    description: String(parsed.description || ''),
    nodes,
    edges,
  };
}
