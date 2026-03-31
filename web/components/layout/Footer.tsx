import Link from "next/link";

const LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Risk", href: "/risk-disclosure" },
  { label: "GitHub", href: "https://github.com/oldschoolag/Faivr", external: true },
  { label: "Basescan", href: "https://basescan.org/address/0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6", external: true },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Old School GmbH. All rights reserved.</p>
        <div className="flex flex-wrap justify-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
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
