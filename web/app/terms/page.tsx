import { LegalDocument } from "@/components/legal/LegalDocument";
import { readLegalMarkdown } from "@/lib/legal";

export default async function TermsPage() {
  const content = await readLegalMarkdown("TERMS.md");
  return <LegalDocument title="Terms & Conditions" content={content} />;
}
