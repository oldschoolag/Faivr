import { useReadContract } from "wagmi";
import { CONTRACTS, FEE_MODULE_ABI, IDENTITY_ABI } from "@/lib/contracts";

export function useContractStats() {
  const { data: agentCount, isLoading: agentCountLoading } = useReadContract({
    address: CONTRACTS.identity,
    abi: IDENTITY_ABI,
    functionName: "agentCount",
  });

  const { data: feeBps, isLoading: feeLoading } = useReadContract({
    address: CONTRACTS.feeModule,
    abi: FEE_MODULE_ABI,
    functionName: "feePercentage",
  });

  const protocolFee = typeof feeBps === "bigint" ? `${Number(feeBps) / 100}%` : "—";

  return {
    agentCount: typeof agentCount === "bigint" ? Number(agentCount) : 0,
    protocolFee,
    isLoading: agentCountLoading || feeLoading,
  };
}
