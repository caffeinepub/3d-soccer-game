import React, { useEffect, useRef, useCallback } from "react";

interface BikeProps {
  onScore?: (score: number) => void;
}

interface Ramp {
  x: number;
  w: number;
  h: number;
  type: "up" | "down" | "both";
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export default function Bike({ onScore }: BikeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    crashed: false,
    score: 0,
    bikeX: 120,
    bikeY: 0,
    vy: 0,
    groundY: 0,
    onGround: false,
    speed: 4,
    rotation: 0,
    angularVel: 0,
    ramps: [] as Ramp[],
    nextRampX: 300,
    frameCount: 0,
    bgOffset: 0,
    flipCount: 0,
    lastFlipAngle: 0,
    airTime: 0,
    scorePopups: [] as ScorePopup[],
    wheelRotation: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.started = true;
    s.crashed = false;
    s.score = 0;
    s.bikeY = 0;
    s.vy = 0;
    s.speed = 4;
    s.rotation = 0;
    s.angularVel = 0;
    s.ramps = [];
    s.nextRampX = 300;
    s.frameCount = 0;
    s.bgOffset = 0;
    s.flipCount = 0;
    s.airTime = 0;
    s.scorePopups = [];
    s.wheelRotation = 0;
    s.groundY = canvas.height - 60;
    s.bikeY = s.groundY - 40;
    s.onGround = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.groundY = canvas.height - 60;
    stateRef.current.bikeY = stateRef.current.groundY - 40;

    const spawnRamp = (): Ramp => {
      const W = canvas.width;
      const roll = Math.random();
      if (roll < 0.4) return { x: W + 50, w: 80, h: 50, type: "up" };
      if (roll < 0.7) return { x: W + 50, w: 80, h: 50, type: "down" };
      return { x: W + 50, w: 120, h: 60, type: "both" };
    };

    const drawBike = (
      bx: number,
      by: number,
      rot: number,
      wRot: number,
      crashed: boolean,
    ) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);

      // Frame
      ctx.strokeStyle = crashed ? "#888" : "#ff9f1c";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.shadowColor = crashed ? "#888" : "#ff9f1c";
      ctx.shadowBlur = 8;
      // Main frame
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(0, -20);
      ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
      // Fork
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Wheels
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 3;
      ctx.save();
      ctx.translate(-18, 0);
      ctx.rotate(wRot);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(18, 0);
      ctx.rotate(wRot);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.restore();

      // Rider
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(0, -32, 10, 0, Math.PI * 2);
      ctx.fill();
      // Helmet
      ctx.fillStyle = crashed ? "#666" : "#4d96ff";
      ctx.beginPath();
      ctx.arc(0, -40, 12, Math.PI, 0);
      ctx.fill();
      // Body
      ctx.fillStyle = crashed ? "#888" : "#cc2200";
      ctx.beginPath();
      ctx.roundRect(-8, -22, 16, 24, 3);
      ctx.fill();

      ctx.restore();
    };

    const drawRamp = (ramp: Ramp) => {
      const s = stateRef.current;
      ctx.save();
      ctx.fillStyle = "#8b6914";
      ctx.shadowColor = "#d4a017";
      ctx.shadowBlur = 4;
      if (ramp.type === "up" || ramp.type === "both") {
        ctx.beginPath();
        ctx.moveTo(ramp.x, s.groundY);
        ctx.lineTo(ramp.x + ramp.w / 2, s.groundY);
        ctx.lineTo(ramp.x + ramp.w / 2, s.groundY - ramp.h);
        ctx.closePath();
        ctx.fill();
      }
      if (ramp.type === "down" || ramp.type === "both") {
        const startX = ramp.type === "both" ? ramp.x + ramp.w / 2 : ramp.x;
        const endX =
          ramp.type === "both" ? ramp.x + ramp.w : ramp.x + ramp.w / 2;
        const startH = ramp.type === "both" ? ramp.h : 0;
        ctx.beginPath();
        ctx.moveTo(startX, s.groundY - startH);
        ctx.lineTo(endX, s.groundY);
        ctx.lineTo(startX, s.groundY);
        if (ramp.type === "both") ctx.lineTo(startX, s.groundY - startH);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.frameCount++;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0a0520");
      bgGrad.addColorStop(0.5, "#2a1a4a");
      bgGrad.addColorStop(1, "#3a1a0a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      s.bgOffset = (s.bgOffset + s.speed * 0.1) % W;
      for (let i = 0; i < 20; i++) {
        const sx = (((i * 97 - s.bgOffset * 0.2) % W) + W) % W;
        const sy = (i * 47) % (H * 0.5);
        ctx.fillStyle = `rgba(255,255,200,${0.3 + (i % 3) * 0.2})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant mountains
      ctx.fillStyle = "#1a0a3a";
      for (let i = 0; i < 6; i++) {
        const mx =
          ((((i * 180 - s.bgOffset * 0.15) % (W + 180)) + W + 180) %
            (W + 180)) -
          180;
        ctx.beginPath();
        ctx.moveTo(mx, H - 60);
        ctx.lineTo(mx + 90, H - 150 - ((i * 23) % 60));
        ctx.lineTo(mx + 180, H - 60);
        ctx.fill();
      }

      // Dirt ground
      const groundGrad = ctx.createLinearGradient(0, s.groundY, 0, H);
      groundGrad.addColorStop(0, "#5a3a1a");
      groundGrad.addColorStop(1, "#2a1a0a");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, s.groundY, W, H - s.groundY);
      ctx.strokeStyle = "#d4a017";
      ctx.shadowColor = "#d4a017";
      ctx.shadowBlur = 4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, s.groundY);
      ctx.lineTo(W, s.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (s.started && !s.crashed) {
        s.speed = 4 + s.frameCount * 0.002;
        s.score = Math.floor(s.frameCount / 6);
        s.wheelRotation += s.speed * 0.12;

        // Physics
        s.vy += 0.55;
        s.bikeY += s.vy;

        // Ramp interaction
        let onRamp = false;
        for (const ramp of s.ramps) {
          const rampTopY = (bx: number): number => {
            if (ramp.type === "up") {
              const progress = (bx - ramp.x) / (ramp.w / 2);
              if (progress >= 0 && progress <= 1)
                return s.groundY - ramp.h * progress;
              return s.groundY;
            }
            if (ramp.type === "down") {
              const progress = (bx - ramp.x) / (ramp.w / 2);
              if (progress >= 0 && progress <= 1)
                return s.groundY - ramp.h * (1 - progress);
              return s.groundY;
            }
            if (ramp.type === "both") {
              const halfW = ramp.w / 2;
              if (bx >= ramp.x && bx <= ramp.x + halfW) {
                return s.groundY - ramp.h * ((bx - ramp.x) / halfW);
              }
              if (bx > ramp.x + halfW && bx <= ramp.x + ramp.w) {
                return s.groundY - ramp.h * (1 - (bx - ramp.x - halfW) / halfW);
              }
            }
            return s.groundY;
          };

          const rTop = rampTopY(s.bikeX);
          if (
            rTop < s.groundY &&
            s.bikeX >= ramp.x &&
            s.bikeX <= ramp.x + ramp.w
          ) {
            if (s.bikeY + 40 >= rTop) {
              s.bikeY = rTop - 40;
              s.vy = 0;
              s.onGround = true;
              onRamp = true;
              // Launch off ramp peak
              if (ramp.type === "up" && s.bikeX > ramp.x + ramp.w * 0.4) {
                s.vy = -12;
                s.onGround = false;
              }
            }
          }
        }

        if (!onRamp) {
          if (s.bikeY >= s.groundY - 40) {
            const wasAirborne = !s.onGround;
            s.bikeY = s.groundY - 40;
            s.vy = 0;

            // Check landing rotation
            if (wasAirborne) {
              const normalizedAngle =
                ((s.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              if (
                normalizedAngle < 0.5 ||
                normalizedAngle > Math.PI * 2 - 0.5
              ) {
                // Landed upright
                if (s.flipCount > 0) {
                  const pts = s.flipCount * 100;
                  s.score += pts;
                  s.scorePopups.push({
                    x: s.bikeX,
                    y: s.bikeY - 60,
                    text: `${s.flipCount} FLIP${s.flipCount > 1 ? "S" : ""}! +${pts}`,
                    life: 90,
                  });
                  s.flipCount = 0;
                }
                s.angularVel = 0;
                s.airTime = 0;
              } else {
                // Crash
                s.crashed = true;
                onScore?.(s.score);
              }
            }
            s.onGround = true;
            s.rotation = 0;
          } else {
            s.onGround = false;
          }
        }

        // Air rotation
        if (!s.onGround) {
          s.airTime++;
          if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a")) {
            s.angularVel -= 0.02;
          }
          if (keysRef.current.has("ArrowRight") || keysRef.current.has("d")) {
            s.angularVel += 0.02;
          }
          s.rotation += s.angularVel;
          // Count full flips
          const prevFlips = Math.floor(
            Math.abs(s.lastFlipAngle) / (Math.PI * 2),
          );
          const currFlips = Math.floor(Math.abs(s.rotation) / (Math.PI * 2));
          if (currFlips > prevFlips) s.flipCount++;
          s.lastFlipAngle = s.rotation;
        } else {
          s.angularVel *= 0.8;
        }

        // Jump
        if (
          (keysRef.current.has(" ") ||
            keysRef.current.has("ArrowUp") ||
            keysRef.current.has("w")) &&
          s.onGround
        ) {
          s.vy = -13;
          s.onGround = false;
          s.rotation = 0;
          s.angularVel = 0;
          s.flipCount = 0;
          s.lastFlipAngle = 0;
        }

        // Move ramps
        for (const r of s.ramps) r.x -= s.speed;
        s.ramps = s.ramps.filter((r) => r.x > -200);

        // Spawn ramps
        const lastRX = s.ramps.length > 0 ? s.ramps[s.ramps.length - 1].x : 0;
        if (lastRX < W - s.nextRampX) {
          s.ramps.push(spawnRamp());
          s.nextRampX = 250 + Math.random() * 200;
        }
      }

      // Draw ramps
      for (const r of s.ramps) drawRamp(r);

      // Score popups
      for (const p of s.scorePopups) {
        p.y -= 1.2;
        p.life--;
        ctx.globalAlpha = Math.min(1, p.life / 30);
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 8;
        ctx.font = "bold 18px Bricolage Grotesque, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      s.scorePopups = s.scorePopups.filter((p) => p.life > 0);

      // Draw bike
      drawBike(s.bikeX, s.bikeY, s.rotation, s.wheelRotation, s.crashed);

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 16, 36);
      if (!s.onGround && s.airTime > 0) {
        ctx.fillStyle = "#ff9f1c";
        ctx.font = "bold 16px Sora, sans-serif";
        ctx.fillText(`Flips: ${s.flipCount} | Air: ${s.airTime}f`, 16, 60);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "12px Sora, sans-serif";
        ctx.fillText("← → to rotate | Land upright for points!", 16, 80);
      }

      if (s.crashed) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff4444";
        ctx.shadowColor = "#ff4444";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
        ctx.fillText("CRASHED!", W / 2, H / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 15);
        ctx.fillStyle = "#ff9f1c";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Land upright after flips to score!", W / 2, H / 2 + 50);
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 10;
        ctx.fillText("Click to Restart", W / 2, H / 2 + 85);
        ctx.shadowBlur = 0;
      }

      if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff9f1c";
        ctx.shadowColor = "#ff9f1c";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("BMX BIKE", W / 2, H / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText("SPACE/Up: Jump off ramps", W / 2, H / 2 - 5);
        ctx.fillText("← → in air: Rotate for flips!", W / 2, H / 2 + 22);
        ctx.fillText(
          "Land UPRIGHT to score. Crash = Game Over.",
          W / 2,
          H / 2 + 48,
        );
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 90);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
      const s = stateRef.current;
      if (!s.started || s.crashed) resetGame();
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      const s = stateRef.current;
      if (!s.started || s.crashed) resetGame();
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
  }, [resetGame, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "pointer" }}
      />
      <div className="controls-legend">
        SPACE/Up: Jump | ← →: Rotate (air) | Land upright to score
      </div>
    </div>
  );
}
