"use client";

import { useAccount } from "wagmi";
import { Plus, Search, Shield, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<"marketplace" | "onboarding">("marketplace");

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black text-xs">
                F
              </div>
              <span className="font-bold tracking-tight text-xl">FAIVR</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5">
              <NavButton 
                active={activeTab === "marketplace"} 
                onClick={() => setActiveTab("marketplace")}
                label="Marketplace" 
              />
              <NavButton 
                active={activeTab === "onboarding"} 
                onClick={() => setActiveTab("onboarding")}
                label="Onboard Agent" 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             {isConnected ? (
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-mono text-white/70">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            ) : (
              <button className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === "marketplace" ? (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">The Agent Economy</h1>
                  <p className="text-neutral-500 mt-2 text-lg">Discover and hire audited AI agents on Base Sepolia.</p>
                </div>
                
                <div className="relative group max-w-md w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search by capability or name..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Discovery Grid Placeholder */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AgentCard 
                  name="YieldGuard v3" 
                  description="Optimizes yield strategies across Aave and Morpho with real-time risk monitoring."
                  rating={4.9}
                  reviews={124}
                  tags={["DeFi", "Risk"]}
                />
                <AgentCard 
                  name="CodeJanitor" 
                  description="Autonomous code auditor for Solidity smart contracts. Specializes in logic errors."
                  rating={4.7}
                  reviews={89}
                  tags={["Security", "DevOps"]}
                />
                <AgentCard 
                  name="SentimentOracle" 
                  description="Aggregates social sentiment for low-cap gems. Predicts volatility spikes."
                  rating={4.5}
                  reviews={42}
                  tags={["Data", "Trading"]}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Onboard Your Agent</h1>
                <p className="text-neutral-500 mt-2">Join the open marketplace in minutes.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Agent Name</label>
                    <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors" placeholder="e.g. YieldGuard" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Category</label>
                    <select className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none">
                      <option>DeFi</option>
                      <option>Security</option>
                      <option>Data</option>
                      <option>Marketing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Description</label>
                  <textarea rows={3} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors" placeholder="What does your agent do?" />
                </div>

                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
                   <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-semibold italic">MCP Endpoint</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Recommended</span>
                  </div>
                  <input type="text" className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-neutral-700" placeholder="https://mcp.your-agent.com/v1" />
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Provide a Model Context Protocol endpoint to allow clients to interact with your agent programmatically.
                  </p>
                </div>

                <button className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group">
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  Mint Identity NFT
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-full text-sm font-medium transition-all",
        active ? "bg-white text-black shadow-lg" : "text-neutral-400 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function AgentCard({ name, description, rating, reviews, tags }: { name: string, description: string, rating: number, reviews: number, tags: string[] }) {
  return (
    <div className="group bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-emerald-500/30 transition-all hover:translate-y-[-4px] duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-neutral-800 rounded-2xl flex items-center justify-center font-bold text-neutral-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
          {name[0]}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            <span className="font-bold">{rating}</span>
            <span className="text-neutral-500 text-[10px]">({reviews})</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
             <Shield className="w-3 h-3 text-emerald-500" />
             <span className="text-[10px] text-neutral-500">Verified</span>
          </div>
        </div>
      </div>
      
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed mb-6">
        {description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-400">
              {tag}
            </span>
          ))}
        </div>
        <button className="text-xs font-bold text-white hover:text-emerald-500 transition-colors">
          View Detail →
        </button>
      </div>
    </div>
  );
}
