import { LegalDocument } from "@/components/legal/LegalDocument";
import { readLegalMarkdown } from "@/lib/legal";

export default async function PrivacyPage() {
  const content = await readLegalMarkdown("PRIVACY.md");
  return <LegalDocument title="Privacy Policy" content={content} />;
}
