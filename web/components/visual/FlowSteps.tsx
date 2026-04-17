export function FlowSteps({
  steps,
}: {
  steps: Array<{ title: string; copy: string }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {steps.map((step, index) => (
        <article key={step.title} className="rounded-[28px] border border-slate-200/90 bg-white/90 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.22)]">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(91,140,255,0.12)] text-sm font-semibold text-[var(--faivr-accent)]">
            {index + 1}
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{step.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{step.copy}</p>
        </article>
      ))}
    </div>
  );
}
