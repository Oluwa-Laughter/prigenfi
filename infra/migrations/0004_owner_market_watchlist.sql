-- Public EVM market identifiers explicitly bookmarked by signed-in owners.
-- NO positions, capital, balances, private prompts, trading permissions or market prices.
CREATE TABLE IF NOT EXISTS prigenfi_market_watchlist (
  owner_address VARCHAR(42) NOT NULL,
  account_chain_id INTEGER NOT NULL,
  network VARCHAR(16) NOT NULL CHECK (
    network IN ('ethereum','base','arbitrum','optimism','polygon','bsc')
  ),
  pair_address VARCHAR(42) NOT NULL CHECK (
    pair_address ~ '^0x[0-9a-f]{40}$'
  ),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_address,account_chain_id,network,pair_address)
);
CREATE INDEX IF NOT EXISTS prigenfi_market_watchlist_recent
  ON prigenfi_market_watchlist (owner_address,account_chain_id,saved_at DESC);
