import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";
import type { AgentData } from "@/components/agent/AgentCard";
import { useMemo } from "react";

const MOCK_AGENTS: AgentData[] = [
  {
    id: 1,
    name: "YieldGuard v3",
    description: "Optimizes yield strategies across Aave and Morpho with real-time risk monitoring and automated rebalancing.",
    rating: 0,
    reviews: 0,
    tags: ["DeFi", "Risk"],
    validated: true,
    isExample: true,
  },
  {
    id: 2,
    name: "CodeJanitor",
    description: "Autonomous code auditor for Solidity smart contracts. Specializes in reentrancy, logic errors, and gas optimization.",
    rating: 0,
    reviews: 0,
    tags: ["Security", "DevOps"],
    validated: true,
    isExample: true,
  },
  {
    id: 3,
    name: "SentimentOracle",
    description: "Aggregates social sentiment for low-cap tokens. Predicts volatility spikes with 78% accuracy over 30 days.",
    rating: 0,
    reviews: 0,
    tags: ["Data", "Trading"],
    validated: false,
    isExample: true,
  },
  {
    id: 4,
    name: "BridgeBot",
    description: "Cross-chain asset bridging agent. Finds optimal routes across 12 networks with MEV protection built in.",
    rating: 0,
    reviews: 0,
    tags: ["DeFi", "Trading"],
    validated: true,
    isExample: true,
  },
  {
    id: 5,
    name: "AuditShield",
    description: "Pre-deployment security scanner that catches common vulnerabilities before they reach mainnet.",
    rating: 0,
    reviews: 0,
    tags: ["Security"],
    validated: true,
    isExample: true,
  },
  {
    id: 6,
    name: "DataWeaver",
    description: "Aggregates on-chain and off-chain data into unified feeds. Supports custom schemas and real-time streaming.",
    rating: 0,
    reviews: 0,
    tags: ["Data"],
    validated: false,
    isExample: true,
  },
];

function parseAgentURI(uri: string, id: number): AgentData | null {
  try {
    const parsed = JSON.parse(uri);
    return {
      id,
      name: parsed.name || `Agent #${id}`,
      description: parsed.description || "",
      rating: 0,
      reviews: 0,
      tags: parsed.category ? [parsed.category] : [],
      validated: false,
      isExample: false,
    };
  } catch {
    return {
      id,
      name: `Agent #${id}`,
      description: uri.slice(0, 200),
      rating: 0,
      reviews: 0,
      tags: [],
      validated: false,
      isExample: false,
    };
  }
}

export function useAgents() {
  const { data: agentCount, isLoading } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  const count = agentCount ? Number(agentCount) : 0;

  // Build contract calls to fetch tokenURI for each on-chain agent
  const tokenURICalls = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: CONTRACTS.identity,
      abi: IDENTITY_ABI,
      functionName: "tokenURI" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [count]);

  const { data: tokenURIs } = useReadContracts({
    contracts: tokenURICalls,
    query: { enabled: count > 0 },
  });

  const agents = useMemo(() => {
    if (count === 0 || !tokenURIs) return MOCK_AGENTS;

    const onChainAgents: AgentData[] = [];
    for (let i = 0; i < tokenURIs.length; i++) {
      const result = tokenURIs[i];
      if (result.status === "success" && typeof result.result === "string") {
        const agent = parseAgentURI(result.result, i + 1);
        if (agent) onChainAgents.push(agent);
      }
    }

    return onChainAgents.length > 0 ? onChainAgents : MOCK_AGENTS;
  }, [count, tokenURIs]);

  return { agents, isLoading, count };
}
