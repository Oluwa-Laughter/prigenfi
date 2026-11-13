-- Contract-owner authentication is revalidated from an encrypted, single-use
-- SIWE message signature on each protected request. Prior credentials are
-- deliberately invalidated; never classify pre-migration ERC-1271 as an EOA.
ALTER TABLE prigenfi_auth_sessions
  ADD COLUMN IF NOT EXISTS auth_kind TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE prigenfi_auth_sessions
  ADD COLUMN IF NOT EXISTS authority_proof TEXT;
ALTER TABLE prigenfi_agent_mcp_keys
  ADD COLUMN IF NOT EXISTS auth_kind TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE prigenfi_agent_mcp_keys
  ADD COLUMN IF NOT EXISTS auth_session_hash TEXT;
-- All earlier MCP credentials were issued without revalidated owner lineage.
UPDATE prigenfi_agent_mcp_keys SET revoked_at=now()
  WHERE auth_kind='legacy' AND revoked_at IS NULL;
-- Existing cookies cannot establish whether they belonged to mutable accounts.
DELETE FROM prigenfi_auth_sessions WHERE auth_kind='legacy';
CREATE INDEX IF NOT EXISTS prigenfi_auth_sessions_owner_kind
  ON prigenfi_auth_sessions (owner_address,chain_id,auth_kind,expires_at DESC);
