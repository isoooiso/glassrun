import { createPublicClient, http, defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "1337");
const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "GenLayer";
const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "http://127.0.0.1:8545";

export const genlayerChain = defineChain({
  id: chainId,
  name: chainName,
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

export const publicClient = createPublicClient({
  chain: genlayerChain,
  transport: http(rpcUrl),
});
