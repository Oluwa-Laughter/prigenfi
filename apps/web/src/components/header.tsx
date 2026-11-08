"use client";
import Link from "next/link";
import { ArrowUpRight, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PrigenFi home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      Prigen<span className="brand-accent">Fi</span>
    </Link>
  );
}
export function Header() {
  const [light, setLight] = useState(false);
  return (
    <header className="site-nav">
      <div className="wrap nav">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#privacy" className="optional">Privacy</Link>
          <Link href="/#agent-mcp" className="optional">Agent MCP</Link>
        </nav>
        <div className="nav-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={light ? "Use dark theme" : "Use light theme"}
            onClick={() => {
              setLight(!light);
              document.documentElement.classList.toggle("light", !light);
            }}
          >
            {light ? <Moon /> : <Sun />}
          </Button>
          <Button asChild className="nav-launch">
            <Link href="/dashboard">Launch app <ArrowUpRight size={15} /></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
