"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { useFundTask } from "@/hooks/useEscrow";

const DEADLINE_OPTIONS = [
  { label: "1 hour", seconds: 3600 },
  { label: "6 hours", seconds: 21600 },
  { label: "24 hours", seconds: 86400 },
  { label: "3 days", seconds: 259200 },
  { label: "7 days", seconds: 604800 },
] as const;

const FEE_PCT = 2.5;

interface FundTaskFormProps {
  agentId: number;
  agentName: string;
  onBack: () => void;
  onClose: () => void;
}

export function FundTaskForm({ agentId, agentName, onBack, onClose }: FundTaskFormProps) {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [deadlineIdx, setDeadlineIdx] = useState(2); // default 24h
  const [description, setDescription] = useState("");

  const { fundTask, isPending, isConfirming, isSuccess, taskId, error, reset } = useFundTask();

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? 0 : n;
  }, [amount]);

  const agentReceives = parsedAmount * (1 - FEE_PCT / 100);
  const protocolFee = parsedAmount * (FEE_PCT / 100);

  const handleSubmit = () => {
    if (!parsedAmount) return;
    fundTask(agentId, amount, DEADLINE_OPTIONS[deadlineIdx].seconds);
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Task Funded!</h3>
        {taskId !== undefined && (
          <p className="text-sm text-zinc-400 mb-1">
            Task ID: <span className="font-mono text-emerald-400">#{taskId.toString()}</span>
          </p>
        )}
        <p className="text-sm text-zinc-500 mb-6">
          {parsedAmount} ETH escrowed for <span className="text-white">{agentName}</span>
        </p>
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  const isWorking = isPending || isConfirming;
  const buttonLabel = !isConnected
    ? "Connect Wallet First"
    : isPending
      ? "Confirm in Wallet…"
      : isConfirming
        ? "Confirming…"
        : "Fund Task";

  return (
    <div>
      {/* Header with back */}
      <button
        onClick={() => { reset(); onBack(); }}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to details
      </button>

      <h3 className="text-lg font-bold text-white mb-1">
        Hire {agentName}
      </h3>
      <p className="text-sm text-zinc-500 mb-6">Fund an escrow task on-chain</p>

      {/* Amount */}
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount</label>
      <div className="relative mb-4">
        <input
          type="number"
          min="0"
          step="0.001"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 pr-14 text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
          ETH
        </span>
      </div>

      {/* Deadline */}
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deadline</label>
      <select
        value={deadlineIdx}
        onChange={(e) => setDeadlineIdx(Number(e.target.value))}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-white outline-none focus:border-emerald-500/50 transition-colors mb-4 appearance-none"
      >
        {DEADLINE_OPTIONS.map((opt, i) => (
          <option key={opt.seconds} value={i} className="bg-[#0a0a0b]">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Description */}
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        Description <span className="text-zinc-600">(optional)</span>
      </label>
      <textarea
        rows={2}
        placeholder="What should the agent do?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 transition-colors mb-4 resize-none"
      />

      {/* Fee breakdown */}
      {parsedAmount > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Agent receives (97.5%)</span>
            <span className="text-white">{agentReceives.toFixed(6)} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Protocol fee (2.5%)</span>
            <span className="text-zinc-400">{protocolFee.toFixed(6)} ETH</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 mb-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="break-all">{(error as Error).message?.slice(0, 200) ?? "Transaction failed"}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        variant="accent"
        disabled={!isConnected || !parsedAmount || isWorking}
        onClick={handleSubmit}
      >
        {isWorking && <Loader2 className="h-4 w-4 animate-spin" />}
        {buttonLabel}
      </Button>
    </div>
  );
}
