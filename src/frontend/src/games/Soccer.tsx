import React, { useEffect, useRef, useCallback } from "react";

interface SoccerProps {
  onScore?: (score: number) => void;
}

export default function Soccer({ onScore }: SoccerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    gameOver: false,
    score: 0,
    misses: 0,
    kicks: 0,
    maxKicks: 5,
    aimX: 0,
    aimY: 0,
    power: 0,
    charging: false,
    kicked: false,
    ballX: 0,
    ballY: 0,
    ballVX: 0,
    ballVY: 0,
    ballZ: 0,
    ballVZ: 0,
    keeperX: 0,
    keeperVX: 0,
    keeperDiveDir: 0,
    keeperDived: false,
    result: "",
    resultFrame: 0,
    phase: "ready" as "ready" | "charging" | "flying" | "done",
    t: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const resetKick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const W = canvas.width;
    const H = canvas.height;
    s.aimX = W / 2;
    s.aimY = H * 0.32;
    s.power = 0;
    s.charging = false;
    s.kicked = false;
    s.ballX = W / 2;
    s.ballY = H * 0.75;
    s.ballVX = 0;
    s.ballVY = 0;
    s.ballZ = 0;
    s.ballVZ = 0;
    s.keeperX = W / 2;
    s.keeperVX = 0;
    s.keeperDived = false;
    s.keeperDiveDir = 0;
    s.phase = "ready";
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.started = true;
    s.gameOver = false;
    s.score = 0;
    s.misses = 0;
    s.kicks = 0;
    s.result = "";
    s.resultFrame = 0;
    resetKick();
  }, [resetKick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.ballX = canvas.width / 2;
    stateRef.current.ballY = canvas.height * 0.75;
    stateRef.current.aimX = canvas.width / 2;
    stateRef.current.aimY = canvas.height * 0.32;
    stateRef.current.keeperX = canvas.width / 2;

    const drawGoal = (W: number, H: number) => {
      const goalW = W * 0.5;
      const goalH = H * 0.35;
      const gx = W / 2 - goalW / 2;
      const gy = H * 0.08;

      // Goal net
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(gx, gy, goalW, goalH);

      // Net lines
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      for (let x = gx; x <= gx + goalW; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x, gy + goalH);
        ctx.stroke();
      }
      for (let y = gy; y <= gy + goalH; y += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + goalW, y);
        ctx.stroke();
      }

      // Posts
      ctx.strokeStyle = "#fff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy + goalH);
      ctx.lineTo(gx + goalW, gy + goalH);
      ctx.lineTo(gx + goalW, gy);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawKeeper = (
      kx: number,
      H: number,
      dived: boolean,
      diveDir: number,
    ) => {
      const ky = H * 0.42;
      ctx.save();
      if (dived) {
        ctx.translate(kx + diveDir * 30, ky - 10);
        ctx.rotate(diveDir * 0.6);
      } else {
        ctx.translate(kx, ky);
      }
      // Body
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath();
      ctx.roundRect(-14, -32, 28, 44, 3);
      ctx.fill();
      // Head
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(0, -46, 14, 0, Math.PI * 2);
      ctx.fill();
      // Arms spread
      ctx.strokeStyle = "#ff9f1c";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-14, -20);
      ctx.lineTo(-38, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, -20);
      ctx.lineTo(38, 0);
      ctx.stroke();
      // Legs
      ctx.fillStyle = "#333";
      ctx.fillRect(-13, 12, 12, 26);
      ctx.fillRect(1, 12, 12, 26);
      ctx.restore();
    };

    const drawBall = (bx: number, by: number, bz: number) => {
      const r = Math.max(8, 20 - bz * 0.1);
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(255,255,255,0.5)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Hexagon pattern
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = bx + Math.cos(angle) * r * 0.5;
        const hy = by + Math.sin(angle) * r * 0.5;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const drawAimArrow = (ax: number, ay: number, bx: number, by: number) => {
      ctx.save();
      ctx.strokeStyle = "rgba(255,215,0,0.7)";
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      const dx = ax - bx;
      const dy = ay - by;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len;
      const ny = dy / len;
      ctx.fillStyle = "#ffd93d";
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - nx * 14 - ny * 8, ay - ny * 14 + nx * 8);
      ctx.lineTo(ax - nx * 14 + ny * 8, ay - ny * 14 - nx * 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t++;

      // Background — stadium at night
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0a0a1a");
      bgGrad.addColorStop(0.6, "#0d1f0d");
      bgGrad.addColorStop(1, "#1a3a1a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Grass pattern
      for (let i = 0; i < 8; i++) {
        const x = (i / 8) * W;
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(x, H * 0.5, W / 8, H);
        }
      }

      // Penalty spot circle
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.8, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.8, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();

      drawGoal(W, H);

      if (s.started) {
        // Update controls for aiming
        if (s.phase === "ready" || s.phase === "charging") {
          const aimSpeed = 3;
          if (keysRef.current.has("ArrowLeft")) s.aimX -= aimSpeed;
          if (keysRef.current.has("ArrowRight")) s.aimX += aimSpeed;
          if (keysRef.current.has("ArrowUp")) s.aimY -= aimSpeed;
          if (keysRef.current.has("ArrowDown")) s.aimY += aimSpeed;
          s.aimX = Math.max(W * 0.15, Math.min(W * 0.85, s.aimX));
          s.aimY = Math.max(H * 0.08, Math.min(H * 0.44, s.aimY));

          if (keysRef.current.has(" ") && s.phase === "ready") {
            s.phase = "charging";
          }
          if (!keysRef.current.has(" ") && s.phase === "charging") {
            // Kick!
            s.phase = "flying";
            const dx = s.aimX - s.ballX;
            const dy = s.aimY - s.ballY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const spd = 10 + s.power * 0.08;
            s.ballVX = (dx / dist) * spd;
            s.ballVY = (dy / dist) * spd;
            s.ballVZ = s.power * 0.12;
            // Keeper dives
            s.keeperDived = true;
            s.keeperDiveDir = Math.random() > 0.5 ? 1 : -1;
            setTimeout(() => {
              const diveDist = s.keeperDiveDir * (60 + Math.random() * 80);
              stateRef.current.keeperX = W / 2 + diveDist;
            }, 100);
          }
          if (s.phase === "charging") {
            s.power = Math.min(100, s.power + 1.5);
          }
        }

        // Ball flight
        if (s.phase === "flying") {
          s.ballX += s.ballVX;
          s.ballY += s.ballVY;
          s.ballZ += s.ballVZ;
          s.ballVZ -= 0.6;
          s.ballVX *= 0.99;

          // Check if ball enters goal area
          const goalW = W * 0.5;
          const gx = W / 2 - goalW / 2;
          const gy = H * 0.08;
          const goalH = H * 0.35;

          if (
            s.ballX > gx &&
            s.ballX < gx + goalW &&
            s.ballY < gy + goalH &&
            s.ballY > gy
          ) {
            // Check keeper collision
            const kDist = Math.abs(s.ballX - s.keeperX);
            if (s.keeperDived && kDist < 45) {
              s.result = "SAVED!";
              s.misses++;
            } else {
              s.result = "GOAL! ⚽";
              s.score++;
            }
            s.kicks++;
            s.resultFrame = 150;
            s.phase = "done";
            if (s.kicks >= s.maxKicks) {
              setTimeout(() => {
                stateRef.current.gameOver = true;
                onScore?.(s.score);
              }, 2000);
            } else {
              setTimeout(() => resetKick(), 2000);
            }
          }

          // Ball past goal or out
          if (s.ballY < 0 || s.ballY < H * 0.08 || s.ballX < 0 || s.ballX > W) {
            if (s.phase === "flying") {
              s.result = "WIDE!";
              s.misses++;
              s.kicks++;
              s.resultFrame = 120;
              s.phase = "done";
              if (s.kicks >= s.maxKicks) {
                setTimeout(() => {
                  stateRef.current.gameOver = true;
                  onScore?.(s.score);
                }, 2000);
              } else {
                setTimeout(() => resetKick(), 2000);
              }
            }
          }
          // Ball hits ground
          if (s.ballZ <= 0 && s.ballVZ < 0 && s.phase === "flying") {
            s.ballZ = 0;
            if (s.ballY > H * 0.44) {
              s.result = "WIDE!";
              s.misses++;
              s.kicks++;
              s.resultFrame = 120;
              s.phase = "done";
              if (s.kicks >= s.maxKicks) {
                setTimeout(() => {
                  stateRef.current.gameOver = true;
                  onScore?.(s.score);
                }, 2000);
              } else {
                setTimeout(() => resetKick(), 2000);
              }
            }
          }
        }

        drawKeeper(s.keeperX, H, s.keeperDived, s.keeperDiveDir);

        // Draw aim arrow
        if (s.phase === "ready" || s.phase === "charging") {
          drawAimArrow(s.aimX, s.aimY, s.ballX, s.ballY);
          // Aim crosshair
          ctx.strokeStyle = "rgba(255,215,0,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.aimX, s.aimY, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.aimX - 20, s.aimY);
          ctx.lineTo(s.aimX + 20, s.aimY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.aimX, s.aimY - 20);
          ctx.lineTo(s.aimX, s.aimY + 20);
          ctx.stroke();
        }

        drawBall(s.ballX, s.ballY - s.ballZ, s.ballZ);

        // Power bar
        if (s.phase === "charging") {
          const barW = 200;
          const barH = 20;
          const bx = W / 2 - barW / 2;
          const by = H - 50;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
          ctx.fillStyle = "#333";
          ctx.fillRect(bx, by, barW, barH);
          const pct = s.power / 100;
          const pGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
          pGrad.addColorStop(0, "#6bcb77");
          pGrad.addColorStop(0.5, "#ffd93d");
          pGrad.addColorStop(1, "#ff4444");
          ctx.fillStyle = pGrad;
          ctx.fillRect(bx, by, barW * pct, barH);
          ctx.fillStyle = "#fff";
          ctx.font = "12px Sora, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("POWER — Release SPACE to shoot", W / 2, by - 8);
        }

        // Result
        if (s.resultFrame > 0) {
          s.resultFrame--;
          ctx.textAlign = "center";
          const colors: Record<string, string> = {
            "GOAL! ⚽": "#6bcb77",
            "SAVED!": "#ff4444",
            "WIDE!": "#ff9f1c",
          };
          const c = colors[s.result] ?? "#fff";
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 25;
          ctx.font = "bold 56px Bricolage Grotesque, sans-serif";
          ctx.fillText(s.result, W / 2, H / 2);
          ctx.shadowBlur = 0;
        }

        // HUD
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText(`Goals: ${s.score}`, 16, 36);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "14px Sora, sans-serif";
        ctx.fillText(`Kicks: ${s.kicks}/${s.maxKicks}`, 16, 58);

        if (s.gameOver) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(0, 0, W, H);
          ctx.textAlign = "center";
          ctx.fillStyle = "#6bcb77";
          ctx.shadowColor = "#6bcb77";
          ctx.shadowBlur = 20;
          ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
          ctx.fillText(`${s.score} / ${s.maxKicks} Goals!`, W / 2, H / 2 - 40);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.font = "24px Sora, sans-serif";
          const msg =
            s.score === s.maxKicks
              ? "Perfect Penalty Round!"
              : s.score >= 3
                ? "Great Shooting!"
                : "Better luck next time!";
          ctx.fillText(msg, W / 2, H / 2 + 10);
          ctx.fillStyle = "#4d96ff";
          ctx.shadowColor = "#4d96ff";
          ctx.shadowBlur = 10;
          ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
          ctx.fillText("Click to Play Again", W / 2, H / 2 + 60);
          ctx.shadowBlur = 0;
        }
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = "#6bcb77";
        ctx.shadowColor = "#6bcb77";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("SOCCER PENALTY", W / 2, H / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText("Arrow Keys: Aim | Hold SPACE: Charge", W / 2, H / 2 - 5);
        ctx.fillText("Release SPACE to Shoot!", W / 2, H / 2 + 22);
        ctx.fillText(
          "5 kicks — score as many goals as you can!",
          W / 2,
          H / 2 + 48,
        );
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 88);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") e.preventDefault();
      if (!stateRef.current.started) startGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      const s = stateRef.current;
      if (!s.started || s.gameOver) startGame();
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
  }, [startGame, resetKick, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="controls-legend">
        Arrows: Aim | Hold SPACE: Charge | Release: Shoot
      </div>
    </div>
  );
}
