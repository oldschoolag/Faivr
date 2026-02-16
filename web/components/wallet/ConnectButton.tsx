"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);

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

  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => {
          // If only one usable connector, connect directly
          if (connectors.length === 1) {
            connect({ connector: connectors[0] });
          } else {
            setShowOptions(!showOptions);
          }
        }}
        disabled={isPending}
        aria-label="Connect wallet"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </Button>

      {showOptions && connectors.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOptions(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-white/10 bg-[#0a0a0b] p-2 shadow-2xl">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector });
                  setShowOptions(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {connector.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
