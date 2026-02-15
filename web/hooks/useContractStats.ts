import { useReadContract } from "wagmi";
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/contracts";

export function useContractStats() {
  const { data: agentCount, isLoading: loadingAgents } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  const { data: totalReviews, isLoading: loadingReviews } = useReadContract({
    address: CONTRACTS.reputation,
    abi: REPUTATION_ABI,
    functionName: "totalReviews",
  });

  return {
    agentCount: agentCount ? Number(agentCount) : 0,
    totalReviews: totalReviews ? Number(totalReviews) : 0,
    protocolFee: "2.5%",
    totalVolume: "0 ETH",
    isLoading: loadingAgents || loadingReviews,
  };
}
