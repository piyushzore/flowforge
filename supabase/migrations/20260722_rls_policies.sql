-- RLS on pipelines table
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see pipelines in their org"
ON pipelines FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can only create pipelines in their org"
ON pipelines FOR INSERT
WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can only update pipelines in their org"
ON pipelines FOR UPDATE
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Same for org_members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see org_members in their org"
ON org_members FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Same for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see users in their org"
ON users FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
