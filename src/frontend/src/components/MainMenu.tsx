import React, { useEffect, useState } from "react";
import type { GameMode as GameModeType2 } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import type { GameModeType } from "./GameCanvas";

// GameMode enum values matching the backend enum
const GameMode = {
  freeKick: "freeKick" as GameModeType2,
  penalty: "penalty" as GameModeType2,
  kickoff: "kickoff" as GameModeType2,
};

interface MainMenuProps {
  onStartGame: (mode: GameModeType) => void;
}

interface HighScore {
  score: string;
  mode: string;
  player: string;
}

const MODE_CONFIGS: {
  mode: GameModeType;
  title: string;
  emoji: string;
  description: string;
  detail: string;
  borderColor: string;
  glowColor: string;
}[] = [
  {
    mode: "freeKick",
    title: "Free Kick Madness",
    emoji: "🥅",
    description: "Score as many free kicks as possible in 60 seconds",
    detail: "Aim past the defensive wall, fool the goalkeeper",
    borderColor: "oklch(0.52 0.18 145 / 0.3)",
    glowColor: "oklch(0.52 0.18 145)",
  },
  {
    mode: "penalty",
    title: "Penalty Shootout",
    emoji: "⚽",
    description: "Best of 5 penalties against AI goalkeeper",
    detail: "Sudden death if level after 5 rounds",
    borderColor: "oklch(0.48 0.20 250 / 0.3)",
    glowColor: "oklch(0.48 0.20 250)",
  },
  {
    mode: "kickoff",
    title: "Kickoff Match",
    emoji: "🏆",
    description: "Full 11v11 match — 3 minutes of football",
    detail: "Switch players, pass, and score! AI teammates & opponents",
    borderColor: "oklch(0.78 0.18 85 / 0.3)",
    glowColor: "oklch(0.78 0.18 85)",
  },
];

export function MainMenu({ onStartGame }: MainMenuProps) {
  const { actor } = useActor();
  const [scores, setScores] = useState<HighScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [hoveredMode, setHoveredMode] = useState<GameModeType | null>(null);

  useEffect(() => {
    if (!actor) return;
    async function loadScores() {
      if (!actor) return;
      try {
        const [fk, pen, ko] = await Promise.all([
          actor.getTopScores(GameMode.freeKick),
          actor.getTopScores(GameMode.penalty),
          actor.getTopScores(GameMode.kickoff),
        ]);
        const all: HighScore[] = [
          ...fk.slice(0, 3).map((s) => ({
            score: s.score.toString(),
            mode: "Free Kick",
            player: `${s.player.toString().slice(0, 10)}...`,
          })),
          ...pen.slice(0, 2).map((s) => ({
            score: s.score.toString(),
            mode: "Penalties",
            player: `${s.player.toString().slice(0, 10)}...`,
          })),
          ...ko.slice(0, 2).map((s) => ({
            score: s.score.toString(),
            mode: "Kickoff",
            player: `${s.player.toString().slice(0, 10)}...`,
          })),
        ];
        setScores(all);
      } catch {
        // ignore
      } finally {
        setScoresLoading(false);
      }
    }
    loadScores();
  }, [actor]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "oklch(0.08 0.02 240)",
        fontFamily: '"General Sans", sans-serif',
      }}
    >
      {/* Animated pitch lines background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.15 0.04 145 / 0.4) 0%, transparent 70%)",
        }}
      />

      {/* Pitch grid lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        aria-hidden="true"
      >
        <title>Decorative pitch lines</title>
        <line
          x1="600"
          y1="0"
          x2="600"
          y2="800"
          stroke="white"
          strokeWidth="2"
        />
        <circle
          cx="600"
          cy="400"
          r="100"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <rect
          x="0"
          y="200"
          width="160"
          height="400"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <rect
          x="1040"
          y="200"
          width="160"
          height="400"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <rect
          x="20"
          y="40"
          width="1160"
          height="720"
          fill="none"
          stroke="white"
          strokeWidth="3"
        />
        <circle cx="600" cy="400" r="4" fill="white" />
      </svg>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center animate-fade-in">
          <div className="text-xs font-display font-bold uppercase tracking-[0.3em] text-primary mb-2 opacity-70">
            CAFFEINE SPORTS
          </div>
          <h1
            className="font-display font-black text-white leading-none"
            style={{
              fontSize: "clamp(3rem, 10vw, 6rem)",
              letterSpacing: "-0.02em",
              textShadow:
                "0 0 60px oklch(0.52 0.18 145 / 0.4), 0 4px 20px rgba(0,0,0,0.6)",
            }}
          >
            SOCCER
            <span
              style={{
                display: "block",
                color: "oklch(0.84 0.22 130)",
                textShadow: "0 0 40px oklch(0.84 0.22 130 / 0.5)",
              }}
            >
              3D
            </span>
          </h1>
          <p className="text-white/50 text-sm mt-3 font-body">
            3D football. Three modes. Pure skill.
          </p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full animate-slide-in-up">
          {MODE_CONFIGS.map((cfg, i) => (
            <button
              type="button"
              key={cfg.mode}
              className="mode-card text-left rounded-xl p-5 flex flex-col gap-3 cursor-pointer"
              style={{
                backgroundColor: "oklch(0.13 0.02 240)",
                border: `1px solid ${cfg.borderColor}`,
                boxShadow:
                  hoveredMode === cfg.mode
                    ? `0 0 30px ${cfg.glowColor.replace(")", " / 0.25)")} , 0 8px 32px rgba(0,0,0,0.4)`
                    : "0 4px 16px rgba(0,0,0,0.3)",
                animationDelay: `${100 + i * 80}ms`,
              }}
              onMouseEnter={() => setHoveredMode(cfg.mode)}
              onMouseLeave={() => setHoveredMode(null)}
              onClick={() => onStartGame(cfg.mode)}
              data-ocid={`menu.item.${i + 1}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl">{cfg.emoji}</span>
                <span
                  className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{
                    color: cfg.glowColor,
                    border: `1px solid ${cfg.glowColor.replace(")", " / 0.4)")}`,
                  }}
                >
                  PLAY
                </span>
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-base leading-tight mb-1">
                  {cfg.title}
                </h2>
                <p className="text-white/60 text-xs font-body leading-relaxed">
                  {cfg.description}
                </p>
              </div>
              <p className="text-white/30 text-[11px] font-body italic">
                {cfg.detail}
              </p>
            </button>
          ))}
        </div>

        {/* Controls reference */}
        <div className="animate-slide-in-up w-full">
          <div
            className="rounded-xl p-4 flex flex-wrap justify-center gap-4"
            style={{
              background: "oklch(0.12 0.02 240 / 0.8)",
              border: "1px solid oklch(0.25 0.03 240)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["W", "A", "S", "D"].map((k) => (
                  <kbd
                    key={k}
                    className="text-[11px] font-mono px-2 py-1 rounded"
                    style={{
                      background: "oklch(0.18 0.025 240)",
                      border: "1px solid oklch(0.30 0.03 240)",
                      color: "white",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <span className="text-white/50 text-xs">Move</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd
                className="text-[11px] font-mono px-3 py-1 rounded"
                style={{
                  background: "oklch(0.18 0.025 240)",
                  border: "1px solid oklch(0.30 0.03 240)",
                  color: "white",
                }}
              >
                SPACE
              </kbd>
              <span className="text-white/50 text-xs">Charge &amp; Shoot</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd
                className="text-[11px] font-mono px-2 py-1 rounded"
                style={{
                  background: "oklch(0.18 0.025 240)",
                  border: "1px solid oklch(0.30 0.03 240)",
                  color: "white",
                }}
              >
                TAB
              </kbd>
              <span className="text-white/50 text-xs">Switch Player</span>
            </div>
          </div>
        </div>

        {/* High scores */}
        {!scoresLoading && scores.length > 0 && (
          <div className="animate-slide-in-up w-full" data-ocid="menu.list">
            <h3 className="font-display font-bold uppercase tracking-widest text-xs text-white/40 mb-3 text-center">
              Recent High Scores
            </h3>
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "oklch(0.12 0.02 240 / 0.8)",
                border: "1px solid oklch(0.25 0.03 240)",
              }}
            >
              {scores.slice(0, 5).map((s, i) => (
                <div
                  key={`${s.player}-${s.mode}-${i}`}
                  className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                  style={{ borderColor: "oklch(0.20 0.025 240)" }}
                  data-ocid={`menu.scores.item.${i + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 text-xs font-mono w-4">
                      #{i + 1}
                    </span>
                    <span className="text-white/60 text-xs font-body">
                      {s.player}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "oklch(0.18 0.025 240)",
                        color: "oklch(0.52 0.18 145)",
                      }}
                    >
                      {s.mode}
                    </span>
                  </div>
                  <span className="score-digit text-sm font-bold text-white">
                    {s.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center animate-fade-in">
          <p className="text-white/20 text-[11px] font-body">
            © {new Date().getFullYear()}. Built with{" "}
            <span style={{ color: "oklch(0.60 0.24 25)" }}>♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white/40 transition-colors"
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
