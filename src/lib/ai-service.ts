import type { PipelineNode, PipelineEdge, FieldSchema } from '../types/pipeline';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Retrieve Groq API Key from Vite env or localStorage
export function getGroqApiKey(): string {
  return (
    localStorage.getItem('flowforge_groq_api_key') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    ''
  );
}

export function setGroqApiKey(key: string): void {
  if (key) {
    localStorage.setItem('flowforge_groq_api_key', key);
  } else {
    localStorage.removeItem('flowforge_groq_api_key');
  }
}

async function callGroqChat(messages: { role: string; content: string }[], jsonMode = true) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Groq API Key not found. Please provide an API key.');
  }

  const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  let lastError = '';

  for (const model of models) {
    try {
      const payload: Record<string, any> = {
        model,
        messages,
        temperature: 0.2,
      };
      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `Model ${model} error: ${errText}`;
        continue;
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '{}';
    } catch (err: any) {
      lastError = err.message || String(err);
    }
  }

  throw new Error(lastError || 'Failed to call AI model');
}

export interface GeneratedPipeline {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  message: string;
}

export async function generatePipelineWithAI(prompt: string): Promise<GeneratedPipeline> {
  const systemPrompt = `You are an expert data engineering pipeline architect for FlowForge.
Given the user's natural language request, generate a clean, executable visual pipeline DAG.

Available Node subTypes:
- Sources: google-sheets, postgres, mysql, snowflake, bigquery, redshift, s3, gcs, csv-upload, salesforce, hubspot, shopify, stripe, ga4, rest-api, kafka, webhook
- Transforms: filter, sort, deduplicate, rename, change-type, add-remove-fields, null-handling, group-by, join, union, pivot, unpivot, window-function, trim-case, regex, split-column, concat, date-parse, lookup, validation, ai-transform, custom-code, quality-check, scd-type-1, scd-type-2
- Destinations: postgres, mysql, snowflake, bigquery, s3, gcs, csv-upload

Output JSON Format:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "pipeline-node",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Source Label",
        "category": "source",
        "subType": "google-sheets",
        "configured": false,
        "description": "Short explanation"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ],
  "message": "Brief description of the pipeline designed"
}

Layout rules:
- Arrange nodes left-to-right: Sources at x: 100, Transforms at x: 400, 700..., Destinations at the right end.
- Space vertically by 160px if multiple branches exist.
- Return ONLY valid JSON, no markdown codeblocks.`;

  const rawJson = await callGroqChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Design a data pipeline for: "${prompt}"` },
  ]);

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI returned invalid format. Please try again.');
    }
  }

  const timestamp = Date.now();
  const idMap: Record<string, string> = {};

  const nodes: PipelineNode[] = (parsed.nodes || []).map((n: any, idx: number) => {
    const newId = `node-${timestamp}-${idx + 1}`;
    if (n.id) idMap[n.id] = newId;

    return {
      id: newId,
      type: 'pipeline-node',
      position: n.position || { x: 100 + idx * 300, y: 200 },
      data: {
        label: n.data?.label || n.label || `Node ${idx + 1}`,
        category: n.data?.category || n.category || 'transform',
        subType: n.data?.subType || n.subType || 'filter',
        configured: false,
        description: n.data?.description || n.description || '',
      },
    };
  });

  const edges: PipelineEdge[] = (parsed.edges || []).map((e: any, idx: number) => ({
    id: `edge-${timestamp}-${idx + 1}`,
    source: idMap[e.source] || e.source,
    target: idMap[e.target] || e.target,
    data: {},
  }));

  return {
    nodes,
    edges,
    message: parsed.message || `Created ${nodes.length} nodes for your pipeline.`,
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
  const schemaSummary = schema.length > 0
    ? `Fields: ${schema.map(f => `${f.name} (${f.type})`).join(', ')}`
    : 'Schema unknown';

  const systemPrompt = `You are a JavaScript data transformation specialist.
Given a transformation instruction and schema, generate a pure JavaScript function that transforms an array of row objects.

Output JSON:
{
  "code": "(rows) => rows.map(row => ({ ...row, computed: row.val * 2 }))",
  "explanation": "Brief explanation of what the logic does"
}

Rules:
- The code must be a valid JS arrow function: (rows) => ...
- Do not use external libraries or require/import.
- Return ONLY valid JSON.`;

  const raw = await callGroqChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Instruction: "${instruction}"\n${schemaSummary}\nSample: ${JSON.stringify(sampleData.slice(0, 3))}` },
  ]);

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('Failed to parse AI transform response');
  }

  let previewResult: Record<string, unknown>[] = [];
  if (sampleData.length > 0 && parsed.code) {
    try {
      // Safely evaluate arrow function for preview
      const fn = new Function('rows', `return (${parsed.code})(rows)`);
      previewResult = fn(sampleData.slice(0, 10));
    } catch (_err) {
      previewResult = [];
    }
  }

  return {
    code: parsed.code || '',
    explanation: parsed.explanation || 'Transformation logic generated.',
    previewData: previewResult,
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
  const systemPrompt = `You are an expert data pipeline troubleshooter.
Analyze the error and provide actionable, specific steps to fix it.

Output JSON:
{
  "summary": "1-sentence overview of the problem",
  "cause": "Technical explanation of why it failed",
  "fix": ["Step 1...", "Step 2..."],
  "severity": "low" | "medium" | "high"
}`;

  const raw = await callGroqChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Node: "${nodeName}" (${nodeType})\nError: ${error}\nConfig: ${JSON.stringify(config || {})}` },
  ]);

  return JSON.parse(raw);
}
