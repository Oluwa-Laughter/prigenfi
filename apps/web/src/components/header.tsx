"use client";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PrigenFi home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      PrigenFi
    </Link>
  );
}
export function Header() {
  const [light, setLight] = useState(false);
  return (
    <header className="wrap nav">
      <Brand />
      <nav className="nav-links" aria-label="Main navigation">
        <Link className="optional" href="/#how-it-works">
          How it works
        </Link>
        <Link href="/docs">Developers</Link>
        <Link href="/dashboard">Open app</Link>
      </nav>
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
    </header>
  );
}
