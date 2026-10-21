const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured in Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch (_e) {
      body = {}
    }
    const prompt = body.prompt || 'Extract data, transform it, and load to destination'

    const systemPrompt = `You are a data pipeline designer for FlowForge, a visual data engineering platform.
Given a plain English description of a data pipeline, generate a valid pipeline DAG as JSON.

AVAILABLE NODE TYPES (use subType exactly as listed):
Sources: google-sheets, postgres, mysql, snowflake, bigquery, redshift, s3, gcs, csv-upload, salesforce, hubspot, shopify, stripe, ga4, rest-api, kafka, webhook
Transforms: filter, sort, deduplicate, rename, change-type, add-remove-fields, null-handling, group-by, join, union, pivot, unpivot, window-function, trim-case, regex, split-column, concat, date-parse, lookup, validation, ai-transform, custom-code, quality-check, scd-type-1, scd-type-2
Destinations: postgres, snowflake, bigquery, s3, gcs, csv-upload

RULES:
- Return ONLY valid JSON with keys: "nodes" and "edges"
- Each node: { "id": "n1", "type": "pipeline-node", "position": {"x": NUMBER, "y": NUMBER}, "data": { "label": "Human label", "category": "source" | "transform" | "destination", "subType": "exact-subtype", "configured": false, "description": "what this step does" } }
- Each edge: { "id": "e1", "source": "n1", "target": "n2" }
- Position nodes left-to-right: sources at x=100, transforms at x=400, destinations at x=700. Space nodes 150px apart vertically.
- Give meaningful labels (e.g. "Google Sheets Input", "Filter Active", "Export to CSV")
- Generate 3-6 nodes. Keep it practical and realistic.
- Do NOT wrap in markdown code fences. Return raw JSON only.`

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design a data pipeline for: ${prompt}` },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error('Groq error:', errText)
      return new Response(JSON.stringify({ error: `Groq error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await groqRes.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    const nodes = (parsed.nodes || []).map((n: any, i: number) => ({
      id: n.id || `gen-${Date.now()}-${i}`,
      type: 'pipeline-node',
      position: n.position || { x: 100 + i * 300, y: 200 },
      data: {
        label: n.data?.label || 'Node',
        category: n.data?.category || 'transform',
        subType: n.data?.subType || 'filter',
        configured: false,
        description: n.data?.description || '',
      },
    }))

    const edges = (parsed.edges || []).map((e: any, i: number) => ({
      id: e.id || `gen-edge-${Date.now()}-${i}`,
      source: e.source,
      target: e.target,
    }))

    return new Response(
      JSON.stringify({ nodes, edges, message: `Generated ${nodes.length}-node pipeline successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Catch error:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
