"use client";

export default function TileChoice({
  disabled,
  onLeft,
  onRight,
  outcome,
  pendingChoice,
}: {
  disabled: boolean;
  onLeft: () => void;
  onRight: () => void;
  outcome: "SAFE" | "FALL" | null;
  pendingChoice: "LEFT" | "RIGHT" | null;
}) {
  return (
    <div className="grid gap-3">
      <div className="text-sm text-white/60">Choose a tile</div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className={[
            "tile",
            pendingChoice === "LEFT" ? "ring-2 ring-white/30" : "",
            outcome ? (outcome === "SAFE" ? "tile-safe" : "tile-fall") : "",
          ].join(" ")}
          disabled={disabled}
          onClick={onLeft}
        >
          LEFT
        </button>

        <button
          className={[
            "tile",
            pendingChoice === "RIGHT" ? "ring-2 ring-white/30" : "",
            outcome ? (outcome === "SAFE" ? "tile-safe" : "tile-fall") : "",
          ].join(" ")}
          disabled={disabled}
          onClick={onRight}
        >
          RIGHT
        </button>
      </div>

      <div className="text-xs text-white/40">
        Animation triggers after the transaction is confirmed.
      </div>
    </div>
  );
}
