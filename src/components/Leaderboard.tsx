"use client";

import { useEffect, useMemo, useState } from "react";
import { Address, createPublicClient, custom } from "viem";
import { useAccount } from "wagmi";
import { CONTRACT_ADDRESS, hasValidContractAddress } from "@/lib/contract";
import { glassRunAbi } from "@/lib/contract";
import { genlayerChain } from "@/lib/viem";

type Row = { player: string; maxStep: number };

export default function Leaderboard() {
  const { isConnected } = useAccount();

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorText, setErrorText] = useState<string>("");

  const canLoad = useMemo(() => hasValidContractAddress(), []);

  async function load() {
    if (!canLoad) return;
    setStatus("loading");
    setErrorText("");

    try {
      // ✅ Используем провайдера кошелька (без CORS)
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No wallet provider (window.ethereum). Connect wallet.");

      const client = createPublicClient({
        chain: genlayerChain,
        transport: custom(eth),
      });

      const latest = await client.getBlockNumber();
      const fromBlock = latest > 50_000n ? latest - 50_000n : 0n;

      const runFinishedEvent = glassRunAbi.find(
        (x: any) => x.type === "event" && x.name === "RunFinished"
      ) as any;

      const logs = await client.getLogs({
        address: CONTRACT_ADDRESS as Address,
        event: runFinishedEvent,
        fromBlock,
        toBlock: latest,
      });

      const best: Record<string, number> = {};

      for (const log of logs) {
        const args: any = (log as any).args || {};
        const player = String(args.player || "").toLowerCase();
        const maxStep = Number(args.max_step ?? args.maxStep ?? 0n);
        if (!player) continue;
        best[player] = Math.max(best[player] ?? 0, maxStep);
      }

      const list = Object.entries(best)
        .map(([player, maxStep]) => ({ player, maxStep }))
        .sort((a, b) => b.maxStep - a.maxStep)
        .slice(0, 50);

      setRows(list);
      setStatus("idle");
    } catch (e: any) {
      setStatus("error");
      setErrorText(e?.message || "Failed to load leaderboard");
    }
  }

  useEffect(() => {
    if (isConnected) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-white/50">Leaderboard</div>
          <div className="mt-1 text-lg font-medium">All-time (top 50)</div>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={!canLoad || status === "loading"}>
          {status === "loading" ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!canLoad ? (
        <div className="mt-4 text-sm text-amber-200">
          Contract address missing/invalid (NEXT_PUBLIC_CONTRACT_ADDRESS).
        </div>
      ) : !isConnected ? (
        <div className="mt-4 text-sm text-white/60">Connect wallet to load leaderboard.</div>
      ) : status === "error" ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {errorText}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 text-sm text-white/60">No runs yet.</div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[60px_1fr_100px] bg-white/5 px-4 py-2 text-xs text-white/50">
            <div>#</div>
            <div>Player</div>
            <div className="text-right">Max step</div>
          </div>

          {rows.map((r, i) => (
            <div
              key={r.player}
              className="grid grid-cols-[60px_1fr_100px] px-4 py-3 text-sm text-white/80 border-t border-white/10"
            >
              <div className="text-white/50">{i + 1}</div>
              <div className="font-mono">
                {r.player.slice(0, 8)}…{r.player.slice(-6)}
              </div>
              <div className="text-right font-semibold text-white">{r.maxStep}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-white/35">MVP scans last ~50k blocks.</div>
    </div>
  );
}
