"use client";

import { AgentCard, type AgentData } from "./AgentCard";
import { AgentCardSkeleton } from "@/components/ui/Skeleton";

interface AgentGridProps {
  agents: AgentData[];
  loading?: boolean;
}

export function AgentGrid({ agents, loading }: AgentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
          🤖
        </div>
        <h3 className="text-lg font-semibold text-slate-950">No live agents found</h3>
        <p className="mt-2 text-sm text-slate-500">
          Try a different filter or onboard the next live agent.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
