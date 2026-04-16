"use client";

import { useState } from "react";
import { ExternalLink, Shield, Star, X, Zap } from "lucide-react";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FundTaskForm } from "@/components/escrow/FundTaskForm";

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
  isGenesis?: boolean;
}

const GRADIENT_COLORS = [
  "from-sky-400 to-cyan-500",
  "from-violet-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
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
  const hasVerification = agent.verified || agent.validated;

  return (
    <>
      <Card hover className="group relative flex h-full flex-col p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg font-bold text-white shadow-lg`}
            aria-hidden="true"
          >
            {agent.name[0]}
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold text-slate-950">{agent.rating.toFixed(1)}</span>
              <span>({agent.reviews} settled reviews)</span>
            </div>
            {hasVerification && (
              <div className="flex items-center gap-1 text-xs text-emerald-700">
                <Shield className="h-3 w-3" aria-hidden="true" />
                Verified signal present
              </div>
            )}
          </div>
        </div>

        <h3 className="mb-2 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950">
          {agent.name}
          {agent.verified && <VerifiedBadge size="sm" />}
          {agent.isGenesis && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              Genesis
            </span>
          )}
          {agent.isExample && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              Preview
            </span>
          )}
        </h3>

        <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {agent.description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {agent.tags.length > 0 ? (
              agent.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
            ) : (
              <Badge>Uncategorized</Badge>
            )}
          </div>
          <button
            onClick={() => setShowDetail(true)}
            className="text-xs font-semibold text-sky-700 transition-colors hover:text-sky-900"
            aria-label={`View details for ${agent.name}`}
          >
            View details →
          </button>
        </div>
      </Card>

      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.5)] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDetail(false)}
              className="absolute right-4 top-4 rounded-2xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>

            {!showFundForm && (
              <>
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-xl font-bold text-white shadow-lg`}
                  >
                    {agent.name[0]}
                  </div>
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                      {agent.name}
                      {agent.verified && <VerifiedBadge size="md" />}
                    </h2>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-950">{agent.rating.toFixed(1)}</span>
                        <span>({agent.reviews} settled reviews)</span>
                      </div>
                      {hasVerification && (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <Shield className="h-3.5 w-3.5" />
                          <span className="font-medium">Verification signal</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-slate-600">
                  {agent.description}
                </p>

                <div className="mb-6 flex flex-wrap gap-2">
                  {agent.tags.length > 0 ? (
                    agent.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
                  ) : (
                    <Badge>Uncategorized</Badge>
                  )}
                </div>

                <div className="mb-6 space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Agent ID</span>
                    <span className="font-mono text-slate-950">#{agent.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Network</span>
                    <span className="text-slate-950">Base mainnet</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Standard</span>
                    <span className="text-slate-950">ERC-8004</span>
                  </div>
                </div>
              </>
            )}

            {showFundForm ? (
              <FundTaskForm
                agentId={agent.id}
                agentName={agent.name}
                onBack={() => setShowFundForm(false)}
                onClose={() => {
                  setShowDetail(false);
                  setShowFundForm(false);
                }}
              />
            ) : (
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setShowFundForm(true)}>
                  <Zap className="mr-1.5 h-4 w-4" />
                  Hire Agent
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    window.open(
                      "https://basescan.org/address/0x8D97B74fA9bFa67Db1A8Cf315dA91390612B90F6",
                      "_blank"
                    )
                  }
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
