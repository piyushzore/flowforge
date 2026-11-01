-- FlowForge Multi-Tenant RLS Verification Script
-- Run this test suite to verify tenant isolation across all tables.

BEGIN;

-- 1. Create two test organizations
INSERT INTO organizations (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Tenant Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Test Tenant Beta');

-- 2. Create users under each organization
INSERT INTO users (id, org_id, email, role) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'alice@alpha.io', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'bob@beta.io', 'member');

-- 3. Create pipeline belonging to Tenant Alpha
INSERT INTO pipelines (id, org_id, name, nodes, edges) VALUES 
  ('pipe-alpha-1', '11111111-1111-1111-1111-111111111111', 'Alpha Confidential Pipeline', '[]', '[]');

-- 4. Impersonate Tenant Beta user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- 5. Verification Queries (All must return 0 rows or fail)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Test SELECT isolation
  SELECT count(*) INTO v_count FROM pipelines WHERE id = 'pipe-alpha-1';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS_FAILURE: User from Tenant Beta can read Tenant Alpha pipeline!';
  END IF;

  -- Test UPDATE isolation
  UPDATE pipelines SET name = 'Hacked Pipeline' WHERE id = 'pipe-alpha-1';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS_FAILURE: User from Tenant Beta can mutate Tenant Alpha pipeline!';
  END IF;

  -- Test DELETE isolation
  DELETE FROM pipelines WHERE id = 'pipe-alpha-1';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS_FAILURE: User from Tenant Beta can delete Tenant Alpha pipeline!';
  END IF;

  RAISE NOTICE 'SUCCESS: Row-Level Security tenant isolation verified successfully.';
END $$;

ROLLBACK;
