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
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { instruction, schema = [], sampleData = [] } = body

    const schemaText = schema.length
      ? `Input schema:\n${schema.map((f: any) => `  - ${f.name} (${f.type})`).join('\n')}`
      : 'Schema not provided.'

    const sampleText = sampleData.length
      ? `Sample rows (first 3):\n${JSON.stringify(sampleData.slice(0, 3), null, 2)}`
      : ''

    const systemPrompt = `You are a data transformation code generator for FlowForge.
Given a user instruction and input schema, generate a JavaScript arrow function that transforms an array of row objects.

RULES:
- Return ONLY a JSON object with two keys: "code" (string) and "explanation" (string)
- "code" must be a valid JS arrow function: (rows) => { ... return transformedRows; }
- "explanation" should be 1-2 sentences describing what the transform does
- Do NOT use any imports or require()
- The function receives rows as an array of plain objects
- Do NOT wrap in markdown code blocks

Example output:
{"code":"(rows) => rows.filter(r => r.age > 18)","explanation":"Filters out rows where age is 18 or below."}`

    const userMessage = `Instruction: ${instruction}\n\n${schemaText}\n\n${sampleText}\n\nGenerate the transformation function.`

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
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      return new Response(JSON.stringify({ error: `Groq API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await groqRes.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return new Response(
      JSON.stringify({ code: parsed.code, explanation: parsed.explanation, previewData: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
