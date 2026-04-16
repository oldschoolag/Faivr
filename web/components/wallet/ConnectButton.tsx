"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="hidden items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition-colors hover:bg-slate-50 sm:flex"
        aria-label={`Connected wallet ${address}. Click to disconnect.`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-sm font-mono text-slate-700">
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
      window.open("https://metamask.io/download/", "_blank");
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleConnect}
      disabled={isPending}
      aria-label="Connect wallet"
      className="shadow-sm"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
