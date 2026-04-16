import { type ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  loading?: boolean;
}

export function StatCard({ label, value, icon, loading }: StatCardProps) {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 text-center shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
      {icon && <div className="mb-2 flex justify-center text-slate-400">{icon}</div>}
      {loading ? (
        <Skeleton className="mx-auto mb-1 h-8 w-20" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      )}
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
