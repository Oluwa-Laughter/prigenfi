-- One-time revealed access credentials for read-only MCP research.
-- NOT OAuth, not a smart-account session, not a signing capability.
CREATE TABLE IF NOT EXISTS prigenfi_agent_mcp_keys (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  agent_id UUID NOT NULL REFERENCES prigenfi_research_agents(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_count INTEGER NOT NULL DEFAULT 0 CHECK(window_count >= 0)
);
CREATE INDEX IF NOT EXISTS prigenfi_agent_mcp_keys_agent
  ON prigenfi_agent_mcp_keys (agent_id, issued_at DESC);
