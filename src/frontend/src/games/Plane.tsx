import React, { useEffect, useRef, useCallback } from "react";

interface PlaneProps {
  onScore?: (score: number) => void;
}

interface Mountain {
  x: number;
  w: number;
  h: number;
  peak: number;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bulletTimer: number;
  health: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  friendly: boolean;
}

interface Fuel {
  x: number;
  y: number;
  collected: boolean;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  opacity: number;
}

interface Explosion {
  x: number;
  y: number;
  r: number;
  life: number;
}

export default function Plane({ onScore }: PlaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    gameOver: false,
    gameOverReason: "",
    score: 0,
    planeX: 100,
    planeY: 0,
    fuel: 100,
    mountains: [] as Mountain[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    fuels: [] as Fuel[],
    clouds: [] as Cloud[],
    explosions: [] as Explosion[],
    frameCount: 0,
    bgOffset: 0,
    speed: 3,
    nextMountainX: 300,
    nextEnemyX: 500,
    nextFuelX: 400,
    shootCooldown: 0,
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
    s.gameOverReason = "";
    s.score = 0;
    s.planeX = 100;
    s.planeY = canvas.height / 2;
    s.fuel = 100;
    s.mountains = [];
    s.enemies = [];
    s.bullets = [];
    s.fuels = [];
    s.clouds = [];
    s.explosions = [];
    s.frameCount = 0;
    s.bgOffset = 0;
    s.speed = 3;
    s.nextMountainX = 300;
    s.nextEnemyX = 500;
    s.nextFuelX = 400;
    s.shootCooldown = 0;
    // Spawn initial clouds
    for (let i = 0; i < 5; i++) {
      s.clouds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.6,
        w: 80 + Math.random() * 100,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.planeY = canvas.height / 2;

    const drawPlane = (px: number, py: number) => {
      ctx.save();
      ctx.translate(px, py);
      // Fuselage
      const grad = ctx.createLinearGradient(-35, -8, 35, 8);
      grad.addColorStop(0, "#4d96ff");
      grad.addColorStop(1, "#003399");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Wing
      ctx.fillStyle = "#2266cc";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -24);
      ctx.lineTo(-28, -24);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, 24);
      ctx.lineTo(-28, 24);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      // Tail
      ctx.fillStyle = "#1a4aaa";
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-35, -14);
      ctx.lineTo(-28, -14);
      ctx.closePath();
      ctx.fill();
      // Cockpit
      ctx.fillStyle = "rgba(180,220,255,0.8)";
      ctx.beginPath();
      ctx.ellipse(12, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Engine trail
      ctx.strokeStyle = "rgba(255,150,50,0.5)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(-55, 0);
      ctx.stroke();
      ctx.restore();
    };

    const drawEnemy = (ex: number, ey: number) => {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(-1, 1); // Mirror facing left
      ctx.fillStyle = "#cc2200";
      ctx.shadowColor = "#ff4444";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#aa1100";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, -18);
      ctx.lineTo(-22, -18);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, 18);
      ctx.lineTo(-22, 18);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawMountain = (m: Mountain, H: number) => {
      const grad = ctx.createLinearGradient(m.x, H - m.h, m.x + m.w, H);
      grad.addColorStop(0, "#2a1a0a");
      grad.addColorStop(0.6, "#4a2a1a");
      grad.addColorStop(1, "#2a1a0a");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#6a3a1a";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(m.x, H);
      ctx.lineTo(m.x + m.peak, H - m.h);
      ctx.lineTo(m.x + m.w, H);
      ctx.closePath();
      ctx.fill();
      // Snow cap
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(m.x + m.peak, H - m.h);
      ctx.lineTo(m.x + m.peak - 15, H - m.h + 30);
      ctx.lineTo(m.x + m.peak + 15, H - m.h + 30);
      ctx.closePath();
      ctx.fill();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t++;

      // Sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, "#0a0a2a");
      skyGrad.addColorStop(0.5, "#0a1a4a");
      skyGrad.addColorStop(1, "#1a0a0a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      s.bgOffset = (s.bgOffset + 0.5) % W;
      for (let i = 0; i < 30; i++) {
        const sx = (((i * 83 - s.bgOffset * 0.3) % W) + W) % W;
        const sy = (i * 61) % (H * 0.6);
        ctx.fillStyle = `rgba(255,255,200,${0.2 + (i % 5) * 0.1})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Clouds
      for (const cl of s.clouds) {
        cl.x -= s.speed * 0.6;
        if (cl.x < -cl.w - 50) {
          cl.x = W + 50;
          cl.y = Math.random() * H * 0.6;
          cl.opacity = 0.3 + Math.random() * 0.5;
        }
        ctx.save();
        ctx.globalAlpha = cl.opacity;
        ctx.fillStyle = "#c8d8ff";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(
            cl.x + i * cl.w * 0.25,
            cl.y + Math.sin(i) * 8,
            cl.w * 0.18,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      if (s.started && !s.gameOver) {
        s.frameCount++;
        s.speed = 3 + s.frameCount * 0.001;
        s.score = Math.floor(s.frameCount / 6);
        s.bgOffset += s.speed;

        // Player movement
        const planeSpeed = 3.5;
        if (keysRef.current.has("ArrowUp") || keysRef.current.has("w"))
          s.planeY -= planeSpeed;
        if (keysRef.current.has("ArrowDown") || keysRef.current.has("s"))
          s.planeY += planeSpeed;
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a"))
          s.planeX = Math.max(40, s.planeX - 2);
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d"))
          s.planeX = Math.min(W * 0.5, s.planeX + 2);
        s.planeY = Math.max(20, Math.min(H - 60, s.planeY));

        // Shoot
        if (s.shootCooldown > 0) s.shootCooldown--;
        if (
          (keysRef.current.has(" ") || keysRef.current.has("f")) &&
          s.shootCooldown <= 0
        ) {
          s.bullets.push({
            x: s.planeX + 36,
            y: s.planeY,
            vx: 12,
            vy: 0,
            friendly: true,
          });
          s.shootCooldown = 12;
        }

        // Fuel drain
        s.fuel -= 0.03;
        if (s.fuel <= 0) {
          s.gameOver = true;
          s.gameOverReason = "OUT OF FUEL!";
          onScore?.(s.score);
        }

        // Mountains
        for (const m of s.mountains) m.x -= s.speed;
        s.mountains = s.mountains.filter((m) => m.x > -m.w - 20);
        if (
          s.mountains.length === 0 ||
          W - s.mountains[s.mountains.length - 1].x > s.nextMountainX
        ) {
          const mh = 60 + Math.random() * (H * 0.5);
          s.mountains.push({
            x: W + 50,
            w: 120 + Math.random() * 100,
            h: mh,
            peak: 30 + Math.random() * 60,
          });
          s.nextMountainX = 200 + Math.random() * 250;
        }

        // Enemies
        for (const en of s.enemies) {
          en.x -= s.speed + 1;
          en.y += Math.sin(s.t * 0.05 + en.vy) * 2;
          en.bulletTimer--;
          if (en.bulletTimer <= 0) {
            s.bullets.push({
              x: en.x - 30,
              y: en.y,
              vx: -6,
              vy: 0,
              friendly: false,
            });
            en.bulletTimer = 90 + Math.floor(Math.random() * 60);
          }
        }
        s.enemies = s.enemies.filter((e) => e.x > -60);
        if (
          s.enemies.length < 3 &&
          (s.enemies.length === 0 ||
            W - s.enemies[s.enemies.length - 1].x > s.nextEnemyX)
        ) {
          s.enemies.push({
            x: W + 60,
            y: 80 + Math.random() * (H * 0.5),
            vx: 0,
            vy: Math.random() * 10,
            bulletTimer: 120,
            health: 1,
          });
          s.nextEnemyX = 400 + Math.random() * 300;
        }

        // Fuel pickups
        for (const f of s.fuels) {
          if (!f.collected) {
            f.x -= s.speed;
            const dx = f.x - s.planeX;
            const dy = f.y - s.planeY;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
              f.collected = true;
              s.fuel = Math.min(100, s.fuel + 30);
            }
          }
        }
        s.fuels = s.fuels.filter((f) => f.x > -30 && !f.collected);
        if (
          s.fuels.length < 2 &&
          W - (s.fuels[s.fuels.length - 1]?.x ?? 0) > s.nextFuelX
        ) {
          s.fuels.push({
            x: W + 60,
            y: 60 + Math.random() * (H - 100),
            collected: false,
          });
          s.nextFuelX = 300 + Math.random() * 200;
        }

        // Bullets
        for (const b of s.bullets) {
          b.x += b.vx;
          b.y += b.vy;
        }
        s.bullets = s.bullets.filter(
          (b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20,
        );

        // Bullet vs enemy
        for (const b of s.bullets.filter((x) => x.friendly)) {
          for (const en of s.enemies) {
            if (Math.abs(b.x - en.x) < 28 && Math.abs(b.y - en.y) < 14) {
              en.health--;
              b.vx = 0; // deactivate
              if (en.health <= 0) {
                s.score += 50;
                s.explosions.push({ x: en.x, y: en.y, r: 5, life: 40 });
                en.x = -1000;
              }
            }
          }
        }
        s.bullets = s.bullets.filter((b) => b.vx !== 0 || b.vy !== 0);

        // Enemy bullet vs player
        for (const b of s.bullets.filter((x) => !x.friendly)) {
          if (Math.abs(b.x - s.planeX) < 36 && Math.abs(b.y - s.planeY) < 12) {
            s.gameOver = true;
            s.gameOverReason = "SHOT DOWN!";
            s.explosions.push({ x: s.planeX, y: s.planeY, r: 10, life: 60 });
            onScore?.(s.score);
          }
        }

        // Mountain collision
        for (const m of s.mountains) {
          if (s.planeX + 36 > m.x && s.planeX - 36 < m.x + m.w) {
            const mTopH = m.h * ((s.planeX - m.x) / m.w);
            if (s.planeY + 15 > H - mTopH) {
              s.gameOver = true;
              s.gameOverReason = "CRASHED INTO MOUNTAIN!";
              s.explosions.push({ x: s.planeX, y: s.planeY, r: 15, life: 60 });
              onScore?.(s.score);
            }
          }
        }

        // Explosions
        for (const ex of s.explosions) {
          ex.r += 2;
          ex.life--;
        }
        s.explosions = s.explosions.filter((ex) => ex.life > 0);
      }

      // Draw mountains
      for (const m of s.mountains) drawMountain(m, H);

      // Draw enemies
      for (const en of s.enemies) {
        if (en.x > -60) drawEnemy(en.x, en.y);
      }

      // Draw fuel pickups
      for (const f of s.fuels) {
        if (!f.collected) {
          ctx.save();
          ctx.fillStyle = "#ffd93d";
          ctx.shadowColor = "#ffd93d";
          ctx.shadowBlur = 15;
          const pulse = 1 + 0.2 * Math.sin(s.t * 0.1);
          ctx.beginPath();
          ctx.arc(f.x, f.y, 12 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ff9f1c";
          ctx.shadowBlur = 0;
          ctx.font = "bold 10px Sora, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("⛽", f.x, f.y + 4);
          ctx.restore();
        }
      }

      // Draw bullets
      for (const b of s.bullets) {
        ctx.fillStyle = b.friendly ? "#4dffff" : "#ff4444";
        ctx.shadowColor = b.friendly ? "#4dffff" : "#ff4444";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw explosions
      for (const ex of s.explosions) {
        const alpha = ex.life / 40;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ff9f1c";
        ctx.shadowColor = "#ff9f1c";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw plane
      if (!s.gameOver || s.explosions.length === 0) {
        drawPlane(s.planeX, s.planeY);
      }

      if (s.started) {
        // HUD
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText(`Score: ${s.score}`, 16, 36);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "12px Sora, sans-serif";
        ctx.fillText("Collect ⛽ for fuel!", 16, 55);

        // Fuel bar
        const fuelBarW = 160;
        const fuelBarH = 14;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(W - fuelBarW - 16, 16, fuelBarW + 4, fuelBarH + 4);
        ctx.fillStyle = "#333";
        ctx.fillRect(W - fuelBarW - 14, 18, fuelBarW, fuelBarH);
        const fuelColor =
          s.fuel > 50 ? "#6bcb77" : s.fuel > 25 ? "#ffd93d" : "#ff4444";
        ctx.fillStyle = fuelColor;
        ctx.shadowColor = fuelColor;
        ctx.shadowBlur = 4;
        ctx.fillRect(
          W - fuelBarW - 14,
          18,
          fuelBarW * (s.fuel / 100),
          fuelBarH,
        );
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "11px Sora, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`FUEL ${Math.round(s.fuel)}%`, W - 16, 15);
      }

      if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 20;
        ctx.font = "bold 44px Bricolage Grotesque, sans-serif";
        ctx.fillText(s.gameOverReason, W / 2, H / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 10;
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Fly Again", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("SKY PILOT", W / 2, H / 2 - 60);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText(
          "WASD / Arrows: Fly | SPACE / F: Shoot",
          W / 2,
          H / 2 - 10,
        );
        ctx.fillText("Dodge mountains & enemy planes", W / 2, H / 2 + 18);
        ctx.fillText(
          "Collect ⛽ fuel pickups to keep flying!",
          W / 2,
          H / 2 + 44,
        );
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Take Off", W / 2, H / 2 + 88);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
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
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "pointer" }}
      />
      <div className="controls-legend">
        WASD/Arrows: Fly | SPACE/F: Shoot | Collect ⛽ Fuel
      </div>
    </div>
  );
}
