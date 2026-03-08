import React, { useEffect, useRef, useCallback } from "react";

interface CarRacingProps {
  onScore?: (score: number) => void;
}

interface AICar {
  laneOffset: number;
  speed: number;
  color: string;
  yOffset: number;
}

export default function CarRacing({ onScore }: CarRacingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    gameOver: false,
    carX: 0,
    carY: 0,
    speed: 0,
    maxSpeed: 8,
    angle: 0,
    roadOffset: 0,
    score: 0,
    lap: 1,
    lapProgress: 0,
    laps: 3,
    lapTime: 0,
    bestLap: Number.POSITIVE_INFINITY,
    aiCars: [] as AICar[],
    hitFlash: 0,
    t: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.started = true;
    s.gameOver = false;
    s.carX = canvas.width / 2;
    s.carY = canvas.height * 0.7;
    s.speed = 0;
    s.angle = 0;
    s.roadOffset = 0;
    s.score = 0;
    s.lap = 1;
    s.lapProgress = 0;
    s.lapTime = 0;
    s.hitFlash = 0;
    s.aiCars = [
      {
        laneOffset: -80,
        speed: 3.5 + Math.random(),
        color: "#ff4444",
        yOffset: -200,
      },
      {
        laneOffset: 80,
        speed: 3 + Math.random(),
        color: "#44ff44",
        yOffset: -400,
      },
      {
        laneOffset: 0,
        speed: 4 + Math.random(),
        color: "#4444ff",
        yOffset: -600,
      },
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.carX = canvas.width / 2;
    stateRef.current.carY = canvas.height * 0.7;

    const drawRoad = (offset: number, W: number, H: number) => {
      const roadW = W * 0.5;
      const cx = W / 2;

      // Road surface
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(cx - roadW / 2 - 30, H);
      ctx.lineTo(cx + roadW / 2 + 30, H);
      ctx.lineTo(cx + roadW / 2, 0);
      ctx.lineTo(cx - roadW / 2, 0);
      ctx.closePath();
      ctx.fill();

      // Road edges
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - roadW / 2 - 30, H);
      ctx.lineTo(cx - roadW / 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + roadW / 2 + 30, H);
      ctx.lineTo(cx + roadW / 2, 0);
      ctx.stroke();

      // Lane dividers (dashed, scrolling)
      ctx.strokeStyle = "#ffd93d";
      ctx.lineWidth = 3;
      ctx.setLineDash([30, 30]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - roadW / 4, 0);
      ctx.lineTo(cx - roadW / 4 + 15, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + roadW / 4, 0);
      ctx.lineTo(cx + roadW / 4 - 15, H);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawCar = (cx: number, cy: number, color: string, angle: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      // Car body
      const grad = ctx.createLinearGradient(-18, -30, 18, 30);
      grad.addColorStop(0, color);
      grad.addColorStop(1, `${color}99`);
      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-18, -30, 36, 60, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Windshield
      ctx.fillStyle = "rgba(100,180,255,0.5)";
      ctx.beginPath();
      ctx.roundRect(-12, -24, 24, 18, 3);
      ctx.fill();
      // Rear window
      ctx.fillStyle = "rgba(100,180,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(-10, 6, 20, 14, 2);
      ctx.fill();
      // Wheels
      ctx.fillStyle = "#222";
      ctx.fillRect(-22, -25, 8, 14);
      ctx.fillRect(14, -25, 8, 14);
      ctx.fillRect(-22, 12, 8, 14);
      ctx.fillRect(14, 12, 8, 14);
      // Headlights
      ctx.fillStyle = "#fffaaa";
      ctx.shadowColor = "#fffaaa";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-12, -30, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, -30, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t++;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0a0a15");
      bgGrad.addColorStop(0.6, "#1a2a1a");
      bgGrad.addColorStop(1, "#2a2a2a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Scenery trees
      for (let i = 0; i < 6; i++) {
        const tx =
          ((((i * 160 - s.roadOffset * 0.5) % (W + 160)) + W + 160) %
            (W + 160)) -
          160;
        ctx.fillStyle = "#1a4a1a";
        ctx.beginPath();
        ctx.moveTo(tx + 15, H - 80);
        ctx.lineTo(tx, H - 40);
        ctx.lineTo(tx + 30, H - 40);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#0a2a0a";
        ctx.beginPath();
        ctx.moveTo(tx + 15, H - 100);
        ctx.lineTo(tx + 5, H - 75);
        ctx.lineTo(tx + 25, H - 75);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const tx =
          ((((i * 160 - s.roadOffset * 0.5 + 80) % (W + 160)) + W + 160) %
            (W + 160)) -
          160;
        ctx.fillStyle = "#1a4a1a";
        ctx.beginPath();
        ctx.moveTo(W - tx + 15, H - 80);
        ctx.lineTo(W - tx, H - 40);
        ctx.lineTo(W - tx + 30, H - 40);
        ctx.closePath();
        ctx.fill();
      }

      drawRoad(s.roadOffset, W, H);

      if (s.started && !s.gameOver) {
        // Controls
        const accel = 0.2;
        const decel = 0.1;
        const turnSpeed = 0.04;

        if (keysRef.current.has("ArrowUp") || keysRef.current.has("w")) {
          s.speed = Math.min(s.maxSpeed, s.speed + accel);
        } else if (
          keysRef.current.has("ArrowDown") ||
          keysRef.current.has("s")
        ) {
          s.speed = Math.max(0, s.speed - decel * 2);
        } else {
          s.speed = Math.max(0, s.speed - decel);
        }

        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
          s.angle -= turnSpeed * (s.speed / s.maxSpeed);
          s.carX -= s.speed * 0.5;
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
          s.angle += turnSpeed * (s.speed / s.maxSpeed);
          s.carX += s.speed * 0.5;
        }

        // Road boundaries
        const roadW = W * 0.5;
        const cx = W / 2;
        if (s.carX < cx - roadW / 2 + 20 || s.carX > cx + roadW / 2 - 20) {
          s.speed *= 0.8;
          s.hitFlash = 10;
          if (s.carX < cx - roadW / 2 + 20) s.carX = cx - roadW / 2 + 20;
          if (s.carX > cx + roadW / 2 - 20) s.carX = cx + roadW / 2 - 20;
        }

        // Road scrolling
        s.roadOffset += s.speed * 4;

        // Lap progress
        s.lapProgress += s.speed;
        s.lapTime++;
        if (s.lapProgress > 3000) {
          s.lapProgress = 0;
          s.lap++;
          const lapSec = Math.round((s.lapTime / 60) * 10) / 10;
          if (lapSec < s.bestLap) s.bestLap = lapSec;
          s.lapTime = 0;
          if (s.lap > s.laps) {
            s.gameOver = true;
            s.score = Math.round((s.laps * 1000) / (s.bestLap || 60));
            onScore?.(s.score);
          }
        }

        // AI cars
        for (const ai of s.aiCars) {
          ai.yOffset += ai.speed - s.speed;
          if (ai.yOffset > H + 100) ai.yOffset = -300;
          if (ai.yOffset < -500) ai.yOffset = H + 100;

          const aiX = W / 2 + ai.laneOffset;
          const aiY = s.carY + ai.yOffset;

          if (aiY > 0 && aiY < H) {
            drawCar(aiX, aiY, ai.color, 0);

            // Collision
            if (Math.abs(aiX - s.carX) < 35 && Math.abs(aiY - s.carY) < 55) {
              s.speed *= 0.5;
              s.hitFlash = 20;
            }
          }
        }

        // Player car
        if (s.hitFlash > 0) {
          s.hitFlash--;
          ctx.fillStyle = "rgba(255,0,0,0.15)";
          ctx.fillRect(0, 0, W, H);
        }
        drawCar(s.carX, s.carY, "#00aaff", s.angle * 0.3);

        // HUD
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText(`Lap: ${Math.min(s.lap, s.laps)}/${s.laps}`, 16, 36);
        ctx.fillStyle = "#4d96ff";
        ctx.font = "14px Sora, sans-serif";
        ctx.fillText(`Speed: ${(s.speed * 15).toFixed(0)} mph`, 16, 58);
        ctx.fillStyle = "#ffd93d";
        ctx.fillText(`Time: ${(s.lapTime / 60).toFixed(1)}s`, 16, 78);
        if (s.bestLap < Number.POSITIVE_INFINITY) {
          ctx.fillStyle = "#6bcb77";
          ctx.fillText(`Best Lap: ${s.bestLap.toFixed(1)}s`, 16, 98);
        }

        // Lap progress bar
        const progPct = s.lapProgress / 3000;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(W - 140, 16, 120, 12);
        ctx.fillStyle = "#4d96ff";
        ctx.fillRect(W - 140, 16, 120 * progPct, 12);
        ctx.fillStyle = "#fff";
        ctx.font = "11px Sora, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("LAP PROGRESS", W - 16, 14);

        if (s.gameOver) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(0, 0, W, H);
          ctx.textAlign = "center";
          ctx.fillStyle = "#4d96ff";
          ctx.shadowColor = "#4d96ff";
          ctx.shadowBlur = 20;
          ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
          ctx.fillText("RACE COMPLETE!", W / 2, H / 2 - 50);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.font = "24px Sora, sans-serif";
          ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 5);
          if (s.bestLap < Number.POSITIVE_INFINITY) {
            ctx.fillStyle = "#6bcb77";
            ctx.font = "18px Sora, sans-serif";
            ctx.fillText(
              `Best Lap: ${s.bestLap.toFixed(1)}s`,
              W / 2,
              H / 2 + 35,
            );
          }
          ctx.fillStyle = "#ffd93d";
          ctx.shadowColor = "#ffd93d";
          ctx.shadowBlur = 10;
          ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
          ctx.fillText("Click to Race Again", W / 2, H / 2 + 75);
          ctx.shadowBlur = 0;
        }
      } else if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("CAR RACING", W / 2, H / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText("WASD / Arrow Keys to drive", W / 2, H / 2 - 5);
        ctx.fillText("Avoid AI cars | Complete 3 laps!", W / 2, H / 2 + 22);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 65);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      e.preventDefault();
      if (!stateRef.current.started || stateRef.current.gameOver) startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      if (!stateRef.current.started || stateRef.current.gameOver) startGame();
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleClick);
    };
  }, [startGame, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="controls-legend">
        WASD / Arrows: Drive | Complete 3 Laps!
      </div>
    </div>
  );
}
