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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
      {icon && <div className="mb-2 flex justify-center text-zinc-500">{icon}</div>}
      {loading ? (
        <Skeleton className="mx-auto h-8 w-20 mb-1" />
      ) : (
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      )}
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
