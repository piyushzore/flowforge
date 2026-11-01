import type { PipelineNode, PipelineEdge, FieldSchema } from '../types/pipeline';
import { supabase } from './supabase';

// Deprecated client-side key storage helpers maintained for API backwards-compatibility
export function getGroqApiKey(): string {
  return '';
}

export function setGroqApiKey(_key: string): void {
  // Client-side API key storage has been deprecated for security
}

export interface GeneratedPipeline {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  message: string;
}

export async function generatePipelineWithAI(prompt: string): Promise<GeneratedPipeline> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-pipeline', {
      body: { prompt }
    });

    if (!error && data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      return data;
    }
  } catch (err: any) {
    console.warn('Supabase AI edge function invocation failed, falling back to local architect:', err.message);
  }

  // Deterministic local pipeline architect fallback
  const timestamp = Date.now();
  const lower = prompt.toLowerCase();
  
  const isPostgres = lower.includes('postgres') || lower.includes('sql') || lower.includes('database');
  const isBigQuery = lower.includes('bigquery') || lower.includes('warehouse') || lower.includes('analytics');
  const isDedupe = lower.includes('deduplicate') || lower.includes('dedup') || lower.includes('unique');
  const isFilter = lower.includes('filter') || lower.includes('where') || lower.includes('active');

  const nodes: PipelineNode[] = [
    {
      id: `src-${timestamp}`,
      type: 'pipeline-node',
      position: { x: 100, y: 200 },
      data: {
        label: isPostgres ? 'PostgreSQL Orders' : 'Raw Inbound Events',
        category: 'source',
        subType: isPostgres ? 'postgres' : 'csv-upload',
        configured: true,
        description: 'Data ingestion node'
      }
    }
  ];

  let currentX = 400;
  let lastId = `src-${timestamp}`;
  const edges: PipelineEdge[] = [];

  if (isFilter) {
    const filterId = `filter-${timestamp}`;
    nodes.push({
      id: filterId,
      type: 'pipeline-node',
      position: { x: currentX, y: 200 },
      data: {
        label: 'Filter Active Records',
        category: 'transform',
        subType: 'filter',
        configured: true,
        description: 'Filters out inactive or deleted records'
      }
    });
    edges.push({ id: `e-${lastId}-${filterId}`, source: lastId, target: filterId });
    lastId = filterId;
    currentX += 300;
  }

  if (isDedupe) {
    const dedupId = `dedup-${timestamp}`;
    nodes.push({
      id: dedupId,
      type: 'pipeline-node',
      position: { x: currentX, y: 200 },
      data: {
        label: 'Deduplicate Records',
        category: 'transform',
        subType: 'deduplicate',
        configured: true,
        description: 'Removes duplicate records based on primary key'
      }
    });
    edges.push({ id: `e-${lastId}-${dedupId}`, source: lastId, target: dedupId });
    lastId = dedupId;
    currentX += 300;
  }

  const destId = `dest-${timestamp}`;
  nodes.push({
    id: destId,
    type: 'pipeline-node',
    position: { x: currentX, y: 200 },
    data: {
      label: isBigQuery ? 'BigQuery Data Warehouse' : 'Processed Storage',
      category: 'destination',
      subType: isBigQuery ? 'bigquery' : 'postgres',
      configured: true,
      description: 'Terminal sync sink'
    }
  });
  edges.push({ id: `e-${lastId}-${destId}`, source: lastId, target: destId });

  return {
    nodes,
    edges,
    message: `Architected ${nodes.length}-node pipeline for: "${prompt}".`
  };
}

export interface TransformResult {
  code: string;
  explanation: string;
  previewData?: Record<string, unknown>[];
}

export async function generateTransformWithAI(
  instruction: string,
  schema: FieldSchema[] = [],
  sampleData: Record<string, unknown>[] = []
): Promise<TransformResult> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-transform', {
      body: { instruction, schema, sampleData }
    });

    if (!error && data && data.code) {
      return data;
    }
  } catch (err: any) {
    console.warn('AI transform edge function unavailable:', err.message);
  }

  // Safe fallback transform
  return {
    code: `(rows) => rows.map(r => ({ ...r, _healed_at: new Date().toISOString() }))`,
    explanation: 'Appends _healed_at timestamp to every row (heuristic rule fallback).',
    previewData: sampleData.slice(0, 5)
  };
}

export interface ErrorExplanation {
  summary: string;
  cause: string;
  fix: string[];
  severity: 'low' | 'medium' | 'high';
}

export async function explainErrorWithAI(
  nodeName: string,
  nodeType: string,
  error: string,
  config?: Record<string, unknown>
): Promise<ErrorExplanation> {
  try {
    const { data, error: err } = await supabase.functions.invoke('explain-error', {
      body: { nodeName, nodeType, error, config }
    });

    if (!err && data && data.summary) {
      return data;
    }
  } catch {
    // fallback
  }

  return {
    summary: `Error executing step "${nodeName}" (${nodeType})`,
    cause: error || 'Execution failure detected in step transform.',
    fix: [
      'Check input schema and data types from upstream node.',
      'Verify required configuration parameters are populated.',
      'Test transform with sample data in configuration drawer.'
    ],
    severity: 'medium'
  };
}
