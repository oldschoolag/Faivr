import fs from "node:fs";
import path from "node:path";
import { SiteShell } from "@/components/layout/SiteShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

function loadDocument(fileName: string) {
  const filePath = path.join(process.cwd(), "..", "legal", fileName);
  return fs.readFileSync(filePath, "utf8");
}

export function LegalDocumentPage({
  title,
  fileName,
}: {
  title: string;
  fileName: string;
}) {
  const content = loadDocument(fileName);

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-12 sm:py-16">
        <section>
          <Badge variant="info" className="px-4 py-2 text-xs uppercase tracking-[0.22em]">
            Legal
          </Badge>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl">
            {title}
          </h1>
        </section>

        <Card padding="lg">
          <article className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {content}
          </article>
        </Card>
      </div>
    </SiteShell>
  );
}
