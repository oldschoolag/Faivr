import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)}
      {...props}
    />
  );
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
    </div>
  );
}

export { Skeleton, AgentCardSkeleton };
