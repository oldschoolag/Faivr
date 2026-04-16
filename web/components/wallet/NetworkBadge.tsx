"use client";

import { useAccount } from "wagmi";

export function NetworkBadge() {
  const { chain } = useAccount();
  const name = chain?.name ?? "Base mainnet";

  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm sm:flex">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {name}
    </div>
  );
}
