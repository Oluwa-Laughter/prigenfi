# Development

Prerequisites: Node 22+ (pinned `.node-version`), pnpm 10.34.6, Foundry 1.8.1. Docker is not required for this slice. Current package versions are exact in manifests and `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm contracts:build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:contracts
pnpm build
```

For integration, use separate terminals:

```sh
anvil --silent
```

```sh
pnpm local:deploy
LOCAL_INTEGRATION=1 pnpm test
pnpm dev
```

Open `http://localhost:3000`. Configure an injected test wallet on local chain 31337 or Sepolia. The local deployment output contains only public addresses, saved in ignored `.local/deployment.json`. Load the vault/token/agent/recipient into the app. Owner controls require the connected owner; direct agent transfer requires the connected agent. Do not send real funds or load production signing material.

Browser tests use an injected EIP-1193 transport forwarding transactions to actual unlocked Anvil accounts; they contain no keys. Start from a fresh local deployment. They are not hardware-wallet or real-wallet-extension tests.

```sh
pnpm exec playwright install chromium
LOCAL_INTEGRATION=1 pnpm test:browser
```

The test config starts the built production app unless a local server already exists. Screenshots land in `docs/evidence/`. A default `pnpm test` skips three local integration cases unless LOCAL_INTEGRATION=1; the CI job enables them.

```sh
pnpm api  # loopback port 3001: /health /ready /v1/assets
pnpm mcp  # stdio; no logs on stdout
pnpm verify:zama  # public Sepolia metadata reads; no writes
```

Copy `.env.example` only when configuration is needed. pnpm/tsx do not automatically load root `.env` for CLI services; export the nonsecret variables in the shell. Next.js reads `apps/web/.env.local`. Never put signing keys or seed phrases in this project. The public Zama testnet relayer is the default; no credentials are bundled.

Static analysis setup:

```sh
python3 -m venv .venv
.venv/bin/pip install slither-analyzer==0.11.6
.venv/bin/solc-select install 0.8.30
python3 scripts/security-scan.py
```

Read `docs/security/REVIEW.md` for actual findings, parser limitations and triage. Rebuild generated artifacts after any Solidity change. `pnpm format` formats prose and TypeScript; `forge fmt --root contracts` handles Solidity. Keep all generated code derived from the pinned compiler.
