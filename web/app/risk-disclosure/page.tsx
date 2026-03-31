import { LegalDocument } from "@/components/legal/LegalDocument";
import { readLegalMarkdown } from "@/lib/legal";

export default async function RiskDisclosurePage() {
  const content = await readLegalMarkdown("RISK-DISCLOSURE.md");
  return <LegalDocument title="Risk Disclosure" content={content} />;
}
