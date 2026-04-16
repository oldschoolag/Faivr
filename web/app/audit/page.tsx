import { ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { COMMIT_ROOT, SITE_STATUS } from "@/lib/site";

const LINKS = [
  { label: "Review packet commit", href: `${COMMIT_ROOT}/${SITE_STATUS.reviewPacketCommit}` },
  { label: "GitHub repository", href: "https://github.com/oldschoolag/Faivr" },
  { label: "Base block", href: `https://basescan.org/block/${SITE_STATUS.liveParityBlock}` },
] as const;

export default function AuditPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-12 sm:py-16">
        <section>
          <Badge variant="warning" className="px-4 py-2 text-xs uppercase tracking-[0.22em]">
            Audit status
          </Badge>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            Latest remediation is live. Final external closure is still pending.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            FAIVR has completed the latest remediation wave and the live Base parity execution.
            The remaining formal step is the reviewer’s final closure on the updated public package and live deployment state.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card padding="lg" className="border-emerald-200 bg-emerald-50">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Live parity complete</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The latest remediation and config parity were executed live on Base in block {SITE_STATUS.liveParityBlock}.
            </p>
          </Card>
          <Card padding="lg" className="border-amber-200 bg-amber-50">
            <FileCheck2 className="h-5 w-5 text-amber-700" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">External closure pending</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The honest public line today is remediation live, trust surface improved, final reviewer sign-off still pending.
            </p>
          </Card>
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-slate-950">Current trust boundary</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Buyers should still inspect proof, operator context, and fit. Verification or reputation signals do not guarantee business outcomes.
            </p>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-slate-950">What changed</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>• The live Base deployment now matches the intended remediation package.</li>
              <li>• The missing role and configuration wiring was applied onchain.</li>
              <li>• Supported payment-token configuration was completed live.</li>
              <li>• The remediation packet anchored to public commit history is ready for final reviewer confirmation.</li>
            </ul>
          </Card>
          <Card padding="lg">
            <h2 className="text-2xl font-semibold text-slate-950">What users should understand</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>• FAIVR smart contracts and marketplace logic are not guarantees of agent quality.</li>
              <li>• On-chain verification and reputation are decision aids, not insurance.</li>
              <li>• Blockchain transactions are irreversible and carry normal on-chain risk.</li>
              <li>• Final external audit closure has not been published yet.</li>
            </ul>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">References</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                {link.label}
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
