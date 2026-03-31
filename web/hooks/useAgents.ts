import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";
import type { AgentData } from "@/components/agent/AgentCard";
import { useMemo } from "react";

const EXAMPLE_AGENTS: AgentData[] = [
  {
    id: 1,
    name: "YieldGuard",
    description: "Illustrative DeFi risk-monitoring agent profile used while live marketplace listings are still limited.",
    rating: 0,
    reviews: 0,
    tags: ["DeFi", "Example"],
    validated: false,
    isExample: true,
  },
  {
    id: 2,
    name: "CodeJanitor",
    description: "Illustrative smart-contract review agent profile shown as marketplace sample content.",
    rating: 0,
    reviews: 0,
    tags: ["Security", "Example"],
    validated: false,
    isExample: true,
  },
  {
    id: 3,
    name: "SignalLens",
    description: "Illustrative research and monitoring agent profile. Performance metrics are not claimed for this example card.",
    rating: 0,
    reviews: 0,
    tags: ["Data", "Example"],
    validated: false,
    isExample: true,
  },
  {
    id: 4,
    name: "RoutePilot",
    description: "Illustrative cross-chain workflow agent profile used for preview purposes only.",
    rating: 0,
    reviews: 0,
    tags: ["Operations", "Example"],
    validated: false,
    isExample: true,
  },
  {
    id: 5,
    name: "AuditShield",
    description: "Illustrative security scanning agent profile shown until more on-chain agents are registered.",
    rating: 0,
    reviews: 0,
    tags: ["Security", "Example"],
    validated: false,
    isExample: true,
  },
  {
    id: 6,
    name: "DataWeaver",
    description: "Illustrative data aggregation agent profile for marketplace layout previews.",
    rating: 0,
    reviews: 0,
    tags: ["Data", "Example"],
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

  const tokenURICalls = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => ({
      address: CONTRACTS.identity,
      abi: IDENTITY_ABI,
      functionName: "tokenURI" as const,
      args: [BigInt(i + 1)] as const,
    }));
  }, [count]);

  const { data: tokenURIs, isLoading: tokenURIsLoading } = useReadContracts({
    contracts: tokenURICalls,
    query: { enabled: count > 0 },
  });

  const onChainAgents = useMemo(() => {
    if (count === 0 || !tokenURIs) return [] as AgentData[];

    const parsedAgents: AgentData[] = [];
    for (let i = 0; i < tokenURIs.length; i++) {
      const result = tokenURIs[i];
      if (result.status === "success" && typeof result.result === "string") {
        const agent = parseAgentURI(result.result, i + 1);
        if (agent) parsedAgents.push(agent);
      }
    }

    return parsedAgents;
  }, [count, tokenURIs]);

  const loading = isLoading || tokenURIsLoading;
  const showingExamples = !loading && onChainAgents.length === 0;
  const agents = showingExamples ? EXAMPLE_AGENTS : onChainAgents;

  return { agents, isLoading: loading, count, showingExamples };
}
