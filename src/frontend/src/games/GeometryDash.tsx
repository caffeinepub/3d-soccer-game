import React, { useEffect, useRef, useCallback } from "react";

interface GeometryDashProps {
  onScore?: (score: number) => void;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "spike" | "block" | "platform";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function GeometryDash({ onScore }: GeometryDashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    running: false,
    dead: false,
    score: 0,
    speed: 4,
    playerX: 80,
    playerY: 0,
    playerVY: 0,
    playerRotation: 0,
    groundY: 0,
    jumping: false,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    nextObstacleX: 400,
    frameCount: 0,
    bgOffset: 0,
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
    s.speed = 4;
    s.playerY = 0;
    s.playerVY = 0;
    s.playerRotation = 0;
    s.jumping = false;
    s.obstacles = [];
    s.particles = [];
    s.nextObstacleX = 400;
    s.frameCount = 0;
    s.bgOffset = 0;
    s.groundY = canvas.height - 60;
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.dead && s.playerY >= s.groundY - 40 && s.running) {
      s.playerVY = -14;
      s.jumping = true;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.groundY = canvas.height - 60;
    stateRef.current.playerY = stateRef.current.groundY - 40;

    const spawnObstacle = (x: number): Obstacle[] => {
      const type = Math.random();
      const s = stateRef.current;
      const g = s.groundY;

      if (type < 0.4) {
        // single spike
        return [{ x, y: g - 30, w: 30, h: 30, type: "spike" }];
      }
      if (type < 0.65) {
        // double spike
        return [
          { x, y: g - 30, w: 25, h: 30, type: "spike" },
          { x: x + 30, y: g - 30, w: 25, h: 30, type: "spike" },
        ];
      }
      if (type < 0.85) {
        // block
        return [{ x, y: g - 40, w: 40, h: 40, type: "block" }];
      }
      // platform (jump over)
      return [{ x, y: g - 80, w: 80, h: 20, type: "platform" }];
    };

    const spawnParticles = (x: number, y: number) => {
      const s = stateRef.current;
      const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6bff"];
      for (let i = 0; i < 12; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const drawPlayer = (
      x: number,
      y: number,
      rotation: number,
      dead: boolean,
    ) => {
      ctx.save();
      ctx.translate(x + 20, y + 20);
      ctx.rotate(rotation);
      // Cube body
      const grad = ctx.createLinearGradient(-20, -20, 20, 20);
      grad.addColorStop(0, dead ? "#666" : "#4d96ff");
      grad.addColorStop(1, dead ? "#333" : "#ff6bff");
      ctx.fillStyle = grad;
      ctx.strokeStyle = dead ? "#888" : "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-18, -18, 36, 36, 4);
      ctx.fill();
      ctx.stroke();
      // Inner detail
      ctx.strokeStyle = dead ? "#aaa" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, -8);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const drawSpike = (obs: Obstacle) => {
      ctx.save();
      ctx.fillStyle = "#ff6b6b";
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w / 2, obs.y);
      ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
      ctx.lineTo(obs.x, obs.y + obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawBlock = (obs: Obstacle) => {
      ctx.save();
      const grad = ctx.createLinearGradient(
        obs.x,
        obs.y,
        obs.x + obs.w,
        obs.y + obs.h,
      );
      grad.addColorStop(0, "#ffd93d");
      grad.addColorStop(1, "#ff9f1c");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#ffd93d";
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4);
      ctx.restore();
    };

    const drawPlatform = (obs: Obstacle) => {
      ctx.save();
      const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.h);
      grad.addColorStop(0, "#6bcb77");
      grad.addColorStop(1, "#1a9e48");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#6bcb77";
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Scrolling grid background
      s.bgOffset = (s.bgOffset + s.speed * 0.3) % 60;
      ctx.strokeStyle = "rgba(77,150,255,0.07)";
      ctx.lineWidth = 1;
      for (let x = -s.bgOffset; x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Ground
      const gGrad = ctx.createLinearGradient(0, s.groundY, 0, H);
      gGrad.addColorStop(0, "#1a1a3a");
      gGrad.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, s.groundY, W, H - s.groundY);
      ctx.strokeStyle = "#4d96ff";
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, s.groundY);
      ctx.lineTo(W, s.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (s.running && !s.dead) {
        s.frameCount++;
        s.score = Math.floor(s.frameCount / 6);
        s.speed = 4 + s.score * 0.003;

        // Physics
        s.playerVY += 0.7;
        s.playerY += s.playerVY;
        if (s.playerY >= s.groundY - 40) {
          s.playerY = s.groundY - 40;
          s.playerVY = 0;
          s.jumping = false;
        }

        // Rotation while airborne
        if (s.jumping || s.playerY < s.groundY - 41) {
          s.playerRotation += 0.1;
        } else {
          s.playerRotation = 0;
        }

        // Auto-jump held key
        if (keysRef.current.has(" ") && !s.jumping) {
          jump();
        }

        // Move and spawn obstacles
        for (const obs of s.obstacles) {
          obs.x -= s.speed;
        }
        s.obstacles = s.obstacles.filter((o) => o.x > -100);

        if (
          s.obstacles.length === 0 ||
          W - s.obstacles[s.obstacles.length - 1].x > s.nextObstacleX
        ) {
          const newObs = spawnObstacle(W + 50);
          s.obstacles.push(...newObs);
          s.nextObstacleX = 200 + Math.random() * 200;
        }

        // Collision
        const px = s.playerX;
        const py = s.playerY;
        for (const obs of s.obstacles) {
          const margin = 6;
          if (
            px + margin < obs.x + obs.w &&
            px + 40 - margin > obs.x &&
            py + margin < obs.y + obs.h &&
            py + 40 - margin > obs.y
          ) {
            s.dead = true;
            spawnParticles(px + 20, py + 20);
            onScore?.(s.score);
          }
        }

        // Particles
        for (const p of s.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.life -= 0.04;
        }
        s.particles = s.particles.filter((p) => p.life > 0);
      }

      // Draw obstacles
      for (const obs of s.obstacles) {
        if (obs.type === "spike") drawSpike(obs);
        else if (obs.type === "block") drawBlock(obs);
        else drawPlatform(obs);
      }

      // Draw particles
      for (const p of s.particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw player
      drawPlayer(s.playerX, s.playerY, s.playerRotation, s.dead);

      // Score
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 16, 36);

      // Speed indicator
      ctx.fillStyle = "#4d96ff";
      ctx.font = "14px Sora, sans-serif";
      ctx.fillText(`Speed: ${s.speed.toFixed(1)}x`, 16, 58);

      // Dead overlay
      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff6b6b";
        ctx.shadowColor = "#ff6b6b";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 10;
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Press SPACE or Tap to Restart", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }

      if (!s.running && !s.dead) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 15;
        ctx.font = "bold 36px Bricolage Grotesque, sans-serif";
        ctx.fillText("GEOMETRY DASH", W / 2, H / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "18px Sora, sans-serif";
        ctx.fillText("Press SPACE or Tap to Start", W / 2, H / 2 + 20);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " ") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.running) {
          resetGame();
        } else if (s.dead) {
          resetGame();
        } else {
          jump();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      const s = stateRef.current;
      if (!s.running) {
        resetGame();
      } else if (s.dead) {
        resetGame();
      } else {
        jump();
      }
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
  }, [jump, resetGame, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "pointer" }}
      />
      <div className="controls-legend">SPACE / Click: Jump</div>
    </div>
  );
}
