import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---
interface DuckStats {
  run_level: number;
  run_xp: number;
  fly_level: number;
  fly_xp: number;
  swim_level: number;
  swim_xp: number;
}

type RaceType = "land" | "sky" | "river";
type DuckRPGScreen = "hub" | "race";

interface RaceDuck {
  x: number;
  y: number;
  speed: number;
  color: string;
  name: string;
  isPlayer: boolean;
  finished: boolean;
  finishTime: number;
  bounceT: number;
}

// --- Storage helpers ---
const STORAGE_KEY = "duck_rpg_stats";
const XP_PER_LEVEL = 100;

function loadStats(): DuckStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DuckStats;
  } catch {
    /* ignore */
  }
  return {
    run_level: 1,
    run_xp: 0,
    fly_level: 1,
    fly_xp: 0,
    swim_level: 1,
    swim_xp: 0,
  };
}

function saveStats(stats: DuckStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function addXP(stats: DuckStats, type: RaceType, xp: number): DuckStats {
  const next = { ...stats };
  if (type === "land") {
    next.run_xp += xp;
    while (next.run_xp >= XP_PER_LEVEL && next.run_level < 10) {
      next.run_xp -= XP_PER_LEVEL;
      next.run_level++;
    }
    if (next.run_level >= 10) next.run_xp = 0;
  } else if (type === "sky") {
    next.fly_xp += xp;
    while (next.fly_xp >= XP_PER_LEVEL && next.fly_level < 10) {
      next.fly_xp -= XP_PER_LEVEL;
      next.fly_level++;
    }
    if (next.fly_level >= 10) next.fly_xp = 0;
  } else {
    next.swim_xp += xp;
    while (next.swim_xp >= XP_PER_LEVEL && next.swim_level < 10) {
      next.swim_xp -= XP_PER_LEVEL;
      next.swim_level++;
    }
    if (next.swim_level >= 10) next.swim_xp = 0;
  }
  return next;
}

// --- Race Canvas Component ---
interface RaceCanvasProps {
  raceType: RaceType;
  playerLevel: number;
  onRaceEnd: (position: number) => void;
}

function RaceCanvas({ raceType, playerLevel, onRaceEnd }: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ducks: [] as RaceDuck[],
    raceLength: 800,
    started: false,
    finished: false,
    countdownTimer: 180,
    finishCount: 0,
    t: 0,
    bgOffset: 0,
    reported: false,
  });
  const rafRef = useRef<number>(0);

  const initRace = useCallback(
    (_W: number, H: number) => {
      const aiLevel1 = Math.max(
        1,
        playerLevel - 1 + Math.floor(Math.random() * 3) - 1,
      );
      const aiLevel2 = Math.max(
        1,
        playerLevel + Math.floor(Math.random() * 3) - 1,
      );

      stateRef.current.ducks = [
        {
          x: 60,
          y: H * 0.3,
          speed: 0,
          color: "#ffd700",
          name: "You",
          isPlayer: true,
          finished: false,
          finishTime: Number.POSITIVE_INFINITY,
          bounceT: 0,
        },
        {
          x: 60,
          y: H * 0.5,
          speed: 0,
          color: "#ff6b6b",
          name: "Red Duck",
          isPlayer: false,
          finished: false,
          finishTime: Number.POSITIVE_INFINITY,
          bounceT: 0,
        },
        {
          x: 60,
          y: H * 0.7,
          speed: 0,
          color: "#6bcb77",
          name: "Green Duck",
          isPlayer: false,
          finished: false,
          finishTime: Number.POSITIVE_INFINITY,
          bounceT: 0,
        },
      ];

      // AI speeds
      stateRef.current.ducks[1].speed =
        1.5 + aiLevel1 * 0.3 + Math.random() * 0.5;
      stateRef.current.ducks[2].speed =
        1.5 + aiLevel2 * 0.3 + Math.random() * 0.5;
    },
    [playerLevel],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width;
    const H = canvas.height;
    initRace(W, H);

    const RACE_LENGTH = 700;
    stateRef.current.raceLength = RACE_LENGTH;

    const drawDuck = (duck: RaceDuck, progress: number) => {
      const screenX = 80 + progress * (W - 180);
      const sy = duck.y;
      duck.bounceT += 0.15;
      const bounce = duck.finished ? 0 : Math.abs(Math.sin(duck.bounceT)) * 6;

      ctx.save();
      ctx.translate(screenX, sy - bounce);

      // Duck body
      ctx.fillStyle = duck.color;
      ctx.shadowColor = duck.color;
      ctx.shadowBlur = duck.isPlayer ? 15 : 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Duck head
      ctx.fillStyle = duck.color;
      ctx.beginPath();
      ctx.arc(18, -10, 12, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(22, -13, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(23, -14, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath();
      ctx.moveTo(29, -10);
      ctx.lineTo(38, -8);
      ctx.lineTo(29, -6);
      ctx.closePath();
      ctx.fill();

      // Wings
      const wingAngle = Math.sin(duck.bounceT * 2) * 0.3;
      if (raceType === "sky") {
        // Flapping wings
        ctx.fillStyle = `${duck.color}cc`;
        ctx.save();
        ctx.translate(-5, 0);
        ctx.rotate(-0.3 + wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, -14, 8, 20, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(-5, 0);
        ctx.rotate(0.3 - wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 14, 8, 20, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (raceType === "river") {
        // Swimming legs
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.save();
        ctx.translate(-5, 10);
        ctx.rotate(Math.sin(duck.bounceT * 3) * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 12);
        ctx.moveTo(0, 12);
        ctx.lineTo(-6, 18);
        ctx.moveTo(0, 12);
        ctx.lineTo(6, 18);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(8, 10);
        ctx.rotate(-Math.sin(duck.bounceT * 3) * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 12);
        ctx.moveTo(0, 12);
        ctx.lineTo(-6, 18);
        ctx.moveTo(0, 12);
        ctx.lineTo(6, 18);
        ctx.stroke();
        ctx.restore();
      } else {
        // Running legs
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        const legSwing = Math.sin(duck.bounceT * 4) * 12;
        ctx.save();
        ctx.translate(-5, 14);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-legSwing * 0.5, 14);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(8, 14);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(legSwing * 0.5, 14);
        ctx.stroke();
        ctx.restore();
      }

      // Name label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Sora, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(duck.name, 0, -32);

      if (duck.finished) {
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 8;
        ctx.font = "bold 12px Sora, sans-serif";
        ctx.fillText("✓", 0, -46);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    };

    const drawBackground = () => {
      const bgColors: Record<RaceType, string[]> = {
        land: ["#1a3a0a", "#2a5a1a", "#3a7a2a"],
        sky: ["#0a1a3a", "#0a2a5a", "#1a3a8a"],
        river: ["#0a2a4a", "#0a3a6a", "#0a4a8a"],
      };
      const colors = bgColors[raceType];
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, colors[0]);
      bgGrad.addColorStop(0.5, colors[1]);
      bgGrad.addColorStop(1, colors[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      stateRef.current.bgOffset = (stateRef.current.bgOffset + 2) % 60;
      const off = stateRef.current.bgOffset;

      if (raceType === "land") {
        // Grass stripes
        for (let i = 0; i < 12; i++) {
          const x = ((((i * 60 - off) % (W + 60)) + W + 60) % (W + 60)) - 60;
          if (i % 2 === 0) {
            ctx.fillStyle = "rgba(0,0,0,0.08)";
            ctx.fillRect(x, 0, 60, H);
          }
        }
        // Ground
        ctx.fillStyle = "#4a2a1a";
        ctx.fillRect(0, H * 0.85, W, H * 0.15);
        // Track
        ctx.fillStyle = "#c8a86a";
        ctx.fillRect(0, H * 0.2, W, H * 0.65);
      } else if (raceType === "sky") {
        // Cloud puffs
        for (let i = 0; i < 8; i++) {
          const cx =
            ((((i * 140 - off * 1.5) % (W + 200)) + W + 200) % (W + 200)) - 140;
          const cy = 30 + ((i * 47) % (H * 0.8));
          ctx.fillStyle = "rgba(200,220,255,0.15)";
          for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.arc(cx + j * 30, cy, 30, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // River
        ctx.fillStyle = "#0a2a8a";
        ctx.fillRect(0, H * 0.2, W, H * 0.65);
        // Waves
        ctx.strokeStyle = "rgba(100,180,255,0.2)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const wy = H * 0.2 + i * H * 0.08;
          ctx.beginPath();
          for (let x = 0; x < W; x += 4) {
            const y = wy + Math.sin((x + off * 3) * 0.05) * 5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // Banks
        ctx.fillStyle = "#4a3a1a";
        ctx.fillRect(0, 0, W, H * 0.2);
        ctx.fillRect(0, H * 0.85, W, H * 0.15);
      }
    };

    const gameLoop = () => {
      const s = stateRef.current;
      s.t++;

      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);
      drawBackground();

      // Finish line
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      const finX = 80 + (W - 180);
      ctx.beginPath();
      ctx.moveTo(finX, 0);
      ctx.lineTo(finX, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Sora, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FINISH", finX, 20);

      // Countdown
      if (s.countdownTimer > 0) {
        s.countdownTimer--;
        const cd = Math.ceil(s.countdownTimer / 60);
        ctx.textAlign = "center";
        ctx.fillStyle = cd <= 1 ? "#6bcb77" : "#ffd93d";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.font = "bold 80px Bricolage Grotesque, sans-serif";
        ctx.fillText(cd === 0 ? "GO!" : `${cd}`, W / 2, H / 2);
        ctx.shadowBlur = 0;

        if (s.countdownTimer === 0) s.started = true;
      }

      // Update and draw ducks
      for (const duck of s.ducks) {
        if (s.started && !duck.finished) {
          if (duck.isPlayer) {
            duck.x += 1.5 + playerLevel * 0.35 + Math.random() * 0.2;
          } else {
            duck.x += duck.speed + Math.random() * 0.3;
          }

          if (duck.x >= RACE_LENGTH) {
            duck.finished = true;
            duck.x = RACE_LENGTH;
            duck.finishTime = s.t;
            s.finishCount++;

            if (duck.isPlayer && !s.reported) {
              s.reported = true;
              const pos = s.finishCount;
              setTimeout(() => onRaceEnd(pos), 1500);
            }
          }
        }

        const progress = Math.min(duck.x / RACE_LENGTH, 1);
        drawDuck(duck, progress);
      }

      // All finished
      if (!s.finished && s.ducks.every((d) => d.finished)) {
        s.finished = true;
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [raceType, playerLevel, onRaceEnd, initRace]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

// --- Main Duck RPG Component ---
export default function DuckRPG() {
  const [stats, setStats] = useState<DuckStats>(loadStats);
  const [screen, setScreen] = useState<DuckRPGScreen>("hub");
  const [raceType, setRaceType] = useState<RaceType>("land");
  const [lastResult, setLastResult] = useState<{
    pos: number;
    xp: number;
    type: RaceType;
  } | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<string | null>(null);

  const handleRaceEnd = useCallback(
    (position: number) => {
      const xpGained = position === 1 ? 50 : position === 2 ? 25 : 10;
      const oldStats = loadStats();
      const newStats = addXP(oldStats, raceType, xpGained);

      // Detect level up
      if (
        (raceType === "land" && newStats.run_level > oldStats.run_level) ||
        (raceType === "sky" && newStats.fly_level > oldStats.fly_level) ||
        (raceType === "river" && newStats.swim_level > oldStats.swim_level)
      ) {
        const abil =
          raceType === "land" ? "Run" : raceType === "sky" ? "Fly" : "Swim";
        const lvl =
          raceType === "land"
            ? newStats.run_level
            : raceType === "sky"
              ? newStats.fly_level
              : newStats.swim_level;
        setShowLevelUp(`${abil} Lv.${lvl}!`);
        setTimeout(() => setShowLevelUp(null), 3000);
      }

      saveStats(newStats);
      setStats(newStats);
      setLastResult({ pos: position, xp: xpGained, type: raceType });
    },
    [raceType],
  );

  const startRace = useCallback((type: RaceType) => {
    setRaceType(type);
    setLastResult(null);
    setScreen("race");
  }, []);

  const getPlayerLevel = () => {
    if (raceType === "land") return stats.run_level;
    if (raceType === "sky") return stats.fly_level;
    return stats.swim_level;
  };

  const resetStats = useCallback(() => {
    if (confirm("Reset all duck stats?")) {
      const fresh = {
        run_level: 1,
        run_xp: 0,
        fly_level: 1,
        fly_xp: 0,
        swim_level: 1,
        swim_xp: 0,
      };
      saveStats(fresh);
      setStats(fresh);
    }
  }, []);

  const positionLabel = (pos: number) => {
    if (pos === 1) return "🥇 1st Place!";
    if (pos === 2) return "🥈 2nd Place";
    return "🥉 3rd Place";
  };

  const StatBar = ({
    label,
    level,
    xp,
    color,
  }: { label: string; level: number; xp: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold" style={{ color }}>
          {label}
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Lv.{level} {level < 10 ? `(${xp}/${XP_PER_LEVEL} XP)` : "(MAX)"}
        </span>
      </div>
      <div className="stat-bar-bg h-3 w-full rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 stat-bar-${label.toLowerCase()}`}
          style={{
            width: `${level < 10 ? (xp / XP_PER_LEVEL) * 100 : 100}%`,
            minWidth: "4px",
          }}
        />
      </div>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pip) => (
          <div
            key={pip}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: pip <= level ? color : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>
    </div>
  );

  if (screen === "race") {
    return (
      <div className="relative w-full h-full flex flex-col">
        <div className="game-overlay-header">
          <div className="flex items-center gap-3">
            <span
              className="text-lg font-bold"
              style={{
                color:
                  raceType === "land"
                    ? "#80e860"
                    : raceType === "sky"
                      ? "#60b0ff"
                      : "#60d0ff",
              }}
            >
              {raceType === "land"
                ? "🏃 Land Race"
                : raceType === "sky"
                  ? "✈️ Sky Race"
                  : "🌊 River Race"}
            </span>
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Your{" "}
              {raceType === "land"
                ? "Run"
                : raceType === "sky"
                  ? "Fly"
                  : "Swim"}{" "}
              Lv.{getPlayerLevel()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setScreen("hub")}
            className="text-sm px-3 py-1 rounded"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
          >
            ← Back to Duck Hub
          </button>
        </div>
        <div className="flex-1 relative">
          <RaceCanvas
            raceType={raceType}
            playerLevel={getPlayerLevel()}
            onRaceEnd={handleRaceEnd}
          />

          {lastResult && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <div
                className="text-center p-8 rounded-2xl"
                style={{
                  background: "rgba(10,10,30,0.95)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div className="text-5xl mb-3">
                  {positionLabel(lastResult.pos)}
                </div>
                <div
                  className="text-2xl font-bold mb-2"
                  style={{ color: "#ffd93d" }}
                >
                  +{lastResult.xp} XP
                </div>
                <div
                  className="text-sm mb-6"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {raceType === "land"
                    ? "Run"
                    : raceType === "sky"
                      ? "Fly"
                      : "Swim"}{" "}
                  XP gained!
                </div>
                {showLevelUp && (
                  <div
                    className="text-3xl font-bold mb-4 animate-pulse-cyan"
                    style={{ color: "#82e6ff" }}
                  >
                    ⬆️ LEVEL UP: {showLevelUp}
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setLastResult(null);
                      setScreen("race");
                    }}
                    className="play-btn px-5 py-2 rounded-lg"
                  >
                    Race Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen("hub")}
                    className="px-5 py-2 rounded-lg font-bold"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                  >
                    Duck Hub
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-y-auto p-6"
      style={{
        background: "linear-gradient(135deg, #0a0a1a, #0a1a2a, #0a0a1a)",
      }}
    >
      {/* Level up notification */}
      {showLevelUp && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 text-center">
          <div
            className="px-8 py-4 rounded-2xl text-2xl font-bold"
            style={{
              background:
                "linear-gradient(135deg, rgba(130,230,255,0.2), rgba(100,200,255,0.1))",
              border: "2px solid #82e6ff",
              boxShadow: "0 0 40px rgba(130,230,255,0.4)",
              color: "#82e6ff",
              animation: "pulseCyan 0.5s ease infinite",
            }}
          >
            ⬆️ LEVEL UP! {showLevelUp}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🦆</div>
        <h2
          className="text-3xl font-bold mb-1"
          style={{
            color: "#ffd93d",
            fontFamily: "Bricolage Grotesque, sans-serif",
          }}
        >
          Duck Dash RPG
        </h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Train your duck. Compete in races. Become the champion!
        </p>
      </div>

      {/* Duck card */}
      <div className="max-w-sm mx-auto mb-6 duck-stat-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl">🦆</div>
          <div>
            <div className="font-bold text-lg" style={{ color: "#ffd93d" }}>
              Your Duck
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Avg Level:{" "}
              {Math.round(
                (stats.run_level + stats.fly_level + stats.swim_level) / 3,
              )}
            </div>
          </div>
        </div>
        <StatBar
          label="Run"
          level={stats.run_level}
          xp={stats.run_xp}
          color="#80e860"
        />
        <StatBar
          label="Fly"
          level={stats.fly_level}
          xp={stats.fly_xp}
          color="#60b0ff"
        />
        <StatBar
          label="Swim"
          level={stats.swim_level}
          xp={stats.swim_xp}
          color="#60d0ff"
        />
        <button
          type="button"
          onClick={resetStats}
          className="mt-3 text-xs px-3 py-1 rounded"
          style={{
            background: "rgba(255,68,68,0.15)",
            color: "rgba(255,100,100,0.8)",
            border: "1px solid rgba(255,68,68,0.2)",
          }}
        >
          Reset Duck
        </button>
      </div>

      {/* Race buttons */}
      <div className="max-w-sm mx-auto space-y-3">
        <div
          className="text-center text-sm font-bold mb-4"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Choose a Race Mode:
        </div>

        <button
          type="button"
          data-ocid="duck_rpg.land_race_button"
          onClick={() => startRace("land")}
          className="w-full p-4 rounded-xl font-bold text-left flex items-center gap-4 transition-all duration-200 hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, rgba(128,232,96,0.15), rgba(64,160,32,0.1))",
            border: "1px solid rgba(128,232,96,0.3)",
            color: "#80e860",
          }}
        >
          <span className="text-3xl">🏃</span>
          <div>
            <div className="text-lg">Land Race</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Run ability matters • Lv.{stats.run_level} • {stats.run_xp}/
              {XP_PER_LEVEL} XP
            </div>
          </div>
        </button>

        <button
          type="button"
          data-ocid="duck_rpg.sky_race_button"
          onClick={() => startRace("sky")}
          className="w-full p-4 rounded-xl font-bold text-left flex items-center gap-4 transition-all duration-200 hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, rgba(96,176,255,0.15), rgba(32,96,200,0.1))",
            border: "1px solid rgba(96,176,255,0.3)",
            color: "#60b0ff",
          }}
        >
          <span className="text-3xl">✈️</span>
          <div>
            <div className="text-lg">Sky Race</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Fly ability matters • Lv.{stats.fly_level} • {stats.fly_xp}/
              {XP_PER_LEVEL} XP
            </div>
          </div>
        </button>

        <button
          type="button"
          data-ocid="duck_rpg.river_race_button"
          onClick={() => startRace("river")}
          className="w-full p-4 rounded-xl font-bold text-left flex items-center gap-4 transition-all duration-200 hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg, rgba(96,208,255,0.15), rgba(32,128,200,0.1))",
            border: "1px solid rgba(96,208,255,0.3)",
            color: "#60d0ff",
          }}
        >
          <span className="text-3xl">🌊</span>
          <div>
            <div className="text-lg">River Race</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Swim ability matters • Lv.{stats.swim_level} • {stats.swim_xp}/
              {XP_PER_LEVEL} XP
            </div>
          </div>
        </button>

        {/* XP Legend */}
        <div
          className="mt-4 p-3 rounded-lg text-xs text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          🥇 1st = 50 XP &nbsp;|&nbsp; 🥈 2nd = 25 XP &nbsp;|&nbsp; 🥉 3rd = 10
          XP
          <br />
          100 XP per level · Max Level 10
        </div>
      </div>
    </div>
  );
}
