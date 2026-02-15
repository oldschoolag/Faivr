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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] text-3xl">
          🤖
        </div>
        <h3 className="text-lg font-semibold text-white">No agents found</h3>
        <p className="mt-1 text-sm text-zinc-500">Try adjusting your search or filters.</p>
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
