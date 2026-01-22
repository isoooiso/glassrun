"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { genlayerChain } from "@/lib/viem";

const queryClient = new QueryClient();
const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL?.trim() || "http://127.0.0.1:8545";

const config = createConfig({
  chains: [genlayerChain],
  connectors: [injected()],
  transports: {
    [genlayerChain.id]: http(rpcUrl),
  },
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
