-- Private, owner-scoped research agent profiles. No credentials, seed phrases,
-- encrypted balances, strategy instructions, quotes or trading privileges.
CREATE TABLE IF NOT EXISTS prigenfi_auth_challenges (
  nonce_hash TEXT PRIMARY KEY CHECK (length(nonce_hash) = 64),
  owner_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  message_hash TEXT NOT NULL CHECK (length(message_hash) = 64),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE prigenfi_auth_challenges ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS prigenfi_auth_challenges_owner_time
  ON prigenfi_auth_challenges (owner_address, created_at DESC);
CREATE TABLE IF NOT EXISTS prigenfi_auth_sessions (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  owner_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS prigenfi_auth_sessions_owner
  ON prigenfi_auth_sessions (owner_address, expires_at DESC);
CREATE TABLE IF NOT EXISTS prigenfi_research_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  label VARCHAR(80) NOT NULL,
  host VARCHAR(16) NOT NULL CHECK (host IN ('codex', 'claude', 'other')),
  allowed_networks TEXT[] NOT NULL CHECK (cardinality(allowed_networks) BETWEEN 1 AND 6),
  allowed_markets TEXT[] NOT NULL CHECK (cardinality(allowed_markets) BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS prigenfi_research_agents_owner
  ON prigenfi_research_agents (owner_address, chain_id, created_at DESC);
