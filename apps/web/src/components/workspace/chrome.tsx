"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  useConnection,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  LockKeyhole,
  SlidersHorizontal,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/header";

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: Compass },
  { href: "/agents", label: "My agents", icon: Bot },
  { href: "/strategies", label: "Strategies", icon: Zap },
  { href: "/privacy", label: "Confidential trading", icon: LockKeyhole },
];
const accountNav = [
  { href: "/portfolio", label: "Portfolio", icon: ChartNoAxesCombined },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/vault", label: "Capital & permissions", icon: WalletCards },
  { href: "/settings", label: "Safety & settings", icon: SlidersHorizontal },
];
const labels: Record<string, string> = {
  "/dashboard": "Overview",
  "/markets": "Explore markets",
  "/agents": "My agents",
  "/strategies": "Strategies",
  "/privacy": "Confidential trading",
  "/portfolio": "Portfolio",
  "/activity": "Activity",
  "/vault": "Capital & permissions",
  "/settings": "Safety & settings",
};

function NavGroup({
  items,
  pathname,
  onNavigate,
}: {
  items: typeof primaryNav;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav
      className="ws-nav-group"
      aria-label={items === primaryNav ? "Platform" : "Account"}
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={"ws-nav-link " + (pathname === href ? "active" : "")}
          onClick={onNavigate}
        >
          <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function WorkspaceChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { address, chainId, isConnected } = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const short = address ? address.slice(0, 6) + "…" + address.slice(-4) : "";
  return (
    <div className="workspace-layout">
      <aside className={"ws-sidebar " + (menuOpen ? "mobile-open" : "")}>
        <div className="ws-brand">
          <Brand />
          <button
            type="button"
            aria-label="Close navigation"
            className="ws-close"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="ws-sidebar-scroll">
          <p className="ws-group-label">Command center</p>
          <NavGroup
            items={primaryNav}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
          <p className="ws-group-label">Your finances</p>
          <NavGroup
            items={accountNav}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
        <div className="ws-sidebar-bottom">
          <div className="ws-protection-mark">
            <ShieldCheck size={19} />
            <span>Protected by your rules</span>
          </div>
          <p>Sepolia preview · Financial execution remains restricted.</p>
          <Link href="/" className="ws-back-link">
            <ArrowLeft size={15} /> Public website
          </Link>
        </div>
      </aside>
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="ws-mobile-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="ws-main">
        <header className="ws-topbar">
          <div className="ws-topbar-left">
            <button
              type="button"
              className="ws-mobile-toggle"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="ws-topbar-section">Workspace</span>
            <span className="ws-topbar-divider">/</span>
            <strong>{labels[pathname] ?? "PrigenFi"}</strong>
          </div>
          <div className="ws-topbar-actions">
            <span className="ws-network">
              <FlaskConical size={14} />{" "}
              {chainId === 31337
                ? "Local Anvil"
                : chainId === 11155111
                  ? "Sepolia"
                  : "Testnet only"}
            </span>
            {!isConnected ? (
              <button
                type="button"
                className="ws-wallet-button"
                disabled={connect.isPending}
                onClick={() => connect.mutate({ connector: injected() })}
              >
                {connect.isPending ? "Connecting…" : "Connect wallet"}{" "}
                <ArrowUpRight size={15} />
              </button>
            ) : chainId !== 11155111 && chainId !== 31337 ? (
              <button
                type="button"
                className="ws-wallet-button"
                disabled={switchChain.isPending}
                onClick={() => switchChain.mutate({ chainId: 11155111 })}
              >
                Switch to Sepolia
              </button>
            ) : (
              <button
                type="button"
                className="ws-wallet-connected"
                onClick={() => disconnect.mutate()}
                title="Disconnect wallet"
              >
                <span className="ws-connected-dot" />
                {short}
                <span className="ws-disconnect-label"> · Disconnect</span>
              </button>
            )}
          </div>
        </header>
        <div className="ws-content">
          <main id="main">{children}</main>
        </div>
      </div>
    </div>
  );
}
