"use client";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PrigenFi home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Prigen<span className="brand-accent">Fi</span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="marketing-header">
      <div className="marketing-container marketing-header-inner">
        <Brand />
        <nav
          className={"marketing-nav " + (open ? "is-open" : "")}
          aria-label="Public navigation"
        >
          <Link onClick={() => setOpen(false)} href="/#how-it-works">
            How it works
          </Link>
          <Link onClick={() => setOpen(false)} href="/#markets">
            Explore markets
          </Link>
          <Link onClick={() => setOpen(false)} href="/#privacy">
            Privacy
          </Link>
          <Link onClick={() => setOpen(false)} href="/docs">
            For developers
          </Link>
        </nav>
        <Link className="marketing-launch" href="/dashboard">
          Open platform <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <button
          className="marketing-menu-button"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
