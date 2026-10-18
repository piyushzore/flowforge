-- Migration: 20261019_credentials_and_runs.sql
-- Description: Creates tables for encrypted connector credentials, persistent pipeline runs, and execution logs

-- 1. Connector Credentials Table
CREATE TABLE IF NOT EXISTS connector_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  health TEXT NOT NULL DEFAULT 'healthy',
  last_tested TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE connector_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connector credentials in their org"
ON connector_credentials FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create connector credentials in their org"
ON connector_credentials FOR INSERT
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update connector credentials in their org"
ON connector_credentials FOR UPDATE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete connector credentials in their org"
ON connector_credentials FOR DELETE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));


-- 2. Pipeline Runs Table
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  pipeline_name TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'running' | 'success' | 'failed' | 'partial' | 'cancelled'
  trigger TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'schedule' | 'webhook' | 'dependency'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  rows_in INTEGER DEFAULT 0,
  rows_out INTEGER DEFAULT 0,
  error TEXT,
  node_results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline runs in their org"
ON pipeline_runs FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert pipeline runs in their org"
ON pipeline_runs FOR INSERT
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update pipeline runs in their org"
ON pipeline_runs FOR UPDATE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));


-- 3. Run Logs Table for real-time telemetry streaming
CREATE TABLE IF NOT EXISTS run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  node_id TEXT,
  node_name TEXT,
  level TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warn' | 'error' | 'debug'
  message TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view run logs in their org"
ON run_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipeline_runs
    WHERE pipeline_runs.id = run_logs.run_id
      AND pipeline_runs.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert run logs in their org"
ON run_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pipeline_runs
    WHERE pipeline_runs.id = run_logs.run_id
      AND pipeline_runs.org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  )
);

-- 4. Pipeline Schedules Table
CREATE TABLE IF NOT EXISTS pipeline_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  interval INTEGER,
  time TEXT,
  days_of_week JSONB,
  cron_expression TEXT,
  timezone TEXT DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage schedules in their org"
ON pipeline_schedules FOR ALL
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
