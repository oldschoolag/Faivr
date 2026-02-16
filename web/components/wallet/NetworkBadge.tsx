"use client";

import { useAccount } from "wagmi";

export function NetworkBadge() {
  const { chain } = useAccount();
  const name = chain?.name ?? "Base";

  return (
    <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {name}
    </div>
  );
}
