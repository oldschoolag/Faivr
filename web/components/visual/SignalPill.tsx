import { cn } from "@/lib/utils";

export function SignalPill({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "green" | "gold";
}) {
  const toneClass = {
    blue: "bg-[var(--faivr-accent)]",
    green: "bg-emerald-600",
    gold: "bg-amber-500",
  }[tone];

  return (
    <div className="flex min-h-[48px] items-center gap-3 rounded-[18px] border border-slate-200/90 bg-slate-50/90 px-4 text-sm font-medium text-slate-700">
      <span className={cn("h-2.5 w-2.5 rounded-full", toneClass)} aria-hidden="true" />
      {label}
    </div>
  );
}
