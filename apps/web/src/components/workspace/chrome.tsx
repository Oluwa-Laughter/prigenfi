"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  useConnection,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Bookmark,
  ChartNoAxesCombined,
  Compass,
  FlaskConical,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LockKeyhole,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { Brand } from "@/components/header";
import { QuickNavigation } from "./quick-navigation";

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: Compass },
  { href: "/agents", label: "My agents", icon: Bot },
  { href: "/strategies", label: "Strategies", icon: Zap },
  { href: "/privacy", label: "Privacy", icon: LockKeyhole },
];
const accountNav = [
  { href: "/saved", label: "Saved markets", icon: Bookmark },
  { href: "/portfolio", label: "Portfolio", icon: ChartNoAxesCombined },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Safety & settings", icon: SlidersHorizontal },
];
const labels: Record<string, string> = {
  "/dashboard": "Overview",
  "/markets": "Explore markets",
  "/saved": "Saved markets",
  "/agents": "My agents",
  "/agents/connect": "Connect an agent",
  "/strategies": "Strategies",
  "/privacy": "Privacy",
  "/portfolio": "Portfolio",
  "/activity": "Activity",
  "/vault": "Developer sandbox",
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
          aria-label={label}
          title={label}
          aria-current={
            pathname === href ||
            (href === "/agents" && pathname.startsWith("/agents/"))
              ? "page"
              : undefined
          }
          className={
            "ws-nav-link " +
            (pathname === href ||
            (href === "/agents" && pathname.startsWith("/agents/"))
              ? "active"
              : "")
          }
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
  const [navCollapsed, setNavCollapsed] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [menuOpen]);
  const { address, chainId, isConnected } = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const short = address ? address.slice(0, 6) + "…" + address.slice(-4) : "";
  return (
    <div className={"workspace-layout " + (navCollapsed ? "ws-collapsed" : "")}>
      <aside
        id="workspace-sidebar"
        className={"ws-sidebar " + (menuOpen ? "mobile-open" : "")}
      >
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
          <p className="ws-group-label">Explore</p>
          <NavGroup
            items={primaryNav}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
          <p className="ws-group-label">Your workspace</p>
          <NavGroup
            items={accountNav}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
        <div className="ws-sidebar-bottom">
          <div className="ws-agent-desk">
            <div className="ws-agent-desk-icon">
              <Bot size={20} aria-hidden="true" />
            </div>
            <p className="ws-agent-desk-eyebrow">YOUR RESEARCH DESK</p>
            <strong>Put an agent to work.</strong>
            <span>
              Explore onchain markets with a research-only connection.
            </span>
            <Link
              href="/agents/connect"
              className="ws-agent-desk-link"
              onClick={() => setMenuOpen(false)}
            >
              Connect an agent <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
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
            <button
              type="button"
              className="ws-desktop-toggle"
              aria-label={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-controls="workspace-sidebar"
              aria-expanded={!navCollapsed}
              onClick={() => setNavCollapsed((collapsed) => !collapsed)}
            >
              {navCollapsed ? (
                <PanelLeftOpen size={21} />
              ) : (
                <PanelLeftClose size={21} />
              )}
            </button>
            <span className="ws-topbar-section">Workspace</span>
            <span className="ws-topbar-divider">/</span>
            <strong>{labels[pathname] ?? "PrigenFi"}</strong>
          </div>
          <div className="ws-topbar-actions">
            <QuickNavigation key={pathname} />
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
