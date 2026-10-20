import { corsHeaders } from '../_shared/cors.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface TransformRequest {
  instruction: string
  schema?: { name: string; type: string }[]
  sampleData?: Record<string, unknown>[]
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

    const body: TransformRequest = await req.json()
    const { instruction, schema = [], sampleData = [] } = body

    const schemaText = schema.length
      ? `Input schema:\n${schema.map(f => `  - ${f.name} (${f.type})`).join('\n')}`
      : 'Schema not provided.'

    const sampleText = sampleData.length
      ? `Sample rows (first 3):\n${JSON.stringify(sampleData.slice(0, 3), null, 2)}`
      : ''

    const systemPrompt = `You are a data transformation code generator for FlowForge, a data engineering platform.
Given a user instruction and input schema, generate a JavaScript arrow function that transforms an array of row objects.

RULES:
- Return ONLY a JSON object with two keys: "code" (string) and "explanation" (string)
- "code" must be a valid JS arrow function: (rows) => { ... return transformedRows; }
- "explanation" should be 1-2 sentences describing what the transform does
- Do NOT use any imports or require()
- The function receives rows as an array of plain objects
- Keep the function concise and correct
- Do NOT wrap in markdown code blocks

Example output:
{"code":"(rows) => rows.filter(r => r.age > 18)","explanation":"Filters out rows where age is 18 or below."}`

    const userMessage = `Instruction: ${instruction}

${schemaText}

${sampleText}

Generate the transformation function.`

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
        temperature: 0.2,
        max_tokens: 600,
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

    // Apply function to sample data to get preview
    let previewData: unknown[] = []
    if (sampleData.length && parsed.code) {
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('rows', `return (${parsed.code})(rows)`)
        previewData = fn(sampleData.slice(0, 20))
      } catch (_e) {
        previewData = []
      }
    }

    return new Response(
      JSON.stringify({ code: parsed.code, explanation: parsed.explanation, previewData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
