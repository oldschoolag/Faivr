"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition-colors hover:bg-white/10"
        aria-label={`Connected wallet ${address}. Click to disconnect.`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-mono text-white/70">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </button>
    );
  }

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    } else {
      // No injected wallet found — guide user
      window.open("https://metamask.io/download/", "_blank");
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleConnect}
      disabled={isPending}
      aria-label="Connect wallet"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
