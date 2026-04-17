import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProductWindow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.22)]", className)}>
      <div className="flex min-h-[48px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
