-- Fix circular RLS deadlock between pipelines and users tables.
-- A SECURITY DEFINER function bypasses RLS when called from within another policy.

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM users WHERE id = auth.uid();
$$;

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Users can view pipelines in their org" ON pipelines;
DROP POLICY IF EXISTS "Users can only see pipelines in their org" ON pipelines;
DROP POLICY IF EXISTS "Only admins and owners can insert pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can only create pipelines in their org" ON pipelines;
DROP POLICY IF EXISTS "Only admins and owners can update pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can only update pipelines in their org" ON pipelines;
DROP POLICY IF EXISTS "Only admins and owners can delete pipelines" ON pipelines;

-- Clean policies using SECURITY DEFINER function
CREATE POLICY "select_own_org_pipelines"
ON pipelines FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "insert_own_org_pipelines"
ON pipelines FOR INSERT
WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "update_own_org_pipelines"
ON pipelines FOR UPDATE
USING (org_id = get_user_org_id());

CREATE POLICY "delete_own_org_pipelines"
ON pipelines FOR DELETE
USING (org_id = get_user_org_id());

-- Fix users table policy - allow seeing own row and org members
DROP POLICY IF EXISTS "Users can see users in their org" ON users;
DROP POLICY IF EXISTS "Users can view members in their org" ON users;

CREATE POLICY "users_see_own_row"
ON users FOR SELECT
USING (id = auth.uid() OR org_id = get_user_org_id());
