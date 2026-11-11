"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Bookmark,
  Compass,
  LayoutDashboard,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

const destinations = [
  {
    label: "Overview",
    description: "Your saved research and latest markets",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Markets & pool explorer",
    description: "Search real public EVM pools",
    href: "/markets",
    icon: Compass,
  },
  {
    label: "My agents",
    description: "Sign in and manage research profiles",
    href: "/agents",
    icon: Bot,
  },
  {
    label: "Strategies",
    description: "Choose an investment research direction",
    href: "/strategies",
    icon: Zap,
  },
  {
    label: "Privacy & confidentiality",
    description: "Understand what stays private",
    href: "/privacy",
    icon: LockKeyhole,
  },
  {
    label: "Portfolio & private assets",
    description: "Use supported wallet-level Zama tools",
    href: "/portfolio",
    icon: WalletCards,
  },
  {
    label: "Activity & audit trail",
    description: "Inspect actual public vault events",
    href: "/activity",
    icon: Activity,
  },
  {
    label: "Safety & settings",
    description: "Review permissions and execution limits",
    href: "/settings",
    icon: ShieldCheck,
  },
  {
    label: "Connect an agent",
    description: "Configure read-only research tools",
    href: "/agents/connect",
    icon: SlidersHorizontal,
  },
] as const;

/** Native dialog supplies focus containment, escape and focus restoration. */
export function QuickNavigation() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matched = destinations.filter((item) =>
    `${item.label} ${item.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
      search.current?.focus();
    }
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  function close() {
    setOpen(false);
    setQuery("");
  }
  return (
    <>
      <button
        className="ws-jump-trigger"
        type="button"
        aria-label="Jump to a page"
        aria-controls="ws-quick-navigation"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        <Search size={16} aria-hidden="true" />
        <span>Jump to</span>
        <kbd>⌘ K</kbd>
      </button>
      <dialog
        id="ws-quick-navigation"
        className="ws-quick-dialog"
        ref={dialog}
        aria-label="Jump to a workspace page"
        onClose={close}
        onCancel={close}
      >
        <div className="ws-quick-panel">
          <div className="ws-quick-search-row">
            <Search size={20} aria-hidden="true" />
            <input
              ref={search}
              aria-label="Search workspace pages"
              placeholder="Where would you like to go?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  dialog.current
                    ?.querySelector<HTMLAnchorElement>(".ws-quick-result")
                    ?.focus();
                }
                if (event.key === "Enter" && matched.length) {
                  event.preventDefault();
                  router.push(matched[0].href);
                  close();
                }
              }}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close quick navigation"
            >
              <X size={19} />
            </button>
          </div>
          <nav aria-label="Workspace destinations" className="ws-quick-results">
            {matched.length ? (
              matched.map(({ href, label, description, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  className="ws-quick-result"
                  onClick={close}
                >
                  <span className="ws-quick-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))
            ) : (
              <p className="ws-quick-empty">
                No pages match “{query}”. Try “Markets”, “Agents”, or “Privacy”.
              </p>
            )}
          </nav>
          <div className="ws-quick-hint">
            <Bookmark size={15} /> Save a public pair from its market-detail
            page to see it on your dashboard.
          </div>
        </div>
      </dialog>
    </>
  );
}
