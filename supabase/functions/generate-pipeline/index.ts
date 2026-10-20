import { corsHeaders } from '../_shared/cors.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface GeneratePipelineRequest {
  prompt: string
  existingNodes?: { id: string; label: string }[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: GeneratePipelineRequest = await req.json()
    const { prompt } = body

    const systemPrompt = `You are a data pipeline designer for FlowForge, a visual data engineering platform.
Given a plain English description of a data pipeline, generate a valid pipeline DAG as JSON.

AVAILABLE NODE TYPES (use subType exactly as listed):

Sources: google-sheets, postgres, mysql, snowflake, bigquery, redshift, s3, gcs, csv-upload, salesforce, hubspot, shopify, stripe, ga4, rest-api, kafka, webhook

Transforms: filter, sort, deduplicate, rename, change-type, add-remove-fields, null-handling, group-by, join, union, pivot, unpivot, window-function, trim-case, regex, split-column, concat, date-parse, lookup, validation, ai-transform, custom-code, quality-check, scd-type-1, scd-type-2

Destinations: postgres, snowflake, bigquery, s3, gcs, csv-upload

Categories: source, transform, destination

RULES:
- Return ONLY valid JSON with keys: "nodes" and "edges"
- Each node: { "id": "n1", "type": "pipeline-node", "position": {"x": NUMBER, "y": NUMBER}, "data": { "label": "Human label", "category": "source|transform|destination", "subType": "exact-subtype", "configured": false, "description": "what this step does" } }
- Each edge: { "id": "e1", "source": "n1", "target": "n2" }
- Position nodes left-to-right: sources at x=100, transforms at x=400+, destinations at x=900+. Space nodes 150px apart vertically.
- Give meaningful labels (e.g. "Load Sales Data", "Remove Duplicates", "Filter Active Users")
- Generate 3-8 nodes typically. Keep it practical and realistic.
- Do NOT wrap in markdown. Return raw JSON only.

Example:
{"nodes":[{"id":"n1","type":"pipeline-node","position":{"x":100,"y":200},"data":{"label":"Postgres Orders","category":"source","subType":"postgres","configured":false,"description":"Load orders table"}},{"id":"n2","type":"pipeline-node","position":{"x":400,"y":200},"data":{"label":"Filter Recent","category":"transform","subType":"filter","configured":false,"description":"Keep last 30 days"}},{"id":"n3","type":"pipeline-node","position":{"x":700,"y":200},"data":{"label":"Load to BigQuery","category":"destination","subType":"bigquery","configured":false,"description":"Write to analytics dataset"}}],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design a data pipeline for: ${prompt}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `Groq API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    // Ensure nodes have required fields
    const nodes = (parsed.nodes || []).map((n: Record<string, unknown>, i: number) => ({
      id: n.id || `gen-${i}`,
      type: 'pipeline-node',
      position: (n.position as Record<string, unknown>) || { x: 100 + i * 300, y: 200 },
      data: {
        label: (n.data as Record<string, unknown>)?.label || 'Node',
        category: (n.data as Record<string, unknown>)?.category || 'transform',
        subType: (n.data as Record<string, unknown>)?.subType || 'filter',
        configured: false,
        description: (n.data as Record<string, unknown>)?.description || '',
      },
    }))

    const edges = (parsed.edges || []).map((e: Record<string, unknown>, i: number) => ({
      id: e.id || `gen-edge-${i}`,
      source: e.source,
      target: e.target,
    }))

    return new Response(
      JSON.stringify({ nodes, edges, message: `Generated ${nodes.length}-node pipeline successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
