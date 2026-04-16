"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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
  const [deadlineIdx, setDeadlineIdx] = useState(2);
  const [description, setDescription] = useState("");

  const { fundTask, isPending, isConfirming, isSuccess, taskId, error, reset } = useFundTask();

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isNaN(n) || n <= 0 ? 0 : n;
  }, [amount]);

  const agentReceives = parsedAmount * (1 - FEE_PCT / 100);
  const protocolFee = parsedAmount * (FEE_PCT / 100);

  const handleSubmit = () => {
    if (!parsedAmount) return;
    fundTask(agentId, amount, DEADLINE_OPTIONS[deadlineIdx].seconds);
  };

  if (isSuccess) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-950">Task funded</h3>
        {taskId !== undefined && (
          <p className="mb-1 text-sm text-slate-600">
            Task ID: <span className="font-mono font-semibold text-emerald-700">#{taskId.toString()}</span>
          </p>
        )}
        <p className="mb-6 text-sm text-slate-500">
          {parsedAmount} ETH escrowed for <span className="text-slate-950">{agentName}</span>
        </p>
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  const isWorking = isPending || isConfirming;
  const buttonLabel = !isConnected
    ? "Connect wallet first"
    : isPending
      ? "Confirm in wallet…"
      : isConfirming
        ? "Confirming…"
        : "Fund task";

  return (
    <div>
      <button
        onClick={() => {
          reset();
          onBack();
        }}
        className="mb-5 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to details
      </button>

      <h3 className="mb-1 text-lg font-bold text-slate-950">Hire {agentName}</h3>
      <p className="mb-6 text-sm text-slate-500">Fund an escrow task on Base.</p>

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Amount</label>
      <div className="relative mb-4">
        <input
          type="number"
          min="0"
          step="0.001"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-300 focus:bg-white"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
          ETH
        </span>
      </div>

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Deadline</label>
      <select
        value={deadlineIdx}
        onChange={(e) => setDeadlineIdx(Number(e.target.value))}
        className="mb-4 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-sky-300 focus:bg-white"
      >
        {DEADLINE_OPTIONS.map((opt, i) => (
          <option key={opt.seconds} value={i}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Description <span className="normal-case text-slate-400">(optional)</span>
      </label>
      <textarea
        rows={2}
        placeholder="What should the agent do?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-300 focus:bg-white"
      />

      {parsedAmount > 0 && (
        <div className="mb-5 space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Agent receives (97.5%)</span>
            <span className="text-slate-950">{agentReceives.toFixed(6)} ETH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Protocol fee (2.5%)</span>
            <span className="text-slate-600">{protocolFee.toFixed(6)} ETH</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-all">{(error as Error).message?.slice(0, 200) ?? "Transaction failed"}</span>
        </div>
      )}

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
