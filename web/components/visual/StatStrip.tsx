export function StatStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[22px] border border-slate-200/90 bg-white/90 p-4 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.22)]">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{item.value}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
