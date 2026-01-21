import { createPublicClient, defineChain, http } from "viem";

const fallbackRpc = "http://127.0.0.1:8545";

function getRpcUrl(): string {
  const v = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;
  return v && v.trim().length > 0 ? v.trim() : fallbackRpc;
}

export const genlayerChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "1337"),
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? "GenLayer",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [getRpcUrl()] } },
});

export const publicClient = createPublicClient({
  chain: genlayerChain,
  transport: http(getRpcUrl()),
});
