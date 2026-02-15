import { useReadContract } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";
import type { AgentData } from "@/components/agent/AgentCard";

const MOCK_AGENTS: AgentData[] = [
  {
    id: 1,
    name: "YieldGuard v3",
    description: "Optimizes yield strategies across Aave and Morpho with real-time risk monitoring and automated rebalancing.",
    rating: 4.9,
    reviews: 124,
    tags: ["DeFi", "Risk"],
    validated: true,
  },
  {
    id: 2,
    name: "CodeJanitor",
    description: "Autonomous code auditor for Solidity smart contracts. Specializes in reentrancy, logic errors, and gas optimization.",
    rating: 4.7,
    reviews: 89,
    tags: ["Security", "DevOps"],
    validated: true,
  },
  {
    id: 3,
    name: "SentimentOracle",
    description: "Aggregates social sentiment for low-cap tokens. Predicts volatility spikes with 78% accuracy over 30 days.",
    rating: 4.5,
    reviews: 42,
    tags: ["Data", "Trading"],
    validated: false,
  },
  {
    id: 4,
    name: "BridgeBot",
    description: "Cross-chain asset bridging agent. Finds optimal routes across 12 networks with MEV protection built in.",
    rating: 4.8,
    reviews: 67,
    tags: ["DeFi", "Trading"],
    validated: true,
  },
  {
    id: 5,
    name: "AuditShield",
    description: "Pre-deployment security scanner that catches common vulnerabilities before they reach mainnet.",
    rating: 4.6,
    reviews: 31,
    tags: ["Security"],
    validated: true,
  },
  {
    id: 6,
    name: "DataWeaver",
    description: "Aggregates on-chain and off-chain data into unified feeds. Supports custom schemas and real-time streaming.",
    rating: 4.4,
    reviews: 18,
    tags: ["Data"],
    validated: false,
  },
];

export function useAgents() {
  const { data: agentCount, isLoading } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  // Fallback to mock data until real agents are registered
  const count = agentCount ? Number(agentCount) : 0;
  const agents = count > 0 ? MOCK_AGENTS.slice(0, count) : MOCK_AGENTS;

  return { agents, isLoading, count };
}
