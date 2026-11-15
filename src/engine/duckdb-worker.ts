/**
 * DuckDB-WASM worker bridge.
 * Runs in a Web Worker context — no DOM, no network access.
 * Accepts { sql, tables } and returns { rows } or { error }.
 */

import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;

async function initDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return db;
}

export interface DuckDBRequest {
  sql: string;
  tables: { name: string; rows: Record<string, unknown>[] }[];
}

export interface DuckDBResult {
  rows: Record<string, unknown>[];
  error?: string;
}

/** Execute SQL against in-memory tables loaded from rows. */
export async function runDuckDBQuery(req: DuckDBRequest): Promise<DuckDBResult> {
  try {
    const instance = await initDB();
    const conn = await instance.connect();
    try {
      // Register each input table as a view via JSON_ARRAY_ELEMENTS trick
      for (const table of req.tables) {
        if (!table.rows || table.rows.length === 0) {
          // Create empty table — derive schema from first run or just skip
          continue;
        }
        const json = JSON.stringify(table.rows);
        // Use DuckDB's read_json_auto on a string
        await conn.query(
          `CREATE OR REPLACE VIEW ${JSON.stringify(table.name)} AS SELECT * FROM read_json_auto('${json.replace(/'/g, "''")}');`
        );
      }

      const result = await conn.query(req.sql);
      const schema = result.schema.fields;
      const batches = result.batches;
      const rows: Record<string, unknown>[] = [];

      for (const batch of batches) {
        const numRows = batch.numRows;
        for (let i = 0; i < numRows; i++) {
          const row: Record<string, unknown> = {};
          for (const field of schema) {
            const col = batch.getChildAt(schema.indexOf(field));
            row[field.name] = col?.get(i) ?? null;
          }
          rows.push(row);
        }
      }

      return { rows };
    } finally {
      await conn.close();
    }
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}
