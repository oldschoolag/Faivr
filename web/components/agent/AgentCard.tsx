"use client";

import { Shield, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export interface AgentData {
  id: number;
  name: string;
  description: string;
  rating: number;
  reviews: number;
  tags: string[];
  validated: boolean;
}

const GRADIENT_COLORS = [
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-blue-500 to-cyan-600",
  "from-rose-500 to-pink-600",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

export function AgentCard({ agent }: { agent: AgentData }) {
  const gradient = getGradient(agent.name);

  return (
    <Card hover className="group relative flex flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-bold text-white shadow-lg`}
          aria-hidden="true"
        >
          {agent.name[0]}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" aria-hidden="true" />
            <span className="font-bold text-white">{agent.rating}</span>
            <span className="text-[10px] text-zinc-500">({agent.reviews})</span>
          </div>
          {agent.validated && (
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              <span className="text-[10px] text-zinc-500">Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <h3 className="mb-1.5 text-lg font-bold tracking-tight text-white">
        {agent.name}
      </h3>
      <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
        {agent.description}
      </p>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {agent.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <button
          className="text-xs font-semibold text-white transition-colors hover:text-emerald-400"
          aria-label={`View details for ${agent.name}`}
        >
          View Details →
        </button>
      </div>
    </Card>
  );
}
