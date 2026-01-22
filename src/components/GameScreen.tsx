"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, createPublicClient, createWalletClient, custom } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { genlayerChain } from "@/lib/viem";
import { glassRunAbi, hasValidContractAddress, getContractAddress } from "@/lib/contract";
import TileChoice from "./TileChoice";
import Leaderboard from "./Leaderboard";

type Outcome = "SAFE" | "FALL";

export default function GameScreen() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const [runId, setRunId] = useState<bigint | null>(null);
  const [step, setStep] = useState(0);
  const [alive, setAlive] = useState(false);

  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [explanation, setExplanation] = useState("");
  const [confidence, setConfidence] = useState(0);

  const [pendingChoice, setPendingChoice] = useState<"LEFT" | "RIGHT" | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasContract = hasValidContractAddress();
  const contractAddress = useMemo(() => getContractAddress(), []);
  const hasProvider = typeof window !== "undefined" && !!(window as any).ethereum;

  const canPlay = isConnected && hasContract && hasProvider && !!address;

  const getClients = useCallback(() => {
    const eth = (window as any).ethereum;
    const publicClient = createPublicClient({ chain: genlayerChain, transport: custom(eth) });
    const walletClient = createWalletClient({ chain: genlayerChain, transport: custom(eth) });
    return { publicClient, walletClient };
  }, []);

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
    if (!canPlay || !address) return;

    setBusy(true);
    setError("");

    try {
      await ensureChain();

      const { publicClient, walletClient } = getClients();

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: glassRunAbi,
        functionName: "start_run",
        args: [],
        account: address as Address,
        chain: genlayerChain,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const active = await publicClient.readContract({
        address: contractAddress,
        abi: glassRunAbi,
        functionName: "get_active_run",
        args: [address as Address],
      });

      const rid = typeof active === "bigint" ? active : 0n;
      if (rid === 0n) throw new Error("No active run");

      resetUiForRun(rid);
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        e?.data?.message ||
        e?.data?.originalError?.message ||
        "Failed to start run";
      setError(msg);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [address, canPlay, contractAddress, ensureChain, getClients, resetUiForRun]);

  const jump = useCallback(
    async (choice: "LEFT" | "RIGHT") => {
      if (!canPlay || !runId || !alive || !address) return;

      setBusy(true);
      setError("");
      setLastOutcome(null);
      setPendingChoice(choice);

      try {
        await ensureChain();

        const { publicClient, walletClient } = getClients();
        const nextStep = step + 1;

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: glassRunAbi,
          functionName: "jump",
          args: [runId, nextStep, choice],
          account: address as Address,
          chain: genlayerChain,
        });

        await publicClient.waitForTransactionReceipt({ hash });

        const last = await publicClient.readContract({
          address: contractAddress,
          abi: glassRunAbi,
          functionName: "get_last_jump",
          args: [runId],
        });

        const outcomeCode = Number((last as any)[0] ?? 0);
        const rollBp = Number((last as any)[1] ?? 0);
        const pFallBp = Number((last as any)[2] ?? 0);
        const confBp = Number((last as any)[3] ?? 0);
        const newStep = Number((last as any)[4] ?? 0);
        const newAlive = Boolean((last as any)[5] ?? false);

        const outcome: Outcome = outcomeCode === 2 ? "FALL" : "SAFE";
        const expl = `roll_bp=${rollBp} vs p_fall_bp=${pFallBp}`;

        setLastOutcome(outcome);
        setExplanation(expl);
        setConfidence(confBp / 10000);
        setStep(newStep);
        setAlive(newAlive);
      } catch (e: any) {
        const msg =
          e?.shortMessage ||
          e?.message ||
          e?.data?.message ||
          e?.data?.originalError?.message ||
          "Jump failed";
        setError(msg);
        console.error(e);
      } finally {
        setBusy(false);
        setPendingChoice(null);
      }
    },
    [address, alive, canPlay, contractAddress, ensureChain, getClients, runId, step]
  );

  useEffect(() => {
    (async () => {
      if (!isConnected || !address || !hasContract || !hasProvider) return;

      try {
        const { publicClient } = getClients();

        const active = await publicClient.readContract({
          address: contractAddress,
          abi: glassRunAbi,
          functionName: "get_active_run",
          args: [address as Address],
        });

        const rid = typeof active === "bigint" ? active : 0n;
        if (rid === 0n) return;

        const st = await publicClient.readContract({
          address: contractAddress,
          abi: glassRunAbi,
          functionName: "get_run",
          args: [rid],
        });

        setRunId(rid);
        setStep(Number((st as any)[2] ?? 0));
        setAlive(Boolean((st as any)[4] ?? false));
      } catch {}
    })();
  }, [address, contractAddress, getClients, hasContract, hasProvider, isConnected]);

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

  const missing = useMemo(() => {
    const parts: string[] = [];
    if (!hasContract) parts.push("contract");
    if (!isConnected) parts.push("wallet");
    if (!hasProvider) parts.push("provider");
    if (!address) parts.push("address");
    return parts.join(", ");
  }, [address, hasContract, hasProvider, isConnected]);

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

        {!canPlay && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Cannot play: {missing || "unknown"}
          </div>
        )}

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
              </div>
              <button className="btn w-full" disabled={!canPlay || busy} onClick={startRun}>
                {busy ? "Starting..." : "Start New Run"}
              </button>
            </div>
          )}
        </div>

        {(explanation || confidence) && (
          <div className="mt-4 text-sm text-white/60">
            {explanation} <span className="text-white/40">(conf: {confidence.toFixed(2)})</span>
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
