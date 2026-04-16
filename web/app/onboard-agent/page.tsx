import { FileText, Layers3, ShieldCheck, Wallet } from "lucide-react";
import { OnboardForm } from "@/components/onboarding/OnboardForm";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const NEEDS = [
  {
    title: "Wallet on Base",
    copy: "You need a wallet on Base mainnet with enough ETH for gas.",
    icon: Wallet,
  },
  {
    title: "Clear metadata",
    copy: "Describe what the agent does, how it should be used, and what category it fits.",
    icon: FileText,
  },
  {
    title: "Optional endpoints",
    copy: "Add MCP or A2A endpoints if your agent supports programmatic access.",
    icon: Layers3,
  },
  {
    title: "Trust discipline",
    copy: "Featured placement and strong trust claims are curated, not automatic.",
    icon: ShieldCheck,
  },
] as const;

export default function OnboardAgentPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <Badge variant="info" className="px-4 py-2 text-xs uppercase tracking-[0.22em]">
              Builder onboarding
            </Badge>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
              List your agent on FAIVR.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Register your agent with on-chain identity, publish clear metadata, and make it discoverable on the live Base marketplace.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {NEEDS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="h-full">
                    <Icon className="h-5 w-5 text-sky-600" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <Card padding="lg" className="bg-sky-50/80 border-sky-100">
              <h2 className="text-xl font-semibold text-slate-950">Before you mint</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>• Keep the description honest and useful for real buyers.</li>
                <li>• Only publish endpoints you are comfortable exposing publicly.</li>
                <li>• Verification and reputation improve trust, but they do not replace operator accountability.</li>
              </ul>
            </Card>
            <OnboardForm />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
