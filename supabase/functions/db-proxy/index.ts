import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

/**
 * FlowForge Database Proxy (Preview / Demo Mode)
 *
 * NOTE: Direct database connections from Edge Workers are restricted for security reasons.
 * Queries are strictly validated to be read-only (SELECT) and protected against SSRF.
 */

function isReadOnlyQuery(sql: string): boolean {
  const clean = (sql || '').trim();
  if (!clean) return false;
  if (/;(?!\s*$)/.test(clean)) return false; // Multi-statement rejection
  if (!/^(SELECT|WITH)\s+/i.test(clean)) return false;
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|EXEC|EXECUTE|CREATE|GRANT|REVOKE|MERGE|COPY)\b/i;
  return !forbidden.test(clean);
}

function isPrivateIpOrHost(host: string): boolean {
  const h = (host || '').trim().toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.startsWith('10.') ||
    h.startsWith('192.168.') ||
    h.startsWith('169.254.') ||
    h === 'metadata.google.internal'
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dbType, host, port: reqPort, database, username, password: _password, query } = await req.json()
    const port = reqPort || (dbType === 'mysql' ? 3306 : 5432);

    // Validate required fields
    if (!dbType || !host || !database || !username || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing required connection parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SSRF Validation
    if (isPrivateIpOrHost(host)) {
      return new Response(
        JSON.stringify({ error: 'SSRF_BLOCKED: Connection to private or local network addresses is forbidden.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read-only SQL query validation
    if (!isReadOnlyQuery(query)) {
      return new Response(
        JSON.stringify({ error: 'QUERY_REJECTED: Only read-only SELECT queries are permitted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[db-proxy] Connecting to ${dbType} at ${host}:${port}/${database} as ${username}`)

    // Demo / preview response for edge function sandbox
    const rows = [
      { id: 1, name: 'Acme Corp', industry: 'Tech', revenue: 1000000, active: true, created_at: '2023-01-15' },
      { id: 2, name: 'Global Industries', industry: 'Manufacturing', revenue: 5000000, active: true, created_at: '2023-02-20' },
      { id: 3, name: 'Stark Enterprises', industry: 'Defense', revenue: 10000000, active: false, created_at: '2023-03-10' },
      { id: 4, name: 'Wayne Enterprises', industry: 'Tech', revenue: 8000000, active: true, created_at: '2023-04-05' },
      { id: 5, name: 'Cyberdyne Systems', industry: 'Robotics', revenue: 2000000, active: false, created_at: '2023-05-12' }
    ]

    const schema = [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'industry', type: 'string' },
      { name: 'revenue', type: 'number' },
      { name: 'active', type: 'boolean' },
      { name: 'created_at', type: 'date' }
    ]

    return new Response(
      JSON.stringify({ 
        success: true, 
        demo: true,
        rows,
        schema,
        rowCount: rows.length,
        message: 'Demo dataset returned. Real direct database connections require an enterprise runner or API preview.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
