import React, { useEffect, useRef, useCallback } from "react";

interface WaveDashProps {
  onScore?: (score: number) => void;
}

interface SpikeRow {
  x: number;
  topH: number;
  botH: number;
  w: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export default function WaveDash({ onScore }: WaveDashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    running: false,
    dead: false,
    score: 0,
    speed: 3.5,
    playerX: 100,
    playerY: 0,
    holding: false,
    trail: [] as TrailPoint[],
    spikes: [] as SpikeRow[],
    nextSpikeX: 300,
    frameCount: 0,
    bgOffset: 0,
    t: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.running = true;
    s.dead = false;
    s.score = 0;
    s.speed = 3.5;
    s.playerY = canvas.height / 2;
    s.holding = false;
    s.trail = [];
    s.spikes = [];
    s.nextSpikeX = 300;
    s.frameCount = 0;
    s.bgOffset = 0;
    s.t = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.playerY = canvas.height / 2;

    const spawnSpikes = (x: number): SpikeRow => {
      const s = stateRef.current;
      const H = canvas.height;
      const gap = Math.max(80, 150 - s.score * 0.1);
      const topH = 20 + Math.random() * (H - gap - 60);
      const botH = H - topH - gap;
      return { x, topH, botH, w: 35 };
    };

    const drawSpikes = (spike: SpikeRow) => {
      const H = canvas.height;
      const numTop = Math.floor(spike.topH / 20);
      const numBot = Math.floor(spike.botH / 20);

      // Top spikes
      ctx.fillStyle = "#ff2dff";
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 10;
      for (let i = 0; i < numTop; i++) {
        ctx.beginPath();
        ctx.moveTo(spike.x + spike.w / 2, spike.topH - i * 20);
        ctx.lineTo(spike.x + spike.w, spike.topH - (i + 1) * 20);
        ctx.lineTo(spike.x, spike.topH - (i + 1) * 20);
        ctx.closePath();
        ctx.fill();
      }
      // Top wall
      ctx.fillStyle = "#1a0028";
      ctx.shadowBlur = 0;
      ctx.fillRect(spike.x, 0, spike.w, spike.topH);
      ctx.strokeStyle = "#ff2dff";
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spike.x, spike.topH);
      ctx.lineTo(spike.x + spike.w, spike.topH);
      ctx.stroke();

      // Bottom spikes
      ctx.fillStyle = "#ff2dff";
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 10;
      for (let i = 0; i < numBot; i++) {
        ctx.beginPath();
        ctx.moveTo(spike.x + spike.w / 2, H - spike.botH + i * 20);
        ctx.lineTo(spike.x + spike.w, H - spike.botH + (i + 1) * 20);
        ctx.lineTo(spike.x, H - spike.botH + (i + 1) * 20);
        ctx.closePath();
        ctx.fill();
      }
      // Bottom wall
      ctx.fillStyle = "#1a0028";
      ctx.shadowBlur = 0;
      ctx.fillRect(spike.x, H - spike.botH, spike.w, spike.botH);
      ctx.strokeStyle = "#ff2dff";
      ctx.shadowColor = "#ff2dff";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spike.x, H - spike.botH);
      ctx.lineTo(spike.x + spike.w, H - spike.botH);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawPlayer = (x: number, y: number, holding: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      const dir = holding ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(10 * dir, 0);
      ctx.lineTo(-8 * dir, -8);
      ctx.lineTo(-8 * dir, 8);
      ctx.closePath();

      const grad = ctx.createLinearGradient(-10, -10, 10, 10);
      grad.addColorStop(0, "#ff9fff");
      grad.addColorStop(1, "#c700ff");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#ff9fff";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = "#0d0015";
      ctx.fillRect(0, 0, W, H);

      // Moving lines
      s.t += 0.02;
      s.bgOffset = (s.bgOffset + s.speed * 0.4) % 80;
      for (let x = -s.bgOffset; x < W; x += 80) {
        const alpha = 0.06 + 0.03 * Math.sin(s.t + x * 0.01);
        ctx.strokeStyle = `rgba(200,0,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 80) {
        ctx.strokeStyle = "rgba(200,0,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      if (s.running && !s.dead) {
        s.frameCount++;
        s.score = Math.floor(s.frameCount / 6);
        s.speed = 3.5 + s.score * 0.004;

        // Move player
        const gravity = 0.3;
        const lift = -0.6;
        if (s.holding) {
          s.playerY += lift;
        } else {
          s.playerY += gravity;
        }
        s.playerY = Math.max(10, Math.min(H - 10, s.playerY));

        // Trail
        s.trail.push({ x: s.playerX, y: s.playerY, alpha: 1 });
        if (s.trail.length > 30) s.trail.shift();
        for (const t of s.trail) t.alpha -= 0.033;
        s.trail = s.trail.filter((t) => t.alpha > 0);

        // Move spikes
        for (const sp of s.spikes) sp.x -= s.speed;
        s.spikes = s.spikes.filter((sp) => sp.x > -sp.w - 10);

        // Spawn
        const lastX = s.spikes.length > 0 ? s.spikes[s.spikes.length - 1].x : 0;
        if (lastX < W - s.nextSpikeX) {
          s.spikes.push(spawnSpikes(W + 50));
          s.nextSpikeX = 120 + Math.random() * 80;
        }

        // Collision
        for (const sp of s.spikes) {
          if (s.playerX + 8 > sp.x && s.playerX - 8 < sp.x + sp.w) {
            if (s.playerY - 8 < sp.topH || s.playerY + 8 > H - sp.botH) {
              s.dead = true;
              onScore?.(s.score);
            }
          }
        }
        // Wall collision
        if (s.playerY <= 6 || s.playerY >= H - 6) {
          s.dead = true;
          onScore?.(s.score);
        }

        // Check keys
        s.holding = keysRef.current.has(" ");
      }

      // Draw trail
      for (let i = 0; i < s.trail.length; i++) {
        const t = s.trail[i];
        const r = 2 + (i / s.trail.length) * 5;
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.7;
        ctx.fillStyle = "#ff2dff";
        ctx.shadowColor = "#ff2dff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw spikes
      for (const sp of s.spikes) drawSpikes(sp);

      // Draw player
      drawPlayer(s.playerX, s.playerY, s.holding);

      // Score
      ctx.textAlign = "left";
      ctx.fillStyle = "#ff9fff";
      ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
      ctx.fillText(`Score: ${s.score}`, 16, 36);

      // Dead overlay
      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff2dff";
        ctx.shadowColor = "#ff2dff";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#ff9fff";
        ctx.shadowColor = "#ff9fff";
        ctx.shadowBlur = 10;
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Press SPACE or Tap to Restart", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }

      if (!s.running && !s.dead) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff9fff";
        ctx.shadowColor = "#ff9fff";
        ctx.shadowBlur = 15;
        ctx.font = "bold 36px Bricolage Grotesque, sans-serif";
        ctx.fillText("WAVE DASH", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "18px Sora, sans-serif";
        ctx.fillText("Hold SPACE to go UP", W / 2, H / 2 + 10);
        ctx.fillText("Release to fall DOWN", W / 2, H / 2 + 36);
        ctx.fillStyle = "#ff9fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText("Tap to Start", W / 2, H / 2 + 70);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.running) resetGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleMouseDown = () => {
      keysRef.current.add(" ");
      if (!stateRef.current.running) resetGame();
    };
    const handleMouseUp = () => keysRef.current.delete(" ");
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      keysRef.current.add(" ");
      if (!stateRef.current.running) resetGame();
    };
    const handleTouchEnd = () => keysRef.current.delete(" ");

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [resetGame, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "pointer" }}
      />
      <div className="controls-legend">
        Hold SPACE / Hold Click: Float Up | Release: Fall
      </div>
    </div>
  );
}
