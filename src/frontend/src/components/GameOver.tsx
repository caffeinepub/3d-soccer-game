import React, { useEffect, useState } from "react";
import type { GameMode as GameModeEnumType } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { GameModeType } from "./GameCanvas";

// GameMode enum values matching the backend enum
const GameMode = {
  freeKick: "freeKick" as GameModeEnumType,
  penalty: "penalty" as GameModeEnumType,
  kickoff: "kickoff" as GameModeEnumType,
};

interface GameOverProps {
  mode: GameModeType;
  score: number;
  homeScore?: number;
  awayScore?: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

function getResultText(
  mode: GameModeType,
  score: number,
  homeScore?: number,
  awayScore?: number,
): { headline: string; subline: string; color: string } {
  if (mode === "kickoff") {
    const h = homeScore ?? 0;
    const a = awayScore ?? 0;
    if (h > a)
      return {
        headline: "YOU WIN!",
        subline: `${h} — ${a} Final Score`,
        color: "oklch(0.84 0.22 130)",
      };
    if (h < a)
      return {
        headline: "YOU LOSE",
        subline: `${h} — ${a} Final Score`,
        color: "oklch(0.60 0.24 25)",
      };
    return {
      headline: "DRAW!",
      subline: `${h} — ${a}`,
      color: "oklch(0.78 0.18 85)",
    };
  }
  if (mode === "penalty") {
    return {
      headline: score >= 3 ? "VICTORY!" : "DEFEAT",
      subline: `${score} penalties scored`,
      color: score >= 3 ? "oklch(0.84 0.22 130)" : "oklch(0.60 0.24 25)",
    };
  }
  // Free kick
  return {
    headline: "TIME'S UP!",
    subline: `${score} ${score === 1 ? "goal" : "goals"} scored`,
    color: score >= 5 ? "oklch(0.84 0.22 130)" : "oklch(0.78 0.18 85)",
  };
}

export function GameOver({
  mode,
  score,
  homeScore,
  awayScore,
  onPlayAgain,
  onMainMenu,
}: GameOverProps) {
  const { identity, login, loginStatus } = useInternetIdentity();
  const { actor } = useActor();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { headline, subline, color } = getResultText(
    mode,
    score,
    homeScore,
    awayScore,
  );

  // Auto-submit if authenticated and actor is ready
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only on identity/actor change
  useEffect(() => {
    if (identity && actor && !submitted) {
      submitScore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, actor]);

  async function submitScore() {
    if (submitted || submitting || !actor) return;
    try {
      setSubmitting(true);
      const backendMode =
        mode === "freeKick"
          ? GameMode.freeKick
          : mode === "penalty"
            ? GameMode.penalty
            : GameMode.kickoff;
      await actor.submitHighScore(
        BigInt(score),
        BigInt(Date.now()),
        backendMode,
      );
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  const modeLabel =
    mode === "freeKick"
      ? "Free Kick Madness"
      : mode === "penalty"
        ? "Penalty Shootout"
        : "Kickoff Match";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "oklch(0.08 0.02 240)",
        fontFamily: '"General Sans", sans-serif',
      }}
    >
      {/* Subtle background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${color.replace(")", " / 0.08)")} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md w-full">
        {/* Mode badge */}
        <div
          className="text-[10px] font-display font-bold uppercase tracking-[0.3em] px-3 py-1.5 rounded-full"
          style={{
            background: "oklch(0.14 0.02 240)",
            border: "1px solid oklch(0.25 0.03 240)",
            color: "oklch(0.60 0.025 240)",
          }}
        >
          {modeLabel}
        </div>

        {/* Result */}
        <div className="flex flex-col items-center gap-2 animate-slide-in-up">
          <h1
            className="font-display font-black leading-none"
            style={{
              fontSize: "clamp(3rem, 14vw, 6rem)",
              color,
              letterSpacing: "-0.02em",
              textShadow: `0 0 60px ${color.replace(")", " / 0.5)")}`,
            }}
          >
            {headline}
          </h1>
          <p className="text-white/60 text-lg font-body">{subline}</p>
        </div>

        {/* Score display */}
        {mode === "kickoff" ? (
          <div
            className="rounded-2xl px-8 py-5 flex items-center gap-6 animate-slide-in-up"
            style={{
              background: "oklch(0.13 0.02 240)",
              border: "1px solid oklch(0.22 0.03 240)",
              animationDelay: "100ms",
            }}
            data-ocid="gameover.panel"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-display font-black text-white">
                {homeScore}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#1565c0" }}
                />
                <span className="text-xs text-white/50">YOU</span>
              </div>
            </div>
            <span className="text-white/30 text-2xl font-bold">—</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-display font-black text-white">
                {awayScore}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#c62828" }}
                />
                <span className="text-xs text-white/50">AI</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl px-8 py-5 text-center animate-slide-in-up"
            style={{
              background: "oklch(0.13 0.02 240)",
              border: "1px solid oklch(0.22 0.03 240)",
              animationDelay: "100ms",
            }}
            data-ocid="gameover.panel"
          >
            <span
              className="text-5xl font-display font-black"
              style={{ color }}
            >
              {score}
            </span>
            <p className="text-white/40 text-xs mt-1 font-body">
              {mode === "freeKick" ? "Goals in 60 seconds" : "Penalties scored"}
            </p>
          </div>
        )}

        {/* Submit score */}
        <div
          className="animate-slide-in-up w-full"
          style={{ animationDelay: "200ms" }}
        >
          {!identity ? (
            <button
              className="w-full rounded-xl py-3 text-sm font-display font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "oklch(0.18 0.025 240)",
                border: "1px solid oklch(0.30 0.03 240)",
                color: "oklch(0.60 0.02 240)",
              }}
              type="button"
              onClick={login}
              disabled={loginStatus === "logging-in"}
              data-ocid="gameover.secondary_button"
            >
              {loginStatus === "logging-in"
                ? "Connecting..."
                : "Login to Save Score"}
            </button>
          ) : submitted ? (
            <div
              className="w-full rounded-xl py-3 text-sm font-body text-center"
              style={{ color: "oklch(0.52 0.18 145)" }}
              data-ocid="gameover.success_state"
            >
              ✓ Score saved to leaderboard!
            </div>
          ) : (
            <button
              className="w-full rounded-xl py-3 text-sm font-display font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "oklch(0.52 0.18 145 / 0.2)",
                border: "1px solid oklch(0.52 0.18 145 / 0.4)",
                color: "oklch(0.84 0.22 130)",
              }}
              type="button"
              onClick={submitScore}
              disabled={submitting}
              data-ocid="gameover.submit_button"
            >
              {submitting ? "Saving..." : "Submit Score"}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="flex gap-3 w-full animate-slide-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <button
            className="flex-1 rounded-xl py-3.5 font-display font-bold text-sm uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: color,
              color: "oklch(0.10 0.015 240)",
              boxShadow: `0 4px 20px ${color.replace(")", " / 0.4)")}`,
            }}
            type="button"
            onClick={onPlayAgain}
            data-ocid="gameover.primary_button"
          >
            Play Again
          </button>
          <button
            className="flex-1 rounded-xl py-3.5 font-display font-bold text-sm uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "oklch(0.14 0.02 240)",
              border: "1px solid oklch(0.25 0.03 240)",
              color: "oklch(0.60 0.02 240)",
            }}
            type="button"
            onClick={onMainMenu}
            data-ocid="gameover.cancel_button"
          >
            Main Menu
          </button>
        </div>

        {/* Footer */}
        <footer>
          <p className="text-white/20 text-[11px] font-body">
            © {new Date().getFullYear()}. Built with{" "}
            <span style={{ color: "oklch(0.60 0.24 25)" }}>♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "oklch(0.35 0.025 240)" }}
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
