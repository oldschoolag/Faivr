"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, CheckCircle, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";

const CATEGORIES = ["DeFi", "Security", "Data", "Trading", "Marketing", "Other"];

export function OnboardForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("DeFi");
  const [description, setDescription] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [a2aEndpoint, setA2aEndpoint] = useState("");
  const [agentId, setAgentId] = useState<number | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const isValid = name.trim().length > 0 && description.trim().length > 0;
  const minting = isPending || isConfirming;

  // Parse agent ID from Registered event logs
  useEffect(() => {
    if (isSuccess && receipt?.logs) {
      for (const log of receipt.logs) {
        if (log.topics[0] === "0x17d0c8d1e73832c5e10eee72c3cf7f4e3591d29590a498a370a85e377f71790e") {
          // Registered event — agentId is topics[1]
          const id = parseInt(log.topics[1] ?? "0", 16);
          if (id > 0) setAgentId(id);
          break;
        }
      }
    }
  }, [isSuccess, receipt]);

  const handleMint = () => {
    if (!isValid || !isConnected) return;

    const agentURI = JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      category,
      mcpEndpoint: mcpEndpoint.trim() || undefined,
      a2aEndpoint: a2aEndpoint.trim() || undefined,
    });

    writeContract({
      address: CONTRACTS.identity,
      abi: IDENTITY_ABI,
      functionName: "register",
      args: [agentURI],
    });
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card padding="lg" className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">🎉 Agent Registered!</h2>
          <p className="text-zinc-400">
            Your agent <span className="font-semibold text-white">{name}</span> has been minted on Base.
            {agentId && (
              <span className="block mt-1 text-emerald-400 font-mono">Agent ID: #{agentId}</span>
            )}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => window.open(`https://basescan.org/tx/${txHash}`, "_blank")}
            >
              View on Basescan
            </Button>
            <Button onClick={() => { reset(); setAgentId(null); setName(""); setDescription(""); setMcpEndpoint(""); setA2aEndpoint(""); }}>
              Register Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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

      {!isConnected && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Wallet className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            Connect your wallet to mint an Identity NFT for your agent.
          </p>
        </div>
      )}

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

        {writeError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-sm text-red-400">
              {writeError.message.includes("User rejected") ? "Transaction rejected." : "Transaction failed. Please try again."}
            </p>
          </div>
        )}

        {isConfirming && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <p className="text-sm text-emerald-400">Confirming transaction...</p>
          </div>
        )}

        <Button
          size="lg"
          className="w-full rounded-2xl py-4 text-base font-bold group"
          disabled={!isValid || !isConnected}
          loading={minting}
          onClick={handleMint}
          aria-label="Mint Identity NFT"
        >
          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
          {!isConnected ? "Connect Wallet to Mint" : "Mint Identity NFT"}
        </Button>
      </Card>
    </div>
  );
}
