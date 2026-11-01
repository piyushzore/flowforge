import type { IncomingMessage, ServerResponse } from 'node:http';
import dns from 'node:dns/promises';
import pg from 'pg';
import mysql from 'mysql2/promise';

interface RequestBody {
  type?: string;
  host?: string;
  port?: string | number;
  user?: string;
  password?: string;
  database?: string;
  table?: string;
  query?: string;
}

/**
 * Validates whether an IP address is a private, loopback, or cloud metadata address.
 */
function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === 'localhost') return true;

  // IPv4 link-local and cloud metadata (169.254.0.0/16)
  if (ip.startsWith('169.254.')) return true;

  // 10.0.0.0/8
  if (ip.startsWith('10.')) return true;

  // 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return false;
}

/**
 * Checks for SSRF by resolving DNS and ensuring resolved IP is not private or blocked.
 */
export async function isBlockedHost(host: string): Promise<boolean> {
  const normalized = (host || '').trim().toLowerCase();
  if (!normalized) return true;
  if (isPrivateIp(normalized)) return true;

  try {
    const lookup = await dns.lookup(normalized);
    if (isPrivateIp(lookup.address)) return true;
  } catch {
    // If hostname cannot be resolved, block connection
    return true;
  }

  return false;
}

/**
 * Ensures a query is strictly read-only (SELECT) and contains no mutation commands or statement chaining.
 */
export function isReadOnlySelectQuery(sql: string): { valid: boolean; reason?: string } {
  const clean = (sql || '').trim();
  if (!clean) return { valid: false, reason: 'Empty query.' };

  // Forbid multi-statements (semicolons that are not inside quotes)
  if (/;(?!\s*$)/.test(clean)) {
    return { valid: false, reason: 'Multi-statement SQL queries are forbidden.' };
  }

  // Must begin with SELECT or WITH
  if (!/^(SELECT|WITH)\s+/i.test(clean)) {
    return { valid: false, reason: 'Only SELECT and read-only WITH queries are allowed.' };
  }

  // Dangerous keywords check
  const forbiddenKeywords = [
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bMERGE\b/i,
    /\bCOPY\b/i,
    /\bPG_SLEEP\b/i,
    /\bSLEEP\s*\(/i
  ];

  for (const pattern of forbiddenKeywords) {
    if (pattern.test(clean)) {
      return { valid: false, reason: `Forbidden mutation keyword detected: ${pattern.source}` };
    }
  }

  return { valid: true };
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // CORS configuration
  const origin = req.headers.origin || 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    let body: RequestBody = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(chunks).toString('utf-8');
      body = rawText ? JSON.parse(rawText) : {};
    }

    const { type, host, port, user, password, database, table, query: customQuery } = body;

    if (!type || !host || !database || !user) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing required connection parameters (type, host, database, user).' }));
      return;
    }

    // SSRF Check
    const blocked = await isBlockedHost(host);
    if (blocked) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'SSRF_BLOCKED: Connection to private or local network addresses is forbidden.'
      }));
      return;
    }

    // Determine query
    let sql = customQuery;
    if (!sql && table) {
      const sanitizedTable = table.replace(/[^a-zA-Z0-9_.]/g, '');
      sql = `SELECT * FROM ${sanitizedTable} LIMIT 1000;`;
    }

    if (!sql) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Either table or query must be provided.' }));
      return;
    }

    const queryValidation = isReadOnlySelectQuery(sql);
    if (!queryValidation.valid) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `QUERY_REJECTED: ${queryValidation.reason}` }));
      return;
    }

    const parsedPort = Number(port) || (type === 'mysql' ? 3306 : 5432);

    if (type === 'postgres' || type === 'postgresql') {
      const client = new pg.Client({
        host,
        port: parsedPort,
        user,
        password,
        database,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      try {
        const queryResult = await client.query(sql);
        const rows = (queryResult.rows || []).slice(0, 10000);
        const schema = (queryResult.fields || []).map((f: any) => ({
          name: f.name,
          type: 'string'
        }));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          rows,
          schema,
          rowCount: rows.length
        }));
      } finally {
        await client.end().catch(() => {});
      }
      return;
    }

    if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port: parsedPort,
        user,
        password,
        database,
        connectTimeout: 5000
      });

      try {
        const [rows, fields] = await connection.query(sql);
        const safeRows = Array.isArray(rows) ? rows.slice(0, 10000) : [];
        const schema = Array.isArray(fields)
          ? fields.map((f: any) => ({ name: f.name, type: 'string' }))
          : [];

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          rows: safeRows,
          schema,
          rowCount: safeRows.length
        }));
      } finally {
        await connection.end().catch(() => {});
      }
      return;
    }

    // Other connectors
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: `Connector for '${type}' is coming soon. Please use PostgreSQL, MySQL, or File Upload.`
    }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Database connection error' }));
  }
}
