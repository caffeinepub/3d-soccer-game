import React from "react";

export type GameMode = "freeKick" | "penalty" | "kickoff";

interface HUDProps {
  mode: GameMode;
  // Common
  powerBar: number; // 0 to 1
  isCharging: boolean;

  // Free kick / kickoff
  homeScore?: number;
  awayScore?: number;
  timeRemaining?: number;
  roundMessage?: string;

  // Penalty
  playerScore?: number;
  aiScore?: number;
  round?: number;
  maxRounds?: number;
  isPlayerTurn?: boolean;
  penaltyMessage?: string;
  suddenDeath?: boolean;

  // Kickoff
  controlledPlayerNumber?: number;

  // Penalty keeper mode
  isPlayerKeeping?: boolean;

  onSwitchPlayer?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getPowerBarColor(power: number): string {
  if (power < 0.5) return "#4caf50";
  if (power < 0.8) return "#ffeb3b";
  return "#f44336";
}

export function HUD({
  mode,
  powerBar,
  isCharging,
  homeScore = 0,
  awayScore = 0,
  timeRemaining = 0,
  roundMessage = "",
  playerScore = 0,
  aiScore = 0,
  round = 1,
  maxRounds = 5,
  isPlayerTurn = true,
  penaltyMessage = "",
  suddenDeath = false,
  controlledPlayerNumber = 1,
  isPlayerKeeping = false,
  onSwitchPlayer,
}: HUDProps) {
  const powerPercent = Math.round(powerBar * 100);
  const barColor = getPowerBarColor(powerBar);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ zIndex: 10 }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3 gap-2">
        {/* Mode label */}
        <div className="hud-panel px-3 py-1.5 min-w-[120px]">
          <span className="text-xs font-display font-bold uppercase tracking-widest text-primary">
            {mode === "freeKick"
              ? "FREE KICK"
              : mode === "penalty"
                ? "PENALTIES"
                : "MATCH"}
          </span>
        </div>

        {/* Score */}
        {mode === "kickoff" && (
          <div
            className="hud-panel px-4 py-1.5 flex items-center gap-3"
            data-ocid="hud.panel"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "#1565c0" }}
              />
              <span className="score-digit text-xl text-white">
                {homeScore}
              </span>
            </div>
            <span className="text-muted-foreground font-bold">—</span>
            <div className="flex items-center gap-2">
              <span className="score-digit text-xl text-white">
                {awayScore}
              </span>
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "#c62828" }}
              />
            </div>
          </div>
        )}

        {mode === "freeKick" && (
          <div className="hud-panel px-4 py-1.5 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="score-digit text-2xl font-bold text-white">
              {homeScore}
            </span>
          </div>
        )}

        {mode === "penalty" && (
          <div className="hud-panel px-4 py-2 flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#1565c0" }}
                />
                <span className="score-digit text-xl text-white">
                  {playerScore}
                </span>
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="flex items-center gap-1.5">
                <span className="score-digit text-xl text-white">
                  {aiScore}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "#c62828" }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {suddenDeath ? "SUDDEN DEATH" : `Round ${round} / ${maxRounds}`}
            </span>
          </div>
        )}

        {/* Timer */}
        {(mode === "kickoff" || mode === "freeKick") && (
          <div className="hud-panel px-3 py-1.5 min-w-[80px] text-right">
            <span
              className={`score-digit text-lg font-bold ${timeRemaining < 10 ? "text-destructive" : "text-white"}`}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {mode === "penalty" && (
          <div
            className="hud-panel px-3 py-1.5 min-w-[100px] text-center"
            style={{
              borderColor: isPlayerTurn
                ? "#1565c0"
                : isPlayerKeeping
                  ? "#ffd600"
                  : "#c62828",
              borderWidth: 2,
            }}
          >
            <span
              className="text-xs font-display font-bold uppercase tracking-wide"
              style={{
                color: isPlayerTurn
                  ? "#90caf9"
                  : isPlayerKeeping
                    ? "#ffd600"
                    : "#ef9a9a",
              }}
            >
              {isPlayerTurn
                ? "YOUR KICK"
                : isPlayerKeeping
                  ? "YOU KEEP"
                  : "AI KICK"}
            </span>
          </div>
        )}
      </div>

      {/* Round message */}
      {(roundMessage || penaltyMessage) && (
        <div className="absolute top-16 left-0 right-0 flex justify-center">
          <div className="hud-panel px-5 py-2 text-center max-w-sm">
            <p className="text-sm font-body text-white/90">
              {mode === "penalty" ? penaltyMessage : roundMessage}
            </p>
          </div>
        </div>
      )}

      {/* Power bar — bottom left (hidden when player is the keeper) */}
      <div
        className={`absolute bottom-6 left-4 flex flex-col items-start gap-2 ${isPlayerKeeping ? "hidden" : ""}`}
      >
        <div className="hud-panel p-3 flex flex-col items-start gap-2 min-w-[140px]">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">
              Power
            </span>
            <span
              className="text-xs font-display font-bold"
              style={{ color: barColor }}
            >
              {isCharging ? `${powerPercent}%` : "Hold SPACE"}
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ background: "oklch(0.18 0.025 240)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${powerPercent}%`,
                background: barColor,
                boxShadow: isCharging ? `0 0 8px ${barColor}` : "none",
              }}
            />
          </div>

          {/* Shoot hint */}
          <div className="flex gap-2 mt-0.5">
            <kbd className="text-[10px] bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white/60 font-mono">
              SPACE
            </kbd>
            <span className="text-[10px] text-white/50">
              charge &amp; release
            </span>
          </div>
        </div>

        {/* Controls hint */}
        {mode === "kickoff" ? (
          <div className="hud-panel px-3 py-1.5 flex gap-2 text-[10px] text-white/40">
            <kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5 font-mono">
              WASD / ↑↓←→
            </kbd>
            <span>move</span>
          </div>
        ) : (
          <div className="hud-panel px-3 py-1.5 flex flex-col gap-1 text-[10px] text-white/40">
            <div className="flex gap-2 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5 font-mono">
                ↑↓←→
              </kbd>
              <span>aim</span>
            </div>
            <div className="flex gap-2 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5 font-mono">
                WASD
              </kbd>
              <span>move</span>
            </div>
          </div>
        )}
      </div>

      {/* Player switch — bottom right */}
      {mode === "kickoff" && (
        <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2 pointer-events-auto">
          <button
            type="button"
            className="hud-panel px-4 py-2 flex items-center gap-2 cursor-pointer hover:border-primary/60 transition-colors"
            onClick={onSwitchPlayer}
            data-ocid="hud.secondary_button"
          >
            <span className="text-xs font-display font-bold text-white/80 uppercase tracking-wide">
              Switch Player
            </span>
            <kbd className="text-[10px] bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white/60 font-mono">
              TAB
            </kbd>
          </button>
          <div className="hud-panel px-3 py-1 text-[10px] text-white/40">
            Controlling #{controlledPlayerNumber}
          </div>
        </div>
      )}

      {/* Free kick aim hint */}
      {mode === "freeKick" && (
        <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2">
          <div className="hud-panel px-3 py-2 flex flex-col gap-1.5">
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                ← →
              </kbd>
              <span>Aim left / right</span>
            </div>
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                ↑ ↓
              </kbd>
              <span>Aim high / low</span>
            </div>
          </div>
        </div>
      )}

      {/* Penalty controls hint */}
      {mode === "penalty" && isPlayerTurn && !isPlayerKeeping && (
        <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2">
          <div className="hud-panel px-3 py-2 flex flex-col gap-1.5">
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                ← →
              </kbd>
              <span>Aim left / right</span>
            </div>
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                ↑ ↓
              </kbd>
              <span>Aim high / low</span>
            </div>
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                SPACE
              </kbd>
              <span>Power &amp; shoot</span>
            </div>
          </div>
        </div>
      )}

      {/* Penalty keeper controls */}
      {mode === "penalty" && isPlayerKeeping && (
        <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2">
          <div
            className="hud-panel px-3 py-2 flex flex-col gap-1.5"
            style={{ borderColor: "#ffd600", borderWidth: 1 }}
          >
            <p className="text-[10px] font-bold text-yellow-300 uppercase tracking-wide mb-0.5">
              You are the keeper!
            </p>
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                A / D
              </kbd>
              <span>Dive left / right</span>
            </div>
            <div className="flex gap-2 text-[10px] text-white/60 items-center">
              <kbd className="bg-white/10 border border-white/20 rounded px-1.5 py-0.5 font-mono">
                W / S
              </kbd>
              <span>Move forward / back</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
