import { useReadContract } from "wagmi";
import { CONTRACTS, IDENTITY_ABI } from "@/lib/contracts";

export function useContractStats() {
  const { data: agentCount } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  return {
    agentCount: agentCount ? Number(agentCount) : 0,
    totalReviews: 0,
    protocolFee: "2.5%",
    totalVolume: "0 ETH",
    isLoading: false,
  };
}
