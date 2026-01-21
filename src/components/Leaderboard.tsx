"use client";

import { useEffect, useMemo, useState } from "react";
import { CONTRACT_ADDRESS, glassRunAbi } from "@/lib/contract";
import { publicClient } from "@/lib/viem";
import { Address } from "viem";

type Row = { player: string; maxStep: number };

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const canLoad = useMemo(() => {
    return Boolean(CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith("0x"));
  }, []);

  async function load() {
    if (!canLoad) return;
    setStatus("loading");

    try {
      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > 50_000n ? latest - 50_000n : 0n;

      // Берём только RunFinished (обновление лидерборда по падению)
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS as Address,
        event: glassRunAbi.find((x: any) => x.type === "event" && x.name === "RunFinished") as any,
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
    } catch (e) {
      // Частая причина: CORS на RPC
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="mt-4 text-sm text-rose-200">
          Missing/invalid NEXT_PUBLIC_CONTRACT_ADDRESS
        </div>
      ) : status === "error" ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          Failed to load logs. Likely RPC CORS blocks browser requests.
          <div className="mt-1 text-xs text-white/50">
            Fix: use a CORS-enabled RPC OR add an indexer (server) later.
          </div>
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

      <div className="mt-3 text-xs text-white/35">
        MVP scans last ~50k blocks in-browser.
      </div>
    </div>
  );
}
