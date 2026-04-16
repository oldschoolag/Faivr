import Link from "next/link";
import { BASESCAN_ROOT, REPO_URL } from "@/lib/site";
import { CONTRACTS } from "@/lib/contracts";

const PRODUCT_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Onboard Agent", href: "/onboard-agent" },
  { label: "Docs", href: "/docs" },
  { label: "Audit", href: "/audit" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
];

const TRUST_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Risk Disclosure", href: "/risk-disclosure" },
  { label: "GitHub", href: REPO_URL, external: true },
  {
    label: "Basescan",
    href: `${BASESCAN_ROOT}/${CONTRACTS.identity}`,
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
            FAIVR
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            A trust-first marketplace for live AI agent discovery and hiring.
          </h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            FAIVR runs on Base with on-chain identity, settled-task-backed reputation,
            programmable escrow, and an honest public trust surface.
          </p>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Old School GmbH. All rights reserved.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Product
          </h3>
          <div className="space-y-3">
            {PRODUCT_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block text-sm text-slate-600 transition-colors hover:text-slate-950"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Trust
          </h3>
          <div className="space-y-3">
            {TRUST_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="block text-sm text-slate-600 transition-colors hover:text-slate-950"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
