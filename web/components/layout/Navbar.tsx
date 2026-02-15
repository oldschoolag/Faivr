"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Marketplace", href: "/" },
  { label: "Docs", href: "https://docs.faivr.dev", external: true },
  { label: "GitHub", href: "https://github.com/nicholasoxford/faivr", external: true },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" aria-label="FAIVR home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-black">
            F
          </div>
          <span className="text-xl font-bold tracking-tight">FAIVR</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <ConnectButton />

          {/* Mobile hamburger */}
          <button
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/5 md:hidden transition-all duration-200",
          open ? "max-h-48" : "max-h-0"
        )}
      >
        <div className="space-y-1 px-6 py-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
