"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { Clock, CheckCircle2, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUserTasks, useSettleTask, useReclaimTask, STATUS_LABELS } from "@/hooks/useEscrow";
import type { TaskInfo } from "@/hooks/useEscrow";
import { useState } from "react";

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
  if (status === 0) return "text-emerald-400";
  if (status === 1) return "text-blue-400";
  return "text-zinc-500";
}

function TaskCard({ task }: { task: TaskInfo }) {
  const { settleTask, isPending: settlingPending, isConfirming: settlingConfirming, error: settleError } = useSettleTask();
  const { reclaimTask, isPending: reclaimPending, isConfirming: reclaimConfirming, error: reclaimError } = useReclaimTask();
  const [actionError, setActionError] = useState<string | null>(null);

  const isFunded = task.status === 0;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isPastDeadline = task.fundedAt + task.deadline <= now;
  const settling = settlingPending || settlingConfirming;
  const reclaiming = reclaimPending || reclaimConfirming;

  const error = settleError || reclaimError;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-white">
            {task.agentName || `Agent #${task.agentId.toString()}`}
          </h4>
          <p className="text-xs text-zinc-500 font-mono">Task #{task.taskId.toString()}</p>
        </div>
        <span className={`text-xs font-semibold ${statusColor(task.status)}`}>
          {STATUS_LABELS[task.status] ?? "Unknown"}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-zinc-400">{formatEther(task.amount)} ETH</span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="h-3 w-3" />
          {isFunded ? deadlineCountdown(task.fundedAt + task.deadline) : STATUS_LABELS[task.status]}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 mb-2">
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
      <div className="text-center py-16">
        <p className="text-zinc-500">Connect your wallet to view tasks</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading tasks…
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 mb-1">No tasks yet</p>
        <p className="text-xs text-zinc-600">Hire an agent from the marketplace to get started</p>
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
