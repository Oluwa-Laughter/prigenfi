-- Optional, authenticated-operator-enabled public research MCP quota.
-- One database row, atomic across serverless instances; prevents unbounded calls.
-- No wallet, IP address, bearer key or private strategy is stored in this table.
CREATE TABLE IF NOT EXISTS prigenfi_public_mcp_quota (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
