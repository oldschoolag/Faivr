"use client";

import { Shield, Star, X, Zap, ExternalLink } from "lucide-react";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FundTaskForm } from "@/components/escrow/FundTaskForm";
import { useState } from "react";

export interface AgentData {
  id: number;
  name: string;
  description: string;
  rating: number;
  reviews: number;
  tags: string[];
  validated: boolean;
  verified?: boolean;
  isExample?: boolean;
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
  const [showDetail, setShowDetail] = useState(false);
  const [showFundForm, setShowFundForm] = useState(false);

  return (
    <>
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
        <h3 className="mb-1.5 flex items-center gap-1.5 text-lg font-bold tracking-tight text-white">
          {agent.name}
          {agent.verified && <VerifiedBadge size="sm" />}
          {agent.isExample && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              Example
            </span>
          )}
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
            onClick={() => setShowDetail(true)}
            className="text-xs font-semibold text-white transition-colors hover:text-emerald-400"
            aria-label={`View details for ${agent.name}`}
          >
            View Details →
          </button>
        </div>
      </Card>

      {/* Detail Modal */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0b] p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowDetail(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>

            {!showFundForm && (
              <>
                {/* Agent header */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-xl font-bold text-white shadow-lg`}
                  >
                    {agent.name[0]}
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                      {agent.name}
                      {agent.verified && <VerifiedBadge size="md" />}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                        <span className="font-semibold text-white">{agent.rating}</span>
                        <span className="text-xs text-zinc-500">({agent.reviews} reviews)</span>
                      </div>
                      {agent.validated && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-400 font-medium">Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-zinc-400 mb-6">
                  {agent.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {agent.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                {/* Agent info */}
                <div className="space-y-3 mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Agent ID</span>
                    <span className="font-mono text-white">#{agent.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Network</span>
                    <span className="text-white">Base Sepolia</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Standard</span>
                    <span className="text-white">ERC-8004</span>
                  </div>
                </div>
              </>
            )}

            {/* Actions or Fund Form */}
            {showFundForm ? (
              <FundTaskForm
                agentId={agent.id}
                agentName={agent.name}
                onBack={() => setShowFundForm(false)}
                onClose={() => { setShowDetail(false); setShowFundForm(false); }}
              />
            ) : (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setShowFundForm(true)}>
                  <Zap className="h-4 w-4 mr-1.5" />
                  Hire Agent
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open(`https://basescan.org/address/0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6`, "_blank")}
                  aria-label="View on Basescan"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
