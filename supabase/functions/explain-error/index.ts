import { corsHeaders } from '../_shared/cors.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ExplainErrorRequest {
  nodeName: string
  nodeType: string
  error: string
  config?: Record<string, unknown>
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

    const body: ExplainErrorRequest = await req.json()
    const { nodeName, nodeType, error, config = {} } = body

    const systemPrompt = `You are a helpful data engineering assistant for FlowForge.
A pipeline node has failed. Explain the error in plain English and provide a concrete fix.

Return ONLY valid JSON with keys:
- "summary": 1-sentence plain-English explanation of what went wrong
- "cause": 2-3 sentences explaining the technical cause
- "fix": numbered list of specific steps to fix it (as an array of strings)
- "severity": "low" | "medium" | "high"`

    const userMessage = `Node: "${nodeName}" (type: ${nodeType})
Error: ${error}
Config: ${JSON.stringify(config, null, 2)}`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 500,
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

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
