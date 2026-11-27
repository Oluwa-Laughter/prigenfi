# Local operator runbook

Updated 2026-11-27. What the project owner must do personally, what a local Claude Code CLI session can do for you, and where every configuration value lives. Ready-to-paste CLI prompts are in [CLAUDE_CLI_PROMPTS.md](CLAUDE_CLI_PROMPTS.md).

## 1. Who does what

| Task                                                           | You (owner) | Local Claude CLI | Why                                                                     |
| -------------------------------------------------------------- | :---------: | :--------------: | ----------------------------------------------------------------------- |
| Install toolchain, run all tests, local Anvil + Postgres       |             |        ✅        | No secrets, all local                                                   |
| Create a dedicated Sepolia **test** wallet in a browser wallet |     ✅      |                  | Keys must never reach a repo, terminal, chat or agent                   |
| Fund it with faucet Sepolia ETH                                |     ✅      |                  | Faucets need a human; keep amounts small                                |
| Sign any transaction (Zama shield/transfer, deployments)       |     ✅      |                  | Wallet-mediated signing only; Claude prepares and explains, you approve |
| Provision a managed Postgres for a hosted environment          |     ✅      |     assists      | Credentials belong in your host's secret store                          |
| Generate `PRIGENFI_AUTH_PROOF_KEY`                             |     ✅      |                  | Generate directly into the secret store; never paste it into a chat     |
| Choose Sepolia RPC providers (and their API keys)              |     ✅      |                  | Provider keys are secrets                                               |
| Verify configuration readiness                                 |     ✅      |        ✅        | `pnpm env:check` prints status only, never values                       |
| Apply migrations to a **local** database                       |             |        ✅        | Disposable data                                                         |
| Apply migrations to a **hosted** database                      |     ✅      |     prepares     | Back up first; migration 0005 deliberately logs everyone out            |
| Read-only Sepolia checks (registry, venue quorum, accounts)    |             |        ✅        | Read-only, once RPC env vars exist in your shell                        |
| Deploy the web app (preview/production)                        |     ✅      |     assists      | Outward-facing; you approve the target, domain and env                  |
| Enable hosted MCP endpoints                                    |     ✅      |                  | Off by default; needs operator review, monitoring and abuse protection  |
| Independent security review of `contracts/src/accounts/*`      |     ✅      |                  | Required before any public deployment of the account prototype          |

Never give any agent (including Claude) a private key, seed phrase, database password or proof key. Claude can work with **variable names** and `pnpm env:check` output.

## 2. Where configuration lives

| File / location                      | Read by                                        | Contents                                                                    |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/web/.env.local` (git-ignored)  | Next.js dev/build/start                        | `NEXT_PUBLIC_*` plus server-only `PRIGENFI_*` for local runs                |
| Your shell (`export …`)              | `pnpm db:agents:migrate`, verification scripts | Same `PRIGENFI_*` values; load with `set -a; . apps/web/.env.local; set +a` |
| Hosting provider env/secret settings | Deployed Next.js                               | Server-only `PRIGENFI_*`; never as `NEXT_PUBLIC_*`                          |
| `.env.example` (committed)           | Humans                                         | Template with every variable, no real values                                |

The root repository never auto-loads a dotenv file. Every variable is described in `.env.example`.

### Variable reference

| Variable                                                     | Needed for                                        | Value                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL`                                | Browser Sepolia reads                             | Public HTTPS RPC (default: publicnode)                                     |
| `NEXT_PUBLIC_LOCAL_RPC_URL`                                  | Browser Anvil reads                               | `http://127.0.0.1:8545`                                                    |
| `PRIGENFI_DATABASE_URL`                                      | Sign-in, research profiles, watchlist, hosted MCP | Postgres URL; `?sslmode=require` when hosted                               |
| `PRIGENFI_APP_ORIGIN`                                        | SIWE domain/origin binding                        | Exact origin, no path: `http://localhost:3000` locally, `https://…` hosted |
| `PRIGENFI_AUTH_CHAIN_ID`                                     | SIWE chain                                        | `31337` (local) or `11155111` (Sepolia)                                    |
| `PRIGENFI_AUTH_RPC_URL`                                      | Signature/ERC-1271 verification                   | RPC for that chain                                                         |
| `PRIGENFI_AUTH_PROOF_KEY`                                    | Smart-wallet (ERC-1271) sessions                  | `openssl rand -hex 32` (64 hex chars), per environment                     |
| `PRIGENFI_MCP_HTTP_ENABLED`, `PRIGENFI_PUBLIC_MCP_ENABLED`   | Hosted research MCP                               | Leave unset (off) unless deliberately reviewed                             |
| `PRIGENFI_VENUE_PRIMARY_RPC`, `PRIGENFI_VENUE_SECONDARY_RPC` | `pnpm verify:swap:quorum`                         | Two HTTPS RPCs from **different** operators                                |
| `PRIGENFI_ASSESS_SEPOLIA_RPC`                                | `pnpm assess:account --chain 11155111`            | HTTPS Sepolia RPC                                                          |
| `SEPOLIA_RPC_URL`                                            | `pnpm verify:zama`, `pnpm verify:swap`            | HTTPS Sepolia RPC                                                          |

## 3. Local setup, step by step

Prerequisites: Node 22.22 (`.node-version`), pnpm 10.34.6, Foundry v1.8.1, Docker (for Postgres), a browser wallet extension.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm contracts:build
```

```bash
anvil --silent
```

In a second terminal:

```bash
pnpm local:deploy
```

```bash
docker run --name prigenfi-pg -e POSTGRES_USER=prigenfi -e POSTGRES_PASSWORD=local_only -e POSTGRES_DB=prigenfi -p 5432:5432 -d postgres:16-alpine
```

Create `apps/web/.env.local` (local values only):

```bash
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_LOCAL_RPC_URL=http://127.0.0.1:8545
PRIGENFI_DATABASE_URL=postgres://prigenfi:local_only@127.0.0.1:5432/prigenfi
PRIGENFI_APP_ORIGIN=http://localhost:3000
PRIGENFI_AUTH_CHAIN_ID=31337
PRIGENFI_AUTH_RPC_URL=http://127.0.0.1:8545
PRIGENFI_AUTH_PROOF_KEY=$(openssl rand -hex 32)
EOF
```

```bash
pnpm env:check --file apps/web/.env.local
```

```bash
set -a; . apps/web/.env.local; set +a; pnpm db:agents:migrate
```

```bash
pnpm dev
```

Open `http://localhost:3000`, connect your browser wallet to the Anvil network (chain 31337, RPC `http://127.0.0.1:8545`), and sign in. Only ever import Anvil's publicly documented development accounts into a **separate** browser profile used for local testing.

Full verification (what CI runs):

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:contracts && LOCAL_INTEGRATION=1 pnpm test && pnpm build
```

## 4. Sepolia testnet (owner actions)

1. Create a **new** wallet account used only for PrigenFi testing. Never reuse a wallet that holds real funds.
2. Get a small amount of Sepolia ETH from a faucet.
3. Read-only checks first (no wallet needed): `pnpm verify:zama`, `pnpm verify:swap:source`, `pnpm verify:swap`, `pnpm verify:swap:quorum`.
4. Zama lifecycle (Milestone 3 prerequisite): run `pnpm dev`, switch the wallet to Sepolia, and on the portfolio/privacy pages perform mint test tokens → shield a small amount (exact approval) → authorize decryption → decrypt → confidential transfer to a second test address → unshield. **You** sign each step. Record only transaction hashes, block numbers and outcomes in `docs/BUILD_STATUS.md`, never balances.
5. Do not deploy `contracts/src/accounts/*` to Sepolia until the independent review in `docs/SMART_ACCOUNT_ARCHITECTURE.md` is done.

## 5. Hosted preview (owner decision)

The Next.js app in `apps/web` can be hosted on any Node host (for example Vercel with root directory `apps/web` in this pnpm workspace). Requirements:

- A managed Postgres with TLS; run migrations from your machine against it after a backup.
- Server-only `PRIGENFI_*` values set in the host's environment settings; `PRIGENFI_APP_ORIGIN` equal to the exact deployed origin; `PRIGENFI_AUTH_CHAIN_ID=11155111`.
- Hosted MCP flags left unset unless you have reviewed `docs/REMOTE_AGENT_MCP.md`.
- After deploying, run `pnpm env:check` against the same values and the browser suite against the preview URL.

No mainnet configuration exists or should be added.

## 6. Current blockers only you can clear

1. Provision the dedicated Sepolia test wallet and run the Zama lifecycle (section 4.4).
2. Obtain the verified ConfidentialSwap RFQ interface and supported Sepolia pairs from Zama (see `docs/CONFIDENTIAL_EXECUTION_FOUNDATION.md`).
3. Arrange an independent security review of the account prototype and session executor.
4. Decide hosting, domain and database provider for a hosted testnet preview.
