# FlowForge Security Architecture & Multi-Tenant Isolation

FlowForge enforces defense-in-depth across database access, external network connectivity, secret persistence, and tenant data isolation.

---

## 1. Multi-Tenant Row Level Security (RLS) Isolation

All multi-tenant database tables have Row Level Security enabled. Policies ensure that User A belonging to Organization 1 cannot query, insert, mutate, or delete records belonging to Organization 2.

### RLS Policies Checklist & Matrix

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
|---|---|---|---|---|---|
| `pipelines` | ✅ YES | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` |
| `connector_credentials` | ✅ YES | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` |
| `pipeline_runs` | ✅ YES | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | Handled via cascade / Admin |
| `run_logs` | ✅ YES | Parent run in own org | Parent run in own org | N/A (Append-only) | Cascades on run deletion |
| `pipeline_schedules` | ✅ YES | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` |
| `encrypted_secrets` | ✅ YES | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` | `org_id = get_user_org_id()` |
| `org_members` | ✅ YES | `org_id = get_user_org_id()` | Admin only | Admin only | Admin only |

### Tenant Isolation Verification Test (SQL)

Run the verification test script `scripts/verify-rls.sql` against your Supabase or PostgreSQL instance:

```sql
-- 1. Create two separate mock tenants
INSERT INTO organizations (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Acme Tenant'),
  ('22222222-2222-2222-2222-222222222222', 'Globex Tenant');

-- 2. Create users under each tenant
INSERT INTO users (id, org_id, email, role) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'alice@acme.com', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'bob@globex.com', 'admin');

-- 3. Assert User B cannot read User A's pipeline
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- This query must return 0 rows
SELECT * FROM pipelines WHERE org_id = '11111111-1111-1111-1111-111111111111';

-- Attempting cross-tenant delete must affect 0 rows
DELETE FROM pipelines WHERE org_id = '11111111-1111-1111-1111-111111111111';
```

---

## 2. Zero-Trust API Key & Secret Management

1. **No Client API Keys**: `VITE_GROQ_API_KEY` and client `localStorage` storage of secret tokens are removed.
2. **Server-Side Edge Functions**: All AI calls (pipeline generation, autonomous schema repair, and error explanation) execute through Supabase edge functions authenticated via the user's JWT.
3. **Webhook Tokens**: Per-pipeline API tokens for `/api/trigger` are hashed with SHA-256 before storage or comparison. The raw token is displayed only once upon generation.

---

## 3. Server-Side Request Forgery (SSRF) Protection

Database preview connections (`/api/preview-db`) strictly block:
- Loopback addresses (`127.0.0.1`, `::1`, `localhost`)
- AWS / GCP / Azure Cloud Metadata IP (`169.254.169.254`, `metadata.google.internal`)
- RFC 1918 private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- DNS rebinding via proactive address resolution check before socket connection.

---

## 4. Query Injection & CSV Formula Injection Protection

- **Read-Only Query Enforcer**: Previews accept only `SELECT` and `WITH ... SELECT` queries. Semicolon query stacking and DDL/mutation keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC`) are rejected.
- **CSV Formula Injection**: All exported CSV cells starting with formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are sanitized by prepending a single quote (`'`).

---

## 5. HTTP Security Headers (Vercel)

Production deployments enforce strict headers:
- `Content-Security-Policy`: Disallows unauthorized frame ancestors, restricts script and connection endpoints.
- `X-Frame-Options: DENY`: Clickjacking protection.
- `X-Content-Type-Options: nosniff`: MIME-type sniffing mitigation.
- `Referrer-Policy: strict-origin-when-cross-origin`.
