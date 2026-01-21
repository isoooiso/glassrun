"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, decodeEventLog } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { publicClient, genlayerChain } from "@/lib/viem";
import { CONTRACT_ADDRESS, glassRunAbi } from "@/lib/contract";
import Leaderboard from "./Leaderboard";
import TileChoice from "./TileChoice";

type Outcome = "SAFE" | "FALL";

export default function GameScreen() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const [runId, setRunId] = useState<bigint | null>(null);
  const [step, setStep] = useState<number>(0);
  const [alive, setAlive] = useState<boolean>(false);

  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);

  const [pendingChoice, setPendingChoice] = useState<"LEFT" | "RIGHT" | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const canPlay = isConnected && walletClient && CONTRACT_ADDRESS;

  const ensureChain = useCallback(async () => {
    await switchChainAsync({ chainId: genlayerChain.id });
  }, [switchChainAsync]);

  const resetUiForRun = useCallback((newRunId: bigint) => {
    setRunId(newRunId);
    setStep(0);
    setAlive(true);
    setLastOutcome(null);
    setExplanation("");
    setConfidence(0);
    setPendingChoice(null);
    setError("");
  }, []);

  const startRun = useCallback(async () => {
    if (!canPlay) return;
    setBusy(true);
    setError("");
    try {
      await ensureChain();

      const hash = await walletClient!.writeContract({
        address: CONTRACT_ADDRESS,
        abi: glassRunAbi,
        functionName: "start_run",
        args: [],
        account: walletClient!.account!,
        chain: genlayerChain,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Надёжно: читаем get_active_run
      const active = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: glassRunAbi,
        functionName: "get_active_run",
        args: [address as Address],
      });

      if (typeof active !== "bigint") throw new Error("No active run found");
      resetUiForRun(active);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Failed to start run");
    } finally {
      setBusy(false);
    }
  }, [address, canPlay, ensureChain, resetUiForRun, walletClient]);

  const jump = useCallback(
    async (choice: "LEFT" | "RIGHT") => {
      if (!canPlay || !runId || !alive) return;

      setBusy(true);
      setError("");
      setLastOutcome(null);
      setPendingChoice(choice);

      try {
        await ensureChain();

        const nextStep = step + 1;

        const hash = await walletClient!.writeContract({
          address: CONTRACT_ADDRESS,
          abi: glassRunAbi,
          functionName: "jump",
          args: [runId, nextStep, choice],
          account: walletClient!.account!,
          chain: genlayerChain,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // --- parse JumpResolved from receipt logs ---
        let jr: any | null = null;

        for (const log of receipt.logs) {
          if (log.address?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;

          try {
            const decoded = decodeEventLog({
              abi: glassRunAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "JumpResolved") {
              const args: any = decoded.args;
              const evRunId = (args.run_id ?? args.runId) as bigint;

              if (evRunId === runId) {
                jr = args;
                break;
              }
            }
          } catch {
            // ignore
          }
        }

        if (!jr) throw new Error("JumpResolved event not found in receipt logs");

        const outcome = String(jr.outcome).toUpperCase() as Outcome;
        const expl = String(jr.explanation ?? "");
        const confBp = Number(jr.confidence_bp ?? jr.confidenceBp ?? 0);
        const conf = confBp / 10000;

        const newAlive = Boolean(jr.alive);
        const newStep = Number(jr.step);

        setLastOutcome(outcome);
        setExplanation(expl);
        setConfidence(conf);
        setAlive(newAlive);
        setStep(newStep);
      } catch (e: any) {
        setError(e?.shortMessage || e?.message || "Jump failed");
      } finally {
        setBusy(false);
        setPendingChoice(null);
      }
    },
    [alive, canPlay, ensureChain, runId, step, walletClient]
  );

  // Подхватить активный ранн при перезагрузке
  useEffect(() => {
    (async () => {
      if (!isConnected || !address || !CONTRACT_ADDRESS) return;
      try {
        const active = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: glassRunAbi,
          functionName: "get_active_run",
          args: [address as Address],
        });

        if (typeof active === "bigint") {
          const st = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: glassRunAbi,
            functionName: "get_run",
            args: [active],
          });

          // st: (exists, player, step, max_step, alive)
          setRunId(active);
          setStep(Number((st as any)[2]));
          setAlive(Boolean((st as any)[4]));
        }
      } catch {
        // ignore
      }
    })();
  }, [address, isConnected]);

  const connectBtn = useMemo(() => {
    const connector = connectors?.[0];
    if (!connector) return null;

    if (!isConnected) {
      return (
        <button className="btn" onClick={() => connect({ connector })} disabled={isConnectPending}>
          {isConnectPending ? "Connecting..." : "Connect wallet"}
        </button>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-white/60">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </div>
        <button className="btn btn-ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }, [address, connect, connectors, disconnect, isConnectPending, isConnected]);

  return (
    <>
      <section className="glass p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-white/50">Status</div>
            <div className="mt-1 text-lg font-medium">
              {!isConnected ? "Wallet not connected" : alive ? "Running" : runId ? "Finished" : "Ready"}
            </div>
          </div>
          {connectBtn}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-soft p-4">
            <div className="text-xs text-white/50">Run ID</div>
            <div className="mt-1 font-mono text-sm">{runId ? runId.toString() : "—"}</div>
          </div>
          <div className="glass-soft p-4">
            <div className="text-xs text-white/50">Step</div>
            <div className="mt-1 text-2xl font-semibold">{step}</div>
          </div>
          <div className="glass-soft p-4">
            <div className="text-xs text-white/50">Last outcome</div>
            <div className="mt-1 text-lg font-medium">
              {lastOutcome ? (
                <span className={lastOutcome === "SAFE" ? "text-emerald-300" : "text-rose-300"}>
                  {lastOutcome}
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {!runId ? (
            <button className="btn w-full" disabled={!canPlay || busy} onClick={startRun}>
              {busy ? "Starting..." : "Start Run"}
            </button>
          ) : alive ? (
            <TileChoice
              disabled={!canPlay || busy}
              onLeft={() => jump("LEFT")}
              onRight={() => jump("RIGHT")}
              outcome={lastOutcome}
              pendingChoice={pendingChoice}
            />
          ) : (
            <div className="grid gap-3">
              <div className="glass-soft p-4 text-white/70">
                <div className="text-sm">
                  Run ended at step <span className="font-semibold text-white">{step}</span>.
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Leaderboard updates after RunFinished logs are visible to RPC.
                </div>
              </div>
              <button className="btn w-full" disabled={!canPlay || busy} onClick={startRun}>
                {busy ? "Starting..." : "Start New Run"}
              </button>
            </div>
          )}
        </div>

        {(explanation || confidence) && (
          <div className="mt-4 text-sm text-white/60">
            {explanation}{" "}
            <span className="text-white/40">(conf: {confidence.toFixed(2)})</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="glass p-5">
        <Leaderboard />
      </section>
    </>
  );
}
