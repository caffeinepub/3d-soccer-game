import React, { useState, useEffect, useRef, lazy, Suspense } from "react";

const GeometryDash = lazy(() => import("./games/GeometryDash"));
const WaveDash = lazy(() => import("./games/WaveDash"));
const Basketball = lazy(() => import("./games/Basketball"));
const Baseball = lazy(() => import("./games/Baseball"));
const Football = lazy(() => import("./games/Football"));
const Soccer = lazy(() => import("./games/Soccer"));
const Skateboard = lazy(() => import("./games/Skateboard"));
const CarRacing = lazy(() => import("./games/CarRacing"));
const Bike = lazy(() => import("./games/Bike"));
const Plane = lazy(() => import("./games/Plane"));
const DuckRPG = lazy(() => import("./games/DuckRPG"));

// --- High Score Storage ---
const HS_KEY = "gamezone_highscores";
type Scores = Record<string, number>;

function loadScores(): Scores {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (raw) return JSON.parse(raw) as Scores;
  } catch {
    /* ignore */
  }
  return {};
}

function saveScore(gameId: string, score: number) {
  const scores = loadScores();
  if (!scores[gameId] || score > scores[gameId]) {
    scores[gameId] = score;
    localStorage.setItem(HS_KEY, JSON.stringify(scores));
  }
}

// --- Thumbnail drawing ---
function drawThumbnail(canvas: HTMLCanvasElement, gameId: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const clear = (bg: string) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  };

  switch (gameId) {
    case "geometry_dash": {
      clear("#0a0a1a");
      // Grid
      ctx.strokeStyle = "rgba(77,150,255,0.1)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // Ground
      ctx.fillStyle = "#1a1a3a";
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
      // Cube
      const grad = ctx.createLinearGradient(
        W * 0.2,
        H * 0.3,
        W * 0.45,
        H * 0.65,
      );
      grad.addColorStop(0, "#4d96ff");
      grad.addColorStop(1, "#ff6bff");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(W * 0.2, H * 0.38, W * 0.25, H * 0.32, 3);
      ctx.fill();
      // Spike
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ff6b6b";
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.65, H * 0.7);
      ctx.lineTo(W * 0.72, H * 0.45);
      ctx.lineTo(W * 0.79, H * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case "wave_dash": {
      clear("#0d0015");
      // Wave trail
      ctx.strokeStyle = "#ff9fff";
      ctx.shadowColor = "#ff9fff";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < W; x += 2) {
        const y = H / 2 + Math.sin(x * 0.12) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Triangle
      ctx.fillStyle = "#ff2dff";
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(W * 0.5 + 10, H / 2 + Math.sin(0.5 * W * 0.12) * 16);
      ctx.lineTo(W * 0.5 - 6, H / 2 + Math.sin(0.5 * W * 0.12) * 16 - 8);
      ctx.lineTo(W * 0.5 - 6, H / 2 + Math.sin(0.5 * W * 0.12) * 16 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Spike corridors
      ctx.fillStyle = "#1a0028";
      ctx.fillRect(0, 0, W, H * 0.2);
      ctx.fillRect(0, H * 0.8, W, H * 0.2);
      ctx.strokeStyle = "#ff2dff";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.2);
      ctx.lineTo(W, H * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, H * 0.8);
      ctx.lineTo(W, H * 0.8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case "basketball": {
      clear("#1a0a00");
      // Court
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
      // Hoop
      ctx.strokeStyle = "#ff6600";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.55, H * 0.35);
      ctx.lineTo(W * 0.85, H * 0.35);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Backboard
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(W * 0.82, H * 0.15, 8, H * 0.3);
      // Ball
      ctx.fillStyle = "#ff7700";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(W * 0.25, H * 0.55, W * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#8b2500";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W * 0.13, H * 0.55);
      ctx.lineTo(W * 0.37, H * 0.55);
      ctx.stroke();
      break;
    }
    case "baseball": {
      clear("#001a33");
      // Field
      ctx.fillStyle = "#2d5a1b";
      ctx.fillRect(0, H * 0.5, W, H * 0.5);
      ctx.fillStyle = "#8b6914";
      ctx.beginPath();
      ctx.arc(W * 0.4, H, W * 0.3, 0, Math.PI, true);
      ctx.fill();
      // Ball
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(W * 0.6, H * 0.35, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#cc2200";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(W * 0.58, H * 0.33, 7, -0.5, 0.8);
      ctx.stroke();
      // Bat
      ctx.fillStyle = "#8b4513";
      ctx.save();
      ctx.translate(W * 0.2, H * 0.6);
      ctx.rotate(-0.4);
      ctx.fillRect(-4, -30, 8, 42);
      ctx.beginPath();
      ctx.arc(0, -30, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "football": {
      clear("#1a5c0a");
      // Field stripes
      for (let i = 0; i < 5; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.fillRect(i * (W / 5), 0, W / 5, H);
        }
      }
      // Hash marks
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      for (let y = H * 0.2; y < H; y += 15) {
        ctx.beginPath();
        ctx.moveTo(W * 0.35 - 5, y);
        ctx.lineTo(W * 0.35 + 5, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W * 0.65 - 5, y);
        ctx.lineTo(W * 0.65 + 5, y);
        ctx.stroke();
      }
      // Football
      ctx.fillStyle = "#8b4513";
      ctx.shadowColor = "#ff9f1c";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.45, 18, 11, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, H * 0.45);
      ctx.lineTo(W * 0.58, H * 0.45);
      ctx.stroke();
      // Players
      ctx.fillStyle = "#003087";
      ctx.beginPath();
      ctx.arc(W * 0.35, H * 0.3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#aa0000";
      ctx.beginPath();
      ctx.arc(W * 0.65, H * 0.3, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "soccer": {
      clear("#0d1f0d");
      // Goal
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 4;
      ctx.strokeRect(W * 0.2, H * 0.1, W * 0.6, H * 0.45);
      ctx.shadowBlur = 0;
      // Ball
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.73, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const bx = W / 2 + Math.cos(a) * 7;
        const by = H * 0.73 + Math.sin(a) * 7;
        ctx.moveTo(bx, by);
        ctx.lineTo(W / 2, H * 0.73);
      }
      ctx.stroke();
      break;
    }
    case "skateboard": {
      clear("#0a0f1a");
      // Board
      ctx.fillStyle = "#4d96ff";
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 8;
      ctx.fillRect(W * 0.25, H * 0.55, W * 0.5, 10);
      ctx.shadowBlur = 0;
      // Wheels
      ctx.fillStyle = "#ddd";
      ctx.beginPath();
      ctx.arc(W * 0.32, H * 0.55 + 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W * 0.68, H * 0.55 + 12, 8, 0, Math.PI * 2);
      ctx.fill();
      // Rider silhouette
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.roundRect(W * 0.42, H * 0.3, 16, 26, 3);
      ctx.fill();
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.25, 10, 0, Math.PI * 2);
      ctx.fill();
      // Ramp
      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.moveTo(W * 0.7, H * 0.65);
      ctx.lineTo(W, H * 0.65);
      ctx.lineTo(W, H * 0.38);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "car_racing": {
      clear("#0a0a15");
      // Road
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(W * 0.25, H);
      ctx.lineTo(W * 0.75, H);
      ctx.lineTo(W * 0.6, 0);
      ctx.lineTo(W * 0.4, 0);
      ctx.closePath();
      ctx.fill();
      // Dashes
      ctx.strokeStyle = "#ffd93d";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      // Car
      ctx.fillStyle = "#00aaff";
      ctx.shadowColor = "#00aaff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(W * 0.43, H * 0.5, 32, 52, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(150,200,255,0.5)";
      ctx.beginPath();
      ctx.roundRect(W * 0.46, H * 0.52, 22, 18, 3);
      ctx.fill();
      break;
    }
    case "bike": {
      clear("#0a0520");
      // Hills
      ctx.fillStyle = "#1a0a3a";
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * 0.6);
      ctx.quadraticCurveTo(W * 0.3, H * 0.3, W * 0.6, H * 0.6);
      ctx.lineTo(W * 0.6, H);
      ctx.closePath();
      ctx.fill();
      // Bike frame
      ctx.strokeStyle = "#ff9f1c";
      ctx.shadowColor = "#ff9f1c";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.3, H * 0.52);
      ctx.lineTo(W * 0.45, H * 0.38);
      ctx.lineTo(W * 0.6, H * 0.52);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * 0.3, H * 0.52);
      ctx.lineTo(W * 0.6, H * 0.52);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Wheels
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W * 0.3, H * 0.52, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W * 0.6, H * 0.52, 14, 0, Math.PI * 2);
      ctx.stroke();
      // Rider
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(W * 0.45, H * 0.3, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4d96ff";
      ctx.beginPath();
      ctx.arc(W * 0.45, H * 0.25, 12, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "plane": {
      clear("#0a0a2a");
      // Stars
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = "rgba(255,255,200,0.5)";
        ctx.beginPath();
        ctx.arc((i * 83) % W, (i * 61) % (H * 0.7), 1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mountains
      ctx.fillStyle = "#2a1a0a";
      ctx.beginPath();
      ctx.moveTo(W * 0.7, H);
      ctx.lineTo(W * 0.82, H * 0.45);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      // Plane
      ctx.fillStyle = "#4d96ff";
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(W * 0.38, H * 0.42, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#2266cc";
      ctx.beginPath();
      ctx.moveTo(W * 0.35, H * 0.42);
      ctx.lineTo(W * 0.22, H * 0.28);
      ctx.lineTo(W * 0.1, H * 0.28);
      ctx.lineTo(W * 0.22, H * 0.42);
      ctx.closePath();
      ctx.fill();
      // Trail
      ctx.strokeStyle = "rgba(255,150,50,0.6)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.42);
      ctx.lineTo(W * 0.0, H * 0.42);
      ctx.stroke();
      break;
    }
    case "duck_rpg": {
      clear("#0a1a2a");
      // Finish line stripes
      ctx.fillStyle = "#ffd93d";
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = "#ffd93d";
          ctx.fillRect(W * 0.82, i * (H / 4), W * 0.08, H / 4);
        }
      }
      ctx.fillStyle = "#000";
      for (let i = 0; i < 4; i++) {
        if (i % 2 !== 0) {
          ctx.fillRect(W * 0.82, i * (H / 4), W * 0.08, H / 4);
        }
      }
      // Tracks
      ctx.fillStyle = "#1a3a1a";
      ctx.fillRect(0, H * 0.18, W * 0.85, H * 0.2);
      ctx.fillRect(0, H * 0.42, W * 0.85, H * 0.2);
      ctx.fillRect(0, H * 0.66, W * 0.85, H * 0.2);
      // Ducks
      const duckColors = ["#ffd700", "#ff6b6b", "#6bcb77"];
      const duckX = [0.45, 0.3, 0.55];
      const duckY = [H * 0.25, H * 0.48, H * 0.72];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = duckColors[i];
        ctx.shadowColor = duckColors[i];
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(W * duckX[i], duckY[i], 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(W * duckX[i] + 14, duckY[i] - 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ff9f1c";
        ctx.beginPath();
        ctx.moveTo(W * duckX[i] + 22, duckY[i] - 8);
        ctx.lineTo(W * duckX[i] + 30, duckY[i] - 6);
        ctx.lineTo(W * duckX[i] + 22, duckY[i] - 4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
}

// --- Game definitions ---
const GAMES = [
  {
    id: "geometry_dash",
    title: "Geometry Dash",
    desc: "Auto-runner cube dodging obstacles",
    emoji: "🟦",
  },
  {
    id: "wave_dash",
    title: "Wave Dash",
    desc: "Float through a neon spike corridor",
    emoji: "〰️",
  },
  {
    id: "basketball",
    title: "Basketball",
    desc: "Shoot hoops in 30 seconds",
    emoji: "🏀",
  },
  {
    id: "baseball",
    title: "Baseball",
    desc: "Time your swing perfectly",
    emoji: "⚾",
  },
  {
    id: "football",
    title: "Football",
    desc: "QB: throw to receivers, score TDs",
    emoji: "🏈",
  },
  {
    id: "soccer",
    title: "Soccer",
    desc: "Penalty kicks vs the goalkeeper",
    emoji: "⚽",
  },
  {
    id: "skateboard",
    title: "Skateboard",
    desc: "Grind rails and pull off tricks",
    emoji: "🛹",
  },
  {
    id: "car_racing",
    title: "Car Racing",
    desc: "Top-down 3-lap race with AI cars",
    emoji: "🏎️",
  },
  {
    id: "bike",
    title: "BMX Bike",
    desc: "Hit ramps, do flips, land upright",
    emoji: "🚲",
  },
  {
    id: "plane",
    title: "Sky Pilot",
    desc: "Dodge mountains, shoot enemy planes",
    emoji: "✈️",
  },
  {
    id: "duck_rpg",
    title: "Duck Dash RPG",
    desc: "Level up your duck, compete in races",
    emoji: "🦆",
  },
];

function GameComponent({
  gameId,
  onScore,
}: { gameId: string; onScore: (s: number) => void }) {
  switch (gameId) {
    case "geometry_dash":
      return <GeometryDash onScore={onScore} />;
    case "wave_dash":
      return <WaveDash onScore={onScore} />;
    case "basketball":
      return <Basketball onScore={onScore} />;
    case "baseball":
      return <Baseball onScore={onScore} />;
    case "football":
      return <Football onScore={onScore} />;
    case "soccer":
      return <Soccer onScore={onScore} />;
    case "skateboard":
      return <Skateboard onScore={onScore} />;
    case "car_racing":
      return <CarRacing onScore={onScore} />;
    case "bike":
      return <Bike onScore={onScore} />;
    case "plane":
      return <Plane onScore={onScore} />;
    case "duck_rpg":
      return <DuckRPG />;
    default:
      return null;
  }
}

function GameCard({
  game,
  index,
  onPlay,
  highScore,
}: {
  game: (typeof GAMES)[0];
  index: number;
  onPlay: () => void;
  highScore?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 120;
    canvas.height = 80;
    drawThumbnail(canvas, game.id);
  }, [game.id]);

  return (
    <div
      className="game-card rounded-2xl overflow-hidden game-card-anim"
      data-ocid={`hub.game_card.${index + 1}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: "80px" }}>
        <canvas
          ref={canvasRef}
          width={120}
          height={80}
          className="w-full"
          style={{ height: "80px", imageRendering: "pixelated" }}
        />
        <div className="absolute top-2 right-2 text-lg">{game.emoji}</div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <h3
          className="font-bold text-base mb-1"
          style={{
            color: "#fff",
            fontFamily: "Bricolage Grotesque, sans-serif",
          }}
        >
          {game.title}
        </h3>
        <p
          className="text-xs mb-3"
          style={{ color: "rgba(255,255,255,0.5)", lineHeight: "1.4" }}
        >
          {game.desc}
        </p>
        {highScore !== undefined && highScore > 0 && (
          <div
            className="text-xs mb-3 font-mono"
            style={{ color: "oklch(0.75 0.18 195)" }}
          >
            Best: {highScore}
          </div>
        )}
        <button
          type="button"
          className="play-btn w-full py-2 rounded-lg text-sm"
          data-ocid={`hub.play_button.${index + 1}`}
          onClick={onPlay}
        >
          ▶ PLAY
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>(loadScores);

  const handlePlay = (gameId: string) => {
    setActiveGame(gameId);
  };

  const handleClose = () => {
    setScores(loadScores());
    setActiveGame(null);
  };

  const handleScore = (gameId: string, score: number) => {
    saveScore(gameId, score);
    setScores(loadScores());
  };

  const activeGameDef = GAMES.find((g) => g.id === activeGame);

  return (
    <div className="min-h-screen hub-bg relative">
      <div className="grid-pattern" />

      {/* Header */}
      <header className="relative z-10 text-center pt-12 pb-8 px-4">
        <div className="gamezone-logo text-6xl md:text-7xl mb-3">GameZone</div>
        <p
          className="text-lg"
          style={{
            color: "rgba(255,255,255,0.5)",
            fontFamily: "Sora, sans-serif",
            letterSpacing: "0.08em",
          }}
        >
          Play. Level up. Win.
        </p>
        <div
          className="mt-4 flex justify-center gap-6 text-xs"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          <span>🎮 11 Games</span>
          <span>🏆 High Scores Saved</span>
          <span>🦆 Duck RPG Progression</span>
        </div>
      </header>

      {/* Game Grid */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GAMES.map((game, idx) => (
            <GameCard
              key={game.id}
              game={game}
              index={idx}
              onPlay={() => handlePlay(game.id)}
              highScore={scores[game.id]}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 text-center py-6 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            className="underline hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

      {/* Game Overlay */}
      {activeGame && activeGameDef && (
        <dialog
          open
          className="game-overlay"
          aria-modal="true"
          style={{
            padding: 0,
            margin: 0,
            maxWidth: "none",
            maxHeight: "none",
            border: "none",
          }}
        >
          <div className="game-overlay-header">
            <div className="flex items-center gap-3">
              <span className="text-xl">{activeGameDef.emoji}</span>
              <span
                className="font-bold text-white text-lg"
                style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}
              >
                {activeGameDef.title}
              </span>
              {scores[activeGame] !== undefined && scores[activeGame] > 0 && (
                <span
                  className="text-xs px-2 py-1 rounded font-mono"
                  style={{
                    background: "rgba(130,230,255,0.1)",
                    color: "oklch(0.75 0.18 195)",
                  }}
                >
                  Best: {scores[activeGame]}
                </span>
              )}
            </div>
            <button
              type="button"
              data-ocid="game_overlay.close_button"
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all hover:bg-white/10"
              style={{
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              aria-label="Close game"
            >
              ✕ Close
            </button>
          </div>

          <div className="game-overlay-content">
            <Suspense
              fallback={
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 animate-pulse-cyan">
                      {activeGameDef.emoji}
                    </div>
                    <div className="text-sm">Loading game...</div>
                  </div>
                </div>
              }
            >
              <GameComponent
                gameId={activeGame}
                onScore={(s) => handleScore(activeGame, s)}
              />
            </Suspense>
          </div>
        </dialog>
      )}
    </div>
  );
}
