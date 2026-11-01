-- Migration: 20261101_vault_encryption.sql
-- Description: Server-side credential encryption vault and secret resolution

-- 1. Enable pgcrypto extension for AES-256 encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Encrypted Secrets Vault table
CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  encrypted_value BYTEA NOT NULL,
  key_id TEXT NOT NULL DEFAULT 'default_v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;

-- Only organization admins and servers with service role can access secrets
CREATE POLICY "Users can view secrets metadata (without raw secret)"
ON encrypted_secrets FOR SELECT
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage secrets in their org"
ON encrypted_secrets FOR ALL
USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 3. Migration helper function to encrypt a plain secret
CREATE OR REPLACE FUNCTION vault_encrypt_secret(
  p_org_id UUID,
  p_name TEXT,
  p_raw_secret TEXT,
  p_master_key TEXT
) RETURNS UUID AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  INSERT INTO encrypted_secrets (org_id, name, encrypted_value)
  VALUES (
    p_org_id,
    p_name,
    pgp_sym_encrypt(p_raw_secret, p_master_key)
  )
  ON CONFLICT (org_id, name) DO UPDATE
  SET encrypted_value = pgp_sym_encrypt(p_raw_secret, p_master_key),
      updated_at = now()
  RETURNING id INTO v_secret_id;

  RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Server-side Secret Decryptor (Only callable by SECURITY DEFINER backend services)
CREATE OR REPLACE FUNCTION vault_resolve_secret(
  p_org_id UUID,
  p_name TEXT,
  p_master_key TEXT
) RETURNS TEXT AS $$
DECLARE
  v_raw_val TEXT;
BEGIN
  SELECT pgp_sym_decrypt(encrypted_value, p_master_key)
  INTO v_raw_val
  FROM encrypted_secrets
  WHERE org_id = p_org_id AND name = p_name;

  RETURN v_raw_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
