import { cn } from "@/lib/utils";

export function ProductLockup({
  product,
  endorsement = "An Old School product",
  accentClass = "bg-[var(--brand-accent)]",
  compact = false,
}: {
  product: string;
  endorsement?: string;
  accentClass?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2.5")}>
      <div className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-[18px] border border-slate-900/10 bg-white shadow-[0_14px_38px_-28px_rgba(15,23,42,0.45)] sm:h-11 sm:w-11">
        <span className={cn("block h-1.5 w-5 rounded-full", accentClass)} aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-950">OS</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn("text-sm font-semibold uppercase tracking-[0.22em] text-slate-950", compact && "text-[12px]")}>{product}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
          {endorsement}
        </span>
      </div>
    </div>
  );
}
