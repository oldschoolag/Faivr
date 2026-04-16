import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} {...props} />;
}

function AgentCardSkeleton() {
  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export { Skeleton, AgentCardSkeleton };
