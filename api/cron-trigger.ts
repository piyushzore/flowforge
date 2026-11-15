/**
 * Vercel Cron Job — Scheduled Pipeline Runner
 * Runs every 5 minutes (see vercel.json crons config).
 *
 * Reads pipeline_schedules where next_run_at <= NOW() and enabled = true,
 * executes each pipeline server-side using the shared engine,
 * updates last_run_at / next_run_at, and writes results to pipeline_runs.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { executePipeline } from '../packages/shared/engine/src/executor';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Parse a cron expression and compute the next run timestamp after `from`. */
function nextCronRun(cronExpr: string, from: Date): Date {
  // Simple: advance by the smallest interval in the cron expression.
  // For production use a proper library (e.g. croner / cron-parser).
  // This handles common cases: */N * * * *, H H * * *, etc.
  const parts = cronExpr.trim().split(/\s+/);
  const minutePart = parts[0] ?? '*';
  if (minutePart.startsWith('*/')) {
    const interval = parseInt(minutePart.slice(2), 10) || 5;
    const next = new Date(from);
    next.setMinutes(next.getMinutes() + interval, 0, 0);
    return next;
  }
  // Hourly / daily fallback: add 1 hour
  const next = new Date(from);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel adds the CRON_SECRET as an Authorization header when invoking crons
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date().toISOString();

  // Find schedules due to run
  const { data: schedules, error: schedErr } = await supabase
    .from('pipeline_schedules')
    .select('id, pipeline_id, cron_expression, org_id')
    .eq('enabled', true)
    .lte('next_run_at', now);

  if (schedErr) {
    console.error('[cron-trigger] fetch schedules error:', schedErr.message);
    return res.status(500).json({ error: schedErr.message });
  }

  if (!schedules || schedules.length === 0) {
    return res.status(200).json({ triggered: 0 });
  }

  const results: Array<{ scheduleId: string; pipelineId: string; status: string }> = [];

  for (const schedule of schedules) {
    const { pipeline_id: pipelineId, org_id: orgId, cron_expression: cronExpr } = schedule;

    try {
      // Load the pipeline definition
      const { data: pipeline, error: pipeErr } = await supabase
        .from('pipelines')
        .select('definition')
        .eq('id', pipelineId)
        .eq('org_id', orgId)
        .single();

      if (pipeErr || !pipeline) {
        throw new Error(`Pipeline not found: ${pipeErr?.message}`);
      }

      const definition = pipeline.definition as { nodes: unknown[]; edges: unknown[] };
      const startedAt = new Date().toISOString();

      // Execute the pipeline
      const execResult = await executePipeline(
        definition.nodes as Parameters<typeof executePipeline>[0]['nodes'],
        definition.edges as Parameters<typeof executePipeline>[0]['edges'],
        {}
      );

      const finishedAt = new Date().toISOString();
      const status = execResult.errors && execResult.errors.length > 0 ? 'failed' : 'success';

      // Write run record
      await supabase.from('pipeline_runs').insert({
        pipeline_id: pipelineId,
        org_id: orgId,
        status,
        trigger: 'cron',
        started_at: startedAt,
        finished_at: finishedAt,
        node_results: execResult.nodeResults ?? {},
        errors: execResult.errors ?? [],
      });

      // Update schedule timestamps
      const nextRun = nextCronRun(cronExpr, new Date());
      await supabase
        .from('pipeline_schedules')
        .update({ last_run_at: now, next_run_at: nextRun.toISOString() })
        .eq('id', schedule.id);

      results.push({ scheduleId: schedule.id, pipelineId, status });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron-trigger] pipeline ${pipelineId} failed:`, message);

      // Write failed run record
      await supabase.from('pipeline_runs').insert({
        pipeline_id: pipelineId,
        org_id: orgId,
        status: 'failed',
        trigger: 'cron',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        errors: [message],
      });

      results.push({ scheduleId: schedule.id, pipelineId, status: 'error' });
    }
  }

  return res.status(200).json({ triggered: results.length, results });
}
