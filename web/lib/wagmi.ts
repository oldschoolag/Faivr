import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = "b1e9e44662c95cff5c8a8fbf8ec0891e"; // WalletConnect Cloud project ID

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});
