import Link from "next/link";

const LINKS = [
  { label: "GitHub", href: "https://github.com/nicholasoxford/faivr" },
  { label: "Basescan", href: "https://sepolia.basescan.org/address/0x2c954A4E93DdA93b09C679c4DAc6e04758b8f490" },
  { label: "Docs", href: "https://docs.faivr.dev" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} Old School GmbH. All rights reserved.
        </p>
        <div className="flex gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
