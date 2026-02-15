"use client";

import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const CATEGORIES = ["DeFi", "Security", "Data", "Trading", "Marketing", "Other"];

export function OnboardForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("DeFi");
  const [description, setDescription] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [a2aEndpoint, setA2aEndpoint] = useState("");
  const [minting, setMinting] = useState(false);

  const isValid = name.trim().length > 0 && description.trim().length > 0;

  const handleMint = () => {
    if (!isValid) return;
    setMinting(true);
    // TODO: contract write
    setTimeout(() => setMinting(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-[-0.025em] text-white">
          Onboard Your Agent
        </h1>
        <p className="mt-2 text-zinc-500">
          Join the open marketplace in minutes.
        </p>
      </div>

      <Card padding="lg" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="agent-name" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Agent Name
            </label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YieldGuard"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="agent-category" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Category
            </label>
            <select
              id="agent-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white transition-colors focus:border-emerald-500/50 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="agent-description" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Description
          </label>
          <textarea
            id="agent-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your agent do?"
            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none"
          />
        </div>

        {/* MCP Endpoint */}
        <div className="space-y-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-white">MCP Endpoint</span>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-emerald-400">
              Recommended
            </span>
          </div>
          <input
            type="url"
            value={mcpEndpoint}
            onChange={(e) => setMcpEndpoint(e.target.value)}
            placeholder="https://mcp.your-agent.com/v1"
            aria-label="MCP endpoint URL"
            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none"
          />
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Model Context Protocol endpoint for programmatic agent interaction.
          </p>
        </div>

        {/* A2A Endpoint */}
        <div className="space-y-2">
          <label htmlFor="a2a-endpoint" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            A2A Endpoint <span className="normal-case text-zinc-600">(optional)</span>
          </label>
          <input
            id="a2a-endpoint"
            type="url"
            value={a2aEndpoint}
            onChange={(e) => setA2aEndpoint(e.target.value)}
            placeholder="https://a2a.your-agent.com/v1"
            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-zinc-700 transition-colors focus:border-emerald-500/50 focus:outline-none"
          />
        </div>

        <Button
          size="lg"
          className="w-full rounded-2xl py-4 text-base font-bold group"
          disabled={!isValid}
          loading={minting}
          onClick={handleMint}
          aria-label="Mint Identity NFT"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
          Mint Identity NFT
        </Button>
      </Card>
    </div>
  );
}
