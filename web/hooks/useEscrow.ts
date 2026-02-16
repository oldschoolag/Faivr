"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { parseEther, formatEther, type Address, zeroAddress } from "viem";
import { CONTRACTS, FEE_MODULE_ABI, IDENTITY_ABI } from "@/lib/contracts";

// ── Fund Task ──────────────────────────────────────────────

export function useFundTask() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Extract taskId from receipt logs (TaskFunded event first topic after event sig)
  const taskId = receipt?.logs?.[0]?.topics?.[1]
    ? BigInt(receipt.logs[0].topics[1])
    : undefined;

  const fundTask = useCallback(
    (agentId: number, amountEth: string, deadlineSeconds: number) => {
      const value = parseEther(amountEth);
      writeContract({
        address: CONTRACTS.feeModule,
        abi: FEE_MODULE_ABI,
        functionName: "fundTask",
        args: [BigInt(agentId), zeroAddress, value, BigInt(deadlineSeconds)],
        value,
      });
    },
    [writeContract],
  );

  return {
    fundTask,
    hash,
    receipt,
    taskId,
    isPending,
    isConfirming,
    isSuccess: !!receipt,
    error,
    reset,
  };
}

// ── Settle Task ────────────────────────────────────────────

export function useSettleTask() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const settleTask = useCallback(
    (taskId: bigint) => {
      writeContract({
        address: CONTRACTS.feeModule,
        abi: FEE_MODULE_ABI,
        functionName: "settleTask",
        args: [taskId],
      });
    },
    [writeContract],
  );

  return { settleTask, isPending, isConfirming, isSuccess: !!receipt, error, reset };
}

// ── Reclaim Task ───────────────────────────────────────────

export function useReclaimTask() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const reclaimTask = useCallback(
    (taskId: bigint) => {
      writeContract({
        address: CONTRACTS.feeModule,
        abi: FEE_MODULE_ABI,
        functionName: "reclaimTask",
        args: [taskId],
      });
    },
    [writeContract],
  );

  return { reclaimTask, isPending, isConfirming, isSuccess: !!receipt, error, reset };
}

// ── Task type ──────────────────────────────────────────────

export interface TaskInfo {
  taskId: bigint;
  agentId: bigint;
  client: Address;
  token: Address;
  amount: bigint;
  status: number; // 0=Funded, 1=Settled, 2=Reclaimed
  fundedAt: bigint;
  settledAt: bigint;
  deadline: bigint;
  agentName?: string;
}

const STATUS_LABELS = ["Funded", "Settled", "Reclaimed"] as const;
export { STATUS_LABELS };

type TaskTuple = readonly [bigint, Address, Address, bigint, number, bigint, bigint, bigint];

// ── Read single task ───────────────────────────────────────

export function useTask(taskId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.feeModule,
    abi: FEE_MODULE_ABI,
    functionName: "getTask",
    args: taskId !== undefined ? [taskId] : undefined,
    query: { enabled: taskId !== undefined },
  });

  const task: TaskInfo | undefined = data
    ? (() => {
        const d = data as unknown as TaskTuple;
        return {
          taskId: taskId!,
          agentId: d[0],
          client: d[1],
          token: d[2],
          amount: d[3],
          status: d[4],
          fundedAt: d[5],
          settledAt: d[6],
          deadline: d[7],
        };
      })()
    : undefined;

  return { task, isLoading };
}

// ── Read user tasks from events ────────────────────────────

// TaskFunded event signature
const TASK_FUNDED_EVENT = {
  type: "event" as const,
  name: "TaskFunded" as const,
  inputs: [
    { name: "taskId", type: "uint256" as const, indexed: true },
    { name: "agentId", type: "uint256" as const, indexed: true },
    { name: "client", type: "address" as const, indexed: true },
    { name: "amount", type: "uint256" as const, indexed: false },
  ],
} as const;

export function useUserTasks() {
  const { address } = useAccount();
  const client = usePublicClient();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || !client) {
      setTasks([]);
      return;
    }

    let cancelled = false;

    async function fetchTasks() {
      setIsLoading(true);
      try {
        // Get TaskFunded events where client = connected address
        const logs = await client!.getLogs({
          address: CONTRACTS.feeModule,
          event: TASK_FUNDED_EVENT,
          args: { client: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        if (cancelled) return;

        // Read each task's current state
        const taskInfos: TaskInfo[] = [];
        for (const log of logs) {
          const taskId = log.args.taskId;
          if (taskId === undefined) continue;

          try {
            const data = await client!.readContract({
              address: CONTRACTS.feeModule,
              abi: FEE_MODULE_ABI,
              functionName: "getTask",
              args: [taskId],
            });

            const d = data as unknown as TaskTuple;

            // Try to get agent name from tokenURI
            let agentName: string | undefined;
            try {
              const uri = await client!.readContract({
                address: CONTRACTS.identity,
                abi: IDENTITY_ABI,
                functionName: "tokenURI",
                args: [d[0]],
              });
              if (typeof uri === "string" && uri.startsWith("{")) {
                const meta = JSON.parse(uri) as { name?: string };
                agentName = meta.name;
              }
            } catch {
              // ignore
            }

            taskInfos.push({
              taskId,
              agentId: d[0],
              client: d[1],
              token: d[2],
              amount: d[3],
              status: d[4],
              fundedAt: d[5],
              settledAt: d[6],
              deadline: d[7],
              agentName,
            });
          } catch {
            // skip bad tasks
          }
        }

        if (!cancelled) {
          setTasks(taskInfos);
        }
      } catch {
        // swallow
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [address, client]);

  return { tasks, isLoading, count: tasks.filter((t) => t.status === 0).length };
}

export { formatEther };
