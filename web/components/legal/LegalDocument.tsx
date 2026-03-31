import { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function renderBlock(block: string, index: number): ReactNode {
  const trimmed = block.trim();
  if (!trimmed || trimmed === "---") return null;

  if (trimmed.startsWith("# ")) {
    return (
      <h1 key={index} className="text-4xl font-bold tracking-tight text-white">
        {trimmed.slice(2)}
      </h1>
    );
  }

  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={index} className="pt-4 text-2xl font-bold text-white">
        {trimmed.slice(3)}
      </h2>
    );
  }

  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={index} className="pt-2 text-lg font-semibold text-white">
        {trimmed.slice(4)}
      </h3>
    );
  }

  const lines = trimmed.split("\n");

  if (lines.every((line) => line.startsWith("- "))) {
    return (
      <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300">
        {lines.map((line, lineIndex) => (
          <li key={lineIndex}>{line.slice(2)}</li>
        ))}
      </ul>
    );
  }

  if (trimmed.startsWith("|")) {
    return (
      <pre
        key={index}
        className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-zinc-300"
      >
        {trimmed}
      </pre>
    );
  }

  return (
    <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
      {trimmed}
    </p>
  );
}

export function LegalDocument({ title, content }: { title: string; content: string }) {
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
          <div className="mb-8 border-b border-white/10 pb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Legal</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
          </div>
          <article className="space-y-5">{blocks.map((block, index) => renderBlock(block, index))}</article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
