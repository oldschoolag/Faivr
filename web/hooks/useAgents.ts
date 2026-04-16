import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";
import type { AgentData } from "@/components/agent/AgentCard";

function decodeAgentURI(uri: string): string {
  if (uri.startsWith("data:application/json;base64,")) {
    return atob(uri.slice("data:application/json;base64,".length));
  }

  if (uri.startsWith("data:application/json;utf8,")) {
    return decodeURIComponent(uri.slice("data:application/json;utf8,".length));
  }

  return uri;
}

function parseAgentURI(uri: string, id: number): AgentData | null {
  const decoded = decodeAgentURI(uri);

  try {
    const parsed = JSON.parse(decoded);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : typeof parsed.category === "string"
        ? [parsed.category]
        : [];

    return {
      id,
      name: parsed.name || `Agent #${id}`,
      description: parsed.description || "",
      rating: 0,
      reviews: 0,
      tags,
      validated: Boolean(parsed.validated),
      verified: Boolean(parsed.verified),
      isExample: false,
    };
  } catch {
    return {
      id,
      name: `Agent #${id}`,
      description: decoded.slice(0, 220),
      rating: 0,
      reviews: 0,
      tags: [],
      validated: false,
      verified: false,
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

  const { data: tokenURIs } = useReadContracts({
    contracts: tokenURICalls,
    query: { enabled: count > 0 },
  });

  const agents = useMemo(() => {
    if (count === 0 || !tokenURIs) return [];

    const onChainAgents: AgentData[] = [];
    for (let i = 0; i < tokenURIs.length; i++) {
      const result = tokenURIs[i];
      if (result.status === "success" && typeof result.result === "string") {
        const agent = parseAgentURI(result.result, i + 1);
        if (agent) onChainAgents.push(agent);
      }
    }

    return onChainAgents;
  }, [count, tokenURIs]);

  return { agents, isLoading, count };
}
