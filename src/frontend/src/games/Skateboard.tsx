import React, { useEffect, useRef, useCallback } from "react";

interface SkateboardProps {
  onScore?: (score: number) => void;
}

interface Obstacle {
  x: number;
  type: "ramp" | "rail" | "box";
  w: number;
  h: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export default function Skateboard({ onScore }: SkateboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    dead: false,
    score: 0,
    skaterX: 120,
    skaterY: 0,
    vy: 0,
    groundY: 0,
    onGround: false,
    speed: 4,
    obstacles: [] as Obstacle[],
    nextObsX: 350,
    frameCount: 0,
    bgOffset: 0,
    airborne: false,
    grinding: false,
    grindTimer: 0,
    trickText: "",
    trickFrame: 0,
    scorePopups: [] as ScorePopup[],
    rotation: 0,
    wheelRotation: 0,
    kickflipTimer: 0,
    heelflipTimer: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.onGround && !s.grinding) {
      s.vy = -13;
      s.onGround = false;
      s.airborne = true;
    }
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.started = true;
    s.dead = false;
    s.score = 0;
    s.skaterY = 0;
    s.vy = 0;
    s.speed = 4;
    s.obstacles = [];
    s.nextObsX = 350;
    s.frameCount = 0;
    s.bgOffset = 0;
    s.airborne = false;
    s.grinding = false;
    s.grindTimer = 0;
    s.scorePopups = [];
    s.rotation = 0;
    s.groundY = canvas.height - 70;
    s.skaterY = s.groundY - 45;
    s.onGround = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.groundY = canvas.height - 70;
    stateRef.current.skaterY = stateRef.current.groundY - 45;

    const spawnObstacle = (): Obstacle => {
      const roll = Math.random();
      const W = canvas.width;
      if (roll < 0.4) return { x: W + 50, type: "ramp", w: 60, h: 50 };
      if (roll < 0.7) return { x: W + 50, type: "rail", w: 100, h: 12 };
      return { x: W + 50, type: "box", w: 50, h: 40 };
    };

    const drawSkater = (
      sx: number,
      sy: number,
      rot: number,
      wRot: number,
      grinding: boolean,
    ) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rot);

      // Board
      ctx.fillStyle = grinding ? "#ff9f1c" : "#4d96ff";
      ctx.shadowColor = grinding ? "#ff9f1c" : "#4d96ff";
      ctx.shadowBlur = grinding ? 12 : 4;
      ctx.fillRect(-24, 20, 48, 8);
      ctx.shadowBlur = 0;

      // Wheels
      ctx.fillStyle = "#ddd";
      ctx.save();
      ctx.translate(-16, 28);
      ctx.rotate(wRot);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(16, 28);
      ctx.rotate(wRot);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(-8, 0, 16, 20);
      // Helmet
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(0, -18, 12, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    };

    const drawRamp = (obs: Obstacle) => {
      const s = stateRef.current;
      ctx.save();
      ctx.fillStyle = "#888";
      ctx.shadowColor = "#aaa";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(obs.x, s.groundY);
      ctx.lineTo(obs.x + obs.w, s.groundY);
      ctx.lineTo(obs.x + obs.w, s.groundY - obs.h);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Arrow
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(obs.x + 10, s.groundY - 8);
      ctx.lineTo(obs.x + obs.w - 5, s.groundY - obs.h + 5);
      ctx.stroke();
      ctx.restore();
    };

    const drawRail = (obs: Obstacle) => {
      const s = stateRef.current;
      ctx.save();
      ctx.fillStyle = "#c0c0c0";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 6;
      ctx.fillRect(obs.x, s.groundY - obs.h - 20, obs.w, obs.h);
      ctx.shadowBlur = 0;
      // Rails
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(obs.x, s.groundY - 28);
      ctx.lineTo(obs.x, s.groundY - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w, s.groundY - 28);
      ctx.lineTo(obs.x + obs.w, s.groundY - 8);
      ctx.stroke();
      ctx.restore();
    };

    const drawBox = (obs: Obstacle) => {
      const s = stateRef.current;
      ctx.save();
      const grad = ctx.createLinearGradient(
        obs.x,
        s.groundY - obs.h,
        obs.x + obs.w,
        s.groundY,
      );
      grad.addColorStop(0, "#6bcb77");
      grad.addColorStop(1, "#1a7a2a");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#6bcb77";
      ctx.shadowBlur = 6;
      ctx.fillRect(obs.x, s.groundY - obs.h, obs.w, obs.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x + 2, s.groundY - obs.h + 2, obs.w - 4, obs.h - 4);
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.frameCount++;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0a0f1a");
      bgGrad.addColorStop(0.7, "#1a1a2e");
      bgGrad.addColorStop(1, "#16213e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Moving background buildings
      s.bgOffset = (s.bgOffset + s.speed * 0.3) % W;
      const buildingColors = ["#1e1e3f", "#16213e", "#0f3460"];
      for (let i = 0; i < 8; i++) {
        const bx =
          ((((i * 140 - s.bgOffset * 0.3) % (W + 140)) + W + 140) % (W + 140)) -
          140;
        const bh = 60 + ((i * 37) % 100);
        ctx.fillStyle = buildingColors[i % 3];
        ctx.fillRect(bx, H - 70 - bh, 80, bh);
        // Windows
        ctx.fillStyle = "rgba(255,220,100,0.3)";
        for (let wx = bx + 8; wx < bx + 72; wx += 16) {
          for (let wy = H - 70 - bh + 10; wy < H - 80; wy += 20) {
            if (Math.random() > 0.3) ctx.fillRect(wx, wy, 8, 8);
          }
        }
      }

      // Ground
      const groundGrad = ctx.createLinearGradient(0, s.groundY, 0, H);
      groundGrad.addColorStop(0, "#2a2a4a");
      groundGrad.addColorStop(1, "#1a1a2e");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, s.groundY, W, H - s.groundY);

      // Ground line
      ctx.strokeStyle = "#4d96ff";
      ctx.shadowColor = "#4d96ff";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, s.groundY);
      ctx.lineTo(W, s.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Moving ground marks
      const markOff = (s.bgOffset * s.speed * 2) % 60;
      for (let x = -markOff; x < W; x += 60) {
        ctx.fillStyle = "rgba(77,150,255,0.15)";
        ctx.fillRect(x, s.groundY, 30, 2);
      }

      if (s.started && !s.dead) {
        s.speed = 4 + s.frameCount * 0.002;
        s.score = Math.floor(s.frameCount / 6);

        // Wheel rotation
        s.wheelRotation += s.speed * 0.15;

        // Tricks in air
        if (s.airborne) {
          if (keysRef.current.has("z") || keysRef.current.has("Z")) {
            s.kickflipTimer++;
            if (s.kickflipTimer === 1) {
              s.trickText = "KICKFLIP! +50";
              s.trickFrame = 90;
              s.score += 50;
              s.scorePopups.push({
                x: s.skaterX,
                y: s.skaterY - 30,
                text: "+50 KICKFLIP",
                life: 90,
              });
            }
          }
          if (keysRef.current.has("x") || keysRef.current.has("X")) {
            s.heelflipTimer++;
            if (s.heelflipTimer === 1) {
              s.trickText = "HEELFLIP! +60";
              s.trickFrame = 90;
              s.score += 60;
              s.scorePopups.push({
                x: s.skaterX,
                y: s.skaterY - 30,
                text: "+60 HEELFLIP",
                life: 90,
              });
            }
          }
          // Rotation for visual
          s.rotation += 0.08;
        } else {
          s.kickflipTimer = 0;
          s.heelflipTimer = 0;
          s.rotation = 0;
        }

        // Physics
        s.vy += 0.6;
        s.skaterY += s.vy;

        if (s.skaterY >= s.groundY - 45) {
          s.skaterY = s.groundY - 45;
          s.vy = 0;
          s.onGround = true;
          s.airborne = false;
          s.grinding = false;
        } else {
          s.onGround = false;
        }

        // Move obstacles
        for (const obs of s.obstacles) obs.x -= s.speed;
        s.obstacles = s.obstacles.filter((o) => o.x > -200);

        // Spawn
        const lastX =
          s.obstacles.length > 0 ? s.obstacles[s.obstacles.length - 1].x : 0;
        if (lastX < W - s.nextObsX) {
          s.obstacles.push(spawnObstacle());
          s.nextObsX = 200 + Math.random() * 200;
        }

        // Collision / grind
        for (const obs of s.obstacles) {
          if (obs.type === "ramp") {
            // Ramp: launch player
            if (
              s.skaterX + 20 > obs.x &&
              s.skaterX - 20 < obs.x + obs.w &&
              s.skaterY + 45 >= s.groundY - obs.h &&
              s.vy >= 0
            ) {
              s.vy = -15;
              s.onGround = false;
              s.airborne = true;
              s.scorePopups.push({
                x: s.skaterX,
                y: s.skaterY,
                text: "RAMP!",
                life: 60,
              });
            }
          } else if (obs.type === "rail") {
            const railTop = s.groundY - obs.h - 20;
            if (
              s.skaterX + 20 > obs.x &&
              s.skaterX - 20 < obs.x + obs.w &&
              s.skaterY + 45 >= railTop - 5 &&
              s.skaterY + 45 <= railTop + 10
            ) {
              s.skaterY = railTop - 45;
              s.vy = 0;
              s.onGround = true;
              s.grinding = true;
              s.grindTimer++;
              if (s.grindTimer % 60 === 1) {
                const pts = 30;
                s.score += pts;
                s.scorePopups.push({
                  x: s.skaterX,
                  y: s.skaterY - 20,
                  text: `+${pts} GRIND`,
                  life: 60,
                });
              }
            }
          } else if (obs.type === "box") {
            // Box: collision
            const margin = 8;
            if (
              s.skaterX + margin < obs.x + obs.w &&
              s.skaterX - margin > obs.x &&
              s.skaterY + 45 > s.groundY - obs.h &&
              s.skaterY < s.groundY - obs.h + 10
            ) {
              // Land on top
              s.skaterY = s.groundY - obs.h - 45;
              s.vy = 0;
              s.onGround = true;
            } else if (
              s.skaterX + 20 > obs.x &&
              s.skaterX - 20 < obs.x + obs.w &&
              s.skaterY + 45 > s.groundY - obs.h
            ) {
              // Hit side
              s.dead = true;
              onScore?.(s.score);
            }
          }
        }

        // Auto jump key
        if (
          keysRef.current.has(" ") ||
          keysRef.current.has("ArrowUp") ||
          keysRef.current.has("w")
        ) {
          jump();
        }
      }

      // Draw obstacles
      for (const obs of s.obstacles) {
        if (obs.type === "ramp") drawRamp(obs);
        else if (obs.type === "rail") drawRail(obs);
        else drawBox(obs);
      }

      // Score popups
      for (const p of s.scorePopups) {
        p.y -= 1;
        p.life--;
        ctx.globalAlpha = p.life / 90;
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 8;
        ctx.font = "bold 16px Bricolage Grotesque, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(p.text, p.x, p.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      s.scorePopups = s.scorePopups.filter((p) => p.life > 0);

      // Draw skater
      drawSkater(s.skaterX, s.skaterY, s.rotation, s.wheelRotation, s.grinding);

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 16, 36);
      ctx.fillStyle = "#4d96ff";
      ctx.font = "13px Sora, sans-serif";
      ctx.fillText(
        "SPACE/Up: Ollie  Z: Kickflip  X: Heelflip (in air)",
        16,
        56,
      );

      // Grinding indicator
      if (s.grinding) {
        ctx.fillStyle = "#ff9f1c";
        ctx.shadowColor = "#ff9f1c";
        ctx.shadowBlur = 10;
        ctx.font = "bold 24px Bricolage Grotesque, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GRINDING! 🛹", W / 2, 50);
        ctx.shadowBlur = 0;
      }

      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
        ctx.fillText("BAILED!", W / 2, H / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 15);
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 10;
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Press SPACE or Tap to Restart", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("SKATEBOARD", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText(
          "SPACE/Up: Ollie | Z (in air): Kickflip | X: Heelflip",
          W / 2,
          H / 2 + 5,
        );
        ctx.fillText(
          "Land on rails to GRIND for bonus points!",
          W / 2,
          H / 2 + 30,
        );
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 72);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w")
        e.preventDefault();
      const s = stateRef.current;
      if (!s.started) resetGame();
      else if (s.dead) resetGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      const s = stateRef.current;
      if (!s.started || s.dead) resetGame();
      else jump();
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
      <div className="controls-legend">
        SPACE/Up: Ollie | Z: Kickflip | X: Heelflip (in air)
      </div>
    </div>
  );
}
