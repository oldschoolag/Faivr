"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { AlertCircle, CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STATUS_LABELS, useReclaimTask, useSettleTask, useUserTasks } from "@/hooks/useEscrow";
import type { TaskInfo } from "@/hooks/useEscrow";

function deadlineCountdown(deadline: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now) return "Expired";
  const diff = Number(deadline - now);
  const hours = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  return `${hours}h ${mins}m left`;
}

function statusColor(status: number): string {
  if (status === 0) return "text-emerald-700";
  if (status === 1) return "text-sky-700";
  return "text-slate-500";
}

function TaskCard({ task }: { task: TaskInfo }) {
  const { settleTask, isPending: settlingPending, isConfirming: settlingConfirming, error: settleError } = useSettleTask();
  const { reclaimTask, isPending: reclaimPending, isConfirming: reclaimConfirming, error: reclaimError } = useReclaimTask();
  const [actionError] = useState<string | null>(null);

  const isFunded = task.status === 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isPastDeadline = task.fundedAt + task.deadline <= now;
  const settling = settlingPending || settlingConfirming;
  const reclaiming = reclaimPending || reclaimConfirming;

  const error = actionError || settleError || reclaimError;

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950">
            {task.agentName || `Agent #${task.agentId.toString()}`}
          </h4>
          <p className="font-mono text-xs text-slate-400">Task #{task.taskId.toString()}</p>
        </div>
        <span className={`text-xs font-semibold ${statusColor(task.status)}`}>
          {STATUS_LABELS[task.status] ?? "Unknown"}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-950">{formatEther(task.amount)} ETH</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {isFunded ? deadlineCountdown(task.fundedAt + task.deadline) : STATUS_LABELS[task.status]}
        </span>
      </div>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-red-700">
          <AlertCircle className="h-3 w-3" />
          {(error as Error).message?.slice(0, 100) ?? "Failed"}
        </div>
      )}

      {isFunded && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="accent"
            className="flex-1"
            disabled={settling || reclaiming}
            onClick={() => settleTask(task.taskId)}
          >
            {settling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Settle
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={!isPastDeadline || settling || reclaiming}
            onClick={() => reclaimTask(task.taskId)}
          >
            {reclaiming ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Reclaim
          </Button>
        </div>
      )}
    </div>
  );
}

export function TaskManager() {
  const { isConnected } = useAccount();
  const { tasks, isLoading } = useUserTasks();

  if (!isConnected) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 py-16 text-center shadow-sm">
        <p className="text-slate-500">Connect your wallet to view live tasks.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading tasks…
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 py-16 text-center shadow-sm">
        <p className="mb-1 text-slate-500">No tasks yet</p>
        <p className="text-xs text-slate-400">Hire an agent from the marketplace to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard key={task.taskId.toString()} task={task} />
      ))}
    </div>
  );
}
