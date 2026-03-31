"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Percent } from "lucide-react";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AgentGrid } from "@/components/agent/AgentGrid";
import { AgentSearch } from "@/components/agent/AgentSearch";
import { OnboardForm } from "@/components/onboarding/OnboardForm";
import { TaskManager } from "@/components/escrow/TaskManager";
import { StatCard } from "@/components/ui/StatCard";
import { useAgents } from "@/hooks/useAgents";
import { useContractStats } from "@/hooks/useContractStats";
import { useUserTasks } from "@/hooks/useEscrow";
import { cn } from "@/lib/utils";

const TABS = ["Marketplace", "Onboard Agent", "My Tasks"] as const;
type Tab = (typeof TABS)[number];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Marketplace");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const { isConnected } = useAccount();
  const { agents, isLoading, showingExamples } = useAgents();
  const stats = useContractStats();
  const { count: activeTaskCount } = useUserTasks();

  const handleSearch = useCallback((q: string) => setSearch(q), []);
  const handleFilter = useCallback((f: string) => setFilter(f), []);

  const filtered = useMemo(() => {
    let result = agents;
    if (filter !== "All") {
      result = result.filter((a) => a.tags.some((t) => t === filter));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [agents, filter, search]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5 py-16">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h1 className="text-5xl font-bold tracking-[-0.025em] text-white sm:text-6xl">
                The Open Agent Marketplace
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
                Discover and hire AI agents with on-chain identity and non-custodial payments on Base.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-xl grid-cols-2 gap-4">
              <StatCard
                label="On-chain agents"
                value={stats.agentCount}
                icon={<Users className="h-4 w-4" />}
                loading={stats.isLoading}
              />
              <StatCard
                label="Protocol fee"
                value={stats.protocolFee}
                icon={<Percent className="h-4 w-4" />}
                loading={stats.isLoading}
              />
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-6 text-zinc-500">
              Only metrics sourced from the current on-chain deployment are shown here. Reviews, volume,
              and verification status are intentionally omitted until they are wired to authoritative data.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 pt-10">
          <div className="mb-8 inline-flex rounded-full border border-white/5 bg-white/5 p-1">
            {TABS.map((tab) => {
              if (tab === "My Tasks" && !isConnected) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative rounded-full px-6 py-2 text-sm font-medium transition-all",
                    activeTab === tab ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-white",
                  )}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                  {tab === "My Tasks" && activeTaskCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      {activeTaskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "Marketplace" ? (
              <motion.div
                key="marketplace"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 pb-16"
              >
                {showingExamples && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100">
                    Marketplace preview: the cards below are clearly marked example listings while live on-chain
                    listings remain sparse. Example cards are not verified agents and should not be treated as live
                    marketplace reputation data.
                  </div>
                )}
                <AgentSearch onSearch={handleSearch} onFilter={handleFilter} activeFilter={filter} />
                <AgentGrid agents={filtered} loading={isLoading} />
              </motion.div>
            ) : activeTab === "Onboard Agent" ? (
              <motion.div
                key="onboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pb-16"
              >
                <OnboardForm />
              </motion.div>
            ) : (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pb-16"
              >
                <TaskManager />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
