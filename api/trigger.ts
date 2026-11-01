import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import { executePipelineCore, type EngineNode, type EngineEdge } from '../packages/shared/engine/src/index';

// In-memory sliding window rate limiter (max 60 requests per minute per token or IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB limit

export function checkRateLimit(key: string, now = Date.now()): boolean {
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(key, validTimestamps);
    return false; // Rate limit exceeded
  }
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export interface TriggerPipelineInput {
  id: string;
  name: string;
  org_id?: string;
  nodes: EngineNode[];
  edges: EngineEdge[];
}

export async function executePipelinePayload(
  pipeline: TriggerPipelineInput,
  rawPayload: any
): Promise<{ executionId: string; recordsIn: number; recordsOut: number; latencyMs: number; data: any[] }> {
  const startTime = Date.now();

  let records: any[] = [];
  if (Array.isArray(rawPayload)) {
    records = rawPayload;
  } else if (rawPayload && typeof rawPayload === 'object') {
    if (Array.isArray(rawPayload.data)) {
      records = rawPayload.data;
    } else if (Array.isArray(rawPayload.records)) {
      records = rawPayload.records;
    } else if (rawPayload.order || rawPayload.charge || rawPayload.event) {
      records = [rawPayload.order || rawPayload.charge || rawPayload];
    } else {
      records = [rawPayload];
    }
  }

  if (records.length === 0) {
    throw new Error('No valid records found in payload.');
  }

  // Clone nodes to avoid mutating original pipeline definition
  const clonedNodes: EngineNode[] = pipeline.nodes.map(n => ({
    ...n,
    data: { ...n.data }
  }));

  // Find the primary source/webhook node to inject payload records
  const webhookNode = clonedNodes.find(
    n => n.data.subType === 'webhook' || n.data.subType === 'webhook-trigger' || n.data.category === 'source'
  );

  if (webhookNode) {
    webhookNode.data.fullData = records;
    webhookNode.data.previewData = records.slice(0, 100);
  }

  // Execute using shared portable engine
  const results = await executePipelineCore(clonedNodes, pipeline.edges);

  // Identify terminal nodes or destination nodes
  const destinationNodes = clonedNodes.filter(n => n.data.category === 'destination');
  let finalData: any[] = [];

  if (destinationNodes.length > 0) {
    finalData = results.get(destinationNodes[0].id) || [];
  } else {
    // Find leaf nodes (no outgoing edges)
    const leafNodes = clonedNodes.filter(n => !pipeline.edges.some(e => e.source === n.id));
    if (leafNodes.length > 0) {
      finalData = results.get(leafNodes[0].id) || [];
    } else if (clonedNodes.length > 0) {
      finalData = results.get(clonedNodes[clonedNodes.length - 1].id) || [];
    }
  }

  const latencyMs = Math.max(1, Date.now() - startTime);
  const executionId = `run_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  return {
    executionId,
    recordsIn: records.length,
    recordsOut: finalData.length,
    latencyMs,
    data: finalData
  };
}

export default async function handler(req: IncomingMessage & { body?: any; query?: Record<string, string> }, res: ServerResponse) {
  const origin = req.headers.origin || 'https://flowforge.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'FlowForge Webhook API only accepts POST requests.' }));
    return;
  }

  // 1. Check Payload Size Limit (1 MB)
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    res.statusCode = 413;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Payload Too Large', message: 'Payload size exceeds the 1 MB limit.' }));
    return;
  }

  // 2. Parse request body
  let rawBody: any = null;
  try {
    if (req.body && typeof req.body === 'object') {
      rawBody = req.body;
    } else {
      const chunks: Buffer[] = [];
      let totalSize = 0;
      for await (const chunk of req) {
        totalSize += chunk.length;
        if (totalSize > MAX_PAYLOAD_BYTES) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Payload Too Large', message: 'Payload size exceeds the 1 MB limit.' }));
          return;
        }
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(chunks).toString('utf-8');
      rawBody = rawText ? JSON.parse(rawText) : {};
    }
  } catch (err: any) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Bad Request', message: `Invalid JSON payload: ${err.message}` }));
    return;
  }

  // 3. Extract Token & Rate Limiting
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (rawBody?.token || '');
  const rateLimitKey = token ? hashApiToken(token) : (req.socket?.remoteAddress || 'anonymous');

  if (!checkRateLimit(rateLimitKey)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded (max 60 req/min). Please try again shortly.' }));
    return;
  }

  // 4. Resolve Pipeline Definition
  const pipelineId = (req.query?.pipeline as string) || rawBody?.pipelineId || 'default-pipeline';
  let pipeline: TriggerPipelineInput | null = rawBody?.pipeline || null;

  // If Supabase credentials are configured in serverless environment, query database
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !pipeline) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify token if present
      if (token) {
        const tokenHash = hashApiToken(token);
        const { data: tokenRecord } = await supabase
          .from('pipeline_api_tokens')
          .select('pipeline_id')
          .eq('token_hash', tokenHash)
          .single();

        if (tokenRecord && tokenRecord.pipeline_id !== pipelineId) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Forbidden', message: 'API token is not authorized for this pipeline.' }));
          return;
        }
      }

      // Fetch saved pipeline
      const { data: pipelineRow } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .single();

      if (pipelineRow) {
        pipeline = {
          id: pipelineRow.id,
          name: pipelineRow.name,
          org_id: pipelineRow.org_id,
          nodes: pipelineRow.nodes || [],
          edges: pipelineRow.edges || []
        };
      }
    } catch {
      // Continue to fallback if Supabase is unreachable
    }
  }

  if (!pipeline) {
    // If not found in DB or DB unconfigured, create default pass-through pipeline with the source node
    pipeline = {
      id: pipelineId,
      name: 'Webhook Trigger Pipeline',
      nodes: [
        {
          id: 'src-1',
          data: {
            category: 'source',
            subType: 'webhook-trigger',
            label: 'Webhook Trigger',
            config: {}
          }
        }
      ],
      edges: []
    };
  }

  try {
    const payloadData = rawBody?.payload !== undefined ? rawBody.payload : rawBody;
    const execution = await executePipelinePayload(pipeline, payloadData);

    // If Supabase is available, persist the run
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('pipeline_runs').insert({
          id: execution.executionId,
          pipeline_id: pipeline.id,
          pipeline_name: pipeline.name,
          org_id: pipeline.org_id,
          status: 'success',
          trigger: 'webhook',
          duration: execution.latencyMs,
          rows_in: execution.recordsIn,
          rows_out: execution.recordsOut
        });
      } catch {
        // Run telemetry logging is non-blocking
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      message: 'Pipeline executed successfully via API',
      executionId: execution.executionId,
      pipelineId: pipeline.id,
      recordsIn: execution.recordsIn,
      recordsOut: execution.recordsOut,
      latencyMs: execution.latencyMs,
      data: execution.data
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Execution Failed',
      message: err.message || 'An error occurred during pipeline execution.'
    }));
  }
}
