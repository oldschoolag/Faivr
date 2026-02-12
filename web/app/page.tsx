"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, zeroAddress } from "viem";
import { useState } from "react";
import { CONTRACTS, IDENTITY_ABI, FEE_MODULE_ABI, REPUTATION_ABI } from "@/lib/contracts";

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)] font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition"
    >
      Connect Wallet
    </button>
  );
}

function Stats() {
  const { data: agentCount } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  const { data: totalReviews } = useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: "totalReviews",
  });

  const { data: feeBps } = useReadContract({
    address: CONTRACTS.feeModule,
    abi: FEE_MODULE_ABI,
    functionName: "feePercentage",
  });

  const { data: totalFees } = useReadContract({
    address: CONTRACTS.feeModule,
    abi: FEE_MODULE_ABI,
    functionName: "totalFeesCollected",
    args: [zeroAddress],
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Agents" value={agentCount?.toString() || "0"} />
      <StatCard label="Reviews" value={totalReviews?.toString() || "0"} />
      <StatCard
        label="Protocol Fee"
        value={feeBps ? `${Number(feeBps) / 100}%` : "—"}
      />
      <StatCard
        label="Fees Collected"
        value={totalFees ? `${formatEther(totalFees)} ETH` : "0 ETH"}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
      <div className="text-sm text-[var(--muted)] mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function RegisterAgent() {
  const [uri, setUri] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleRegister = () => {
    if (!uri) return;
    writeContract({
      address: CONTRACTS.identity,
      abi: IDENTITY_ABI,
      functionName: "registerAgent",
      args: [uri],
    });
  };

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold mb-4">🤖 Register Agent</h2>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Agent metadata URI (e.g., ipfs://...)"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleRegister}
          disabled={!uri || isPending || isConfirming}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Registering..."
            : "Register Agent"}
        </button>
        {isSuccess && (
          <div className="text-green-400 text-sm">
            ✅ Agent registered!{" "}
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FundTask() {
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("86400");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleFund = () => {
    if (!agentId || !amount) return;
    const wei = parseEther(amount);
    writeContract({
      address: CONTRACTS.feeModule,
      abi: FEE_MODULE_ABI,
      functionName: "fundTask",
      args: [BigInt(agentId), zeroAddress, wei, BigInt(deadline)],
      value: wei,
    });
  };

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold mb-4">💰 Fund Task</h2>
      <div className="space-y-3">
        <input
          type="number"
          placeholder="Agent ID"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="text"
          placeholder="Amount (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <select
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="3600">1 hour</option>
          <option value="86400">1 day</option>
          <option value="604800">1 week</option>
          <option value="2592000">30 days</option>
        </select>
        <button
          onClick={handleFund}
          disabled={!agentId || !amount || isPending || isConfirming}
          className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {isPending
            ? "Confirm in wallet..."
            : isConfirming
            ? "Funding..."
            : "Fund Task"}
        </button>
        {isSuccess && (
          <div className="text-green-400 text-sm">
            ✅ Task funded!{" "}
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function SettleTask() {
  const [taskId, setTaskId] = useState("");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSettle = () => {
    if (!taskId) return;
    writeContract({
      address: CONTRACTS.feeModule,
      abi: FEE_MODULE_ABI,
      functionName: "settleTask",
      args: [BigInt(taskId)],
    });
  };

  const handleReclaim = () => {
    if (!taskId) return;
    writeContract({
      address: CONTRACTS.feeModule,
      abi: FEE_MODULE_ABI,
      functionName: "reclaimTask",
      args: [BigInt(taskId)],
    });
  };

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold mb-4">⚡ Settle / Reclaim</h2>
      <div className="space-y-3">
        <input
          type="number"
          placeholder="Task ID"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSettle}
            disabled={!taskId || isPending || isConfirming}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isPending ? "Confirming..." : "Settle"}
          </button>
          <button
            onClick={handleReclaim}
            disabled={!taskId || isPending || isConfirming}
            className="px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isPending ? "Confirming..." : "Reclaim"}
          </button>
        </div>
        {isSuccess && (
          <div className="text-green-400 text-sm">
            ✅ Done!{" "}
            <a
              href={`https://sepolia.basescan.org/tx/${hash}`}
              target="_blank"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentLookup() {
  const [agentId, setAgentId] = useState("");
  const query = agentId ? BigInt(agentId) : undefined;

  const { data: isActive } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "isActive",
    args: query !== undefined ? [query] : undefined,
    query: { enabled: query !== undefined },
  });

  const { data: tokenURI } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "tokenURI",
    args: query !== undefined ? [query] : undefined,
    query: { enabled: query !== undefined },
  });

  const { data: owner } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "ownerOf",
    args: query !== undefined ? [query] : undefined,
    query: { enabled: query !== undefined },
  });

  const { data: rating } = useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: "getAverageRating",
    args: query !== undefined ? [query] : undefined,
    query: { enabled: query !== undefined },
  });

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-6">
      <h2 className="text-lg font-semibold mb-4">🔍 Agent Lookup</h2>
      <input
        type="number"
        placeholder="Agent ID"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] mb-4"
      />
      {agentId && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Status</span>
            <span className={isActive ? "text-green-400" : "text-red-400"}>
              {isActive ? "Active ✅" : "Inactive ❌"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Owner</span>
            <span className="font-mono text-xs">
              {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">URI</span>
            <span className="font-mono text-xs truncate max-w-[200px]">
              {tokenURI || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Rating</span>
            <span>
              {rating
                ? `${(Number(rating[0]) / 100).toFixed(2)} ⭐ (${rating[1]} reviews)`
                : "No reviews"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              <span className="text-[var(--accent)]">FAIVR</span>
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Base Sepolia Testnet
            </span>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          The Open Agent Marketplace
        </h2>
        <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto mb-8">
          Discover, trust, and hire AI agents on-chain. Non-custodial escrow,
          on-chain reputation, and programmable payments.
        </p>
        <div className="flex gap-3 justify-center text-sm">
          <a
            href="https://github.com/oldschoolag/Faivr"
            target="_blank"
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition"
          >
            GitHub ↗
          </a>
          <a
            href="https://sepolia.basescan.org/address/0x2c954A4E93DdA93b09C679c4DAc6e04758b8f490"
            target="_blank"
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition"
          >
            Basescan ↗
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <Stats />
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          {!isConnected ? (
            <div className="text-center py-12 text-[var(--muted)]">
              Connect your wallet to interact with the marketplace
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <RegisterAgent />
              <AgentLookup />
              <FundTask />
              <SettleTask />
            </div>
          )}
        </div>
      </section>

      {/* Contract Addresses */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">📋 Contract Addresses</h3>
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-6 space-y-2 text-sm font-mono">
            {Object.entries(CONTRACTS).map(([name, addr]) => (
              <div key={name} className="flex justify-between items-center">
                <span className="text-[var(--muted)] capitalize">{name}</span>
                <a
                  href={`https://sepolia.basescan.org/address/${addr}`}
                  target="_blank"
                  className="text-[var(--accent)] hover:underline"
                >
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-6 text-center text-sm text-[var(--muted)]">
        Built by{" "}
        <a href="https://oldschool.ag" target="_blank" className="text-[var(--accent)] hover:underline">
          Old School GmbH
        </a>{" "}
        · Walchwil, Switzerland · BSL 1.1
      </footer>
    </div>
  );
}
