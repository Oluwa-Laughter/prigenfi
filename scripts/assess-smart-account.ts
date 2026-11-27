import { createPublicClient, http } from "viem";
import { anvil, sepolia } from "viem/chains";
import {
  assessErc7579Account,
  erc7579AssessmentRequestSchema,
  erc7579ReaderFromClient,
} from "../packages/shared/src/erc7579-assessment";

/*
 * Read-only operator CLI: assess whether a deployed account self-reports a
 * consistent ERC-7579 interface. It accepts no key, signs nothing and sends no
 * transaction. A positive result is NOT spending authority or a security review.
 *
 *   pnpm assess:account --chain 31337 --account 0x... [--module validator:0x...]
 *
 * Chain 31337 reads LOCAL_RPC_URL (loopback only). Chain 11155111 requires the
 * operator-configured PRIGENFI_ASSESS_SEPOLIA_RPC (HTTPS); its URL is never
 * printed because it may embed provider credentials.
 */

function argValues(flag: string): string[] {
  const values: string[] = [];
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1)
    if (argv[index] === flag && argv[index + 1])
      values.push(argv[index + 1] as string);
  return values;
}

function rpcFor(chainId: number): string {
  if (chainId === 31337) {
    const url = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname))
      throw new Error("LOCAL_RPC_REQUIRED");
    return url;
  }
  const url = process.env.PRIGENFI_ASSESS_SEPOLIA_RPC;
  if (!url) throw new Error("PRIGENFI_ASSESS_SEPOLIA_RPC_REQUIRED");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      throw new Error();
  } catch {
    throw new Error("INVALID_RPC_CONFIGURATION");
  }
  return url;
}

const parsed = erc7579AssessmentRequestSchema.safeParse({
  chainId: Number(argValues("--chain")[0]),
  account: argValues("--account")[0],
  modules: argValues("--module").map((entry) => {
    const [kind, address, additionalContext] = entry.split(":");
    return additionalContext === undefined
      ? { kind, address }
      : { kind, address, additionalContext };
  }),
});
if (!parsed.success) {
  console.error(
    JSON.stringify({
      error: "INVALID_REQUEST",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }),
  );
  process.exit(2);
}

const chain = parsed.data.chainId === 31337 ? anvil : sepolia;
const client = createPublicClient({
  chain,
  transport: http(rpcFor(parsed.data.chainId), {
    retryCount: 1,
    timeout: 15_000,
  }),
});
const result = await assessErc7579Account(
  erc7579ReaderFromClient(client),
  parsed.data,
);
console.log(JSON.stringify(result, null, 2));
process.exit(result.classification === "assessment-failed" ? 1 : 0);
