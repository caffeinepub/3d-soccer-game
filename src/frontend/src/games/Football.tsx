import React, { useEffect, useRef, useCallback } from "react";

interface FootballProps {
  onScore?: (score: number) => void;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  number: number;
  color: string;
}

interface Receiver {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  routeT: number;
  routeMax: number;
  caught: boolean;
}

interface Defender {
  x: number;
  y: number;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  thrown: boolean;
  targetId: number;
}

export default function Football({ onScore }: FootballProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    gameOver: false,
    score: 0,
    downs: 1,
    distance: 10,
    yardsGained: 0,
    qb: { x: 0, y: 0, vx: 0, vy: 0, number: 12, color: "#003087" } as Player,
    receivers: [] as Receiver[],
    defenders: [] as Defender[],
    ball: { x: 0, y: 0, vx: 0, vy: 0, thrown: false, targetId: -1 } as Ball,
    hasBall: true,
    fieldOffset: 0,
    firstDownLine: 0,
    endZoneX: 0,
    fieldLength: 1000,
    result: "",
    resultFrame: 0,
    t: 0,
  });
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const initPlay = useCallback((canvas: HTMLCanvasElement) => {
    const s = stateRef.current;
    const W = canvas.width;
    const H = canvas.height;
    s.qb = { x: W * 0.3, y: H / 2, vx: 0, vy: 0, number: 12, color: "#003087" };
    s.hasBall = true;
    s.ball.thrown = false;

    // 3 receivers
    s.receivers = [
      {
        x: W * 0.3,
        y: H * 0.2,
        vx: 3,
        vy: 0,
        id: 1,
        routeT: 0,
        routeMax: 60,
        caught: false,
      },
      {
        x: W * 0.3,
        y: H * 0.5 - 40,
        vx: 3,
        vy: 1,
        id: 2,
        routeT: 0,
        routeMax: 80,
        caught: false,
      },
      {
        x: W * 0.3,
        y: H * 0.8,
        vx: 3,
        vy: -1,
        id: 3,
        routeT: 0,
        routeMax: 55,
        caught: false,
      },
    ];

    // 3 defenders
    s.defenders = [
      { x: W * 0.6, y: H * 0.2, speed: 2.2 },
      { x: W * 0.65, y: H / 2, speed: 2.5 },
      { x: W * 0.6, y: H * 0.8, speed: 2.2 },
    ];

    s.firstDownLine = s.qb.x + 200;
    s.endZoneX = canvas.width + 400;
    s.fieldOffset = 0;
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.started = true;
    s.gameOver = false;
    s.score = 0;
    s.downs = 1;
    s.distance = 10;
    s.yardsGained = 0;
    s.result = "";
    s.resultFrame = 0;
    initPlay(canvas);
  }, [initPlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.qb.x = canvas.width * 0.3;
    stateRef.current.qb.y = canvas.height / 2;

    const throwBall = (targetId: number) => {
      const s = stateRef.current;
      if (!s.hasBall || s.ball.thrown) return;
      const rec = s.receivers.find((r) => r.id === targetId);
      if (!rec) return;
      s.ball.x = s.qb.x;
      s.ball.y = s.qb.y;
      const dx = rec.x - s.qb.x;
      const dy = rec.y - s.qb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 14;
      s.ball.vx = (dx / dist) * speed;
      s.ball.vy = (dy / dist) * speed;
      s.ball.thrown = true;
      s.ball.targetId = targetId;
      s.hasBall = false;
    };

    const drawFieldMarkings = (offset: number) => {
      const W = canvas.width;
      const H = canvas.height;
      const yardW = 30;

      // Field lines
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const x = (i * yardW - (offset % yardW) + W) % W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Hash marks
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      const hashY1 = H * 0.4;
      const hashY2 = H * 0.6;
      for (let i = 0; i < 30; i++) {
        const x = (i * yardW - (offset % yardW) + W) % W;
        ctx.beginPath();
        ctx.moveTo(x - 5, hashY1);
        ctx.lineTo(x + 5, hashY1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 5, hashY2);
        ctx.lineTo(x + 5, hashY2);
        ctx.stroke();
      }
    };

    const drawPlayer = (x: number, y: number, color: string, num: number) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Sora, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${num}`, x, y);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    };

    const drawBall = (x: number, y: number) => {
      ctx.save();
      ctx.fillStyle = "#8b4513";
      ctx.shadowColor = "#ff9f1c";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        12,
        7,
        Math.atan2(stateRef.current.ball.vy, stateRef.current.ball.vx),
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.stroke();
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      s.t++;

      // Field background
      ctx.fillStyle = "#1a5c0a";
      ctx.fillRect(0, 0, W, H);

      // Darker stripes
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(i * (W / 10), 0, W / 10, H);
        }
      }

      drawFieldMarkings(s.fieldOffset);

      if (s.started && !s.gameOver) {
        // QB movement
        const speed = 3;
        s.qb.vx = 0;
        s.qb.vy = 0;
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("a"))
          s.qb.vx = -speed;
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("d"))
          s.qb.vx = speed;
        if (keysRef.current.has("ArrowUp") || keysRef.current.has("w"))
          s.qb.vy = -speed;
        if (keysRef.current.has("ArrowDown") || keysRef.current.has("s"))
          s.qb.vy = speed;
        s.qb.x += s.qb.vx;
        s.qb.y += s.qb.vy;
        s.qb.x = Math.max(20, Math.min(W - 20, s.qb.x));
        s.qb.y = Math.max(20, Math.min(H - 20, s.qb.y));

        // Receivers run routes
        for (const rec of s.receivers) {
          if (rec.caught) continue;
          rec.routeT++;
          if (rec.routeT < rec.routeMax) {
            rec.x += rec.vx;
            rec.y += rec.vy;
          } else {
            // Cut route
            rec.vx = 0;
            rec.vy = rec.vy > 0 ? -2 : 2;
            rec.x += rec.vx;
            rec.y += rec.vy;
          }
          rec.x = Math.max(20, Math.min(W - 20, rec.x));
          rec.y = Math.max(20, Math.min(H - 20, rec.y));
        }

        // Defenders AI
        for (const def of s.defenders) {
          if (!s.ball.thrown) {
            // Cover receivers
            const rec = s.receivers.find((r) => !r.caught);
            if (rec) {
              const dx = rec.x - def.x;
              const dy = rec.y - def.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d > 1) {
                def.x += (dx / d) * def.speed;
                def.y += (dy / d) * def.speed;
              }
            }
          } else {
            // Chase ball
            const dx = s.ball.x - def.x;
            const dy = s.ball.y - def.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > 1) {
              def.x += (dx / d) * def.speed;
              def.y += (dy / d) * def.speed;
            }
          }
        }

        // Ball physics
        if (s.ball.thrown) {
          s.ball.x += s.ball.vx;
          s.ball.y += s.ball.vy;
          s.ball.vx *= 0.995;

          // Check catch
          const target = s.receivers.find((r) => r.id === s.ball.targetId);
          if (target && !target.caught) {
            const dx = s.ball.x - target.x;
            const dy = s.ball.y - target.y;
            if (Math.sqrt(dx * dx + dy * dy) < 24) {
              target.caught = true;
              s.ball.thrown = false;
              s.hasBall = false;
              const yards = Math.round((target.x - s.qb.x) / 30);
              s.yardsGained += yards;
              s.result =
                yards >= 10 ? `${yards} YARDS! FIRST DOWN!` : `${yards} YARDS!`;
              s.resultFrame = 180;
              s.distance = Math.max(0, s.distance - yards);
              if (target.x > W * 0.85 || s.distance <= 0) {
                s.score++;
                s.result = "TOUCHDOWN!";
                s.resultFrame = 240;
                s.distance = 10;
                s.downs = 1;
                onScore?.(s.score);
                setTimeout(() => initPlay(canvas), 2000);
              } else {
                s.downs++;
                if (s.downs > 4) {
                  s.result = "TURNOVER ON DOWNS";
                  s.resultFrame = 180;
                  s.downs = 1;
                  s.distance = 10;
                  setTimeout(() => initPlay(canvas), 2000);
                }
              }
            }
          }

          // Interception
          for (const def of s.defenders) {
            const dx = s.ball.x - def.x;
            const dy = s.ball.y - def.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20 && s.ball.thrown) {
              s.ball.thrown = false;
              s.result = "INTERCEPTED!";
              s.resultFrame = 180;
              s.downs = 1;
              s.distance = 10;
              setTimeout(() => initPlay(canvas), 2000);
            }
          }

          // Ball out of bounds
          if (s.ball.x > W || s.ball.x < 0 || s.ball.y > H || s.ball.y < 0) {
            s.ball.thrown = false;
            s.result = "INCOMPLETE";
            s.resultFrame = 120;
            s.downs++;
            if (s.downs > 4) {
              s.downs = 1;
              s.distance = 10;
              s.result = "TURNOVER ON DOWNS";
            }
            setTimeout(() => initPlay(canvas), 1500);
          }
        }

        // First down line
        ctx.strokeStyle = "rgba(255,215,0,0.8)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(s.firstDownLine, 0);
        ctx.lineTo(s.firstDownLine, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // End zone
        ctx.fillStyle = "rgba(0,30,120,0.4)";
        ctx.fillRect(W * 0.9, 0, W * 0.1, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "bold 18px Bricolage Grotesque, sans-serif";
        ctx.save();
        ctx.translate(W * 0.95, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("END ZONE", 0, 0);
        ctx.restore();

        // Draw receivers
        for (const rec of s.receivers) {
          if (!rec.caught) {
            drawPlayer(rec.x, rec.y, "#003087", rec.id * 10 + 1);
            // Route number label
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 14px Sora, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${rec.id}`, rec.x, rec.y - 20);
          }
        }

        // Draw defenders
        for (const def of s.defenders) {
          drawPlayer(def.x, def.y, "#aa0000", 55);
        }

        // Draw QB
        drawPlayer(s.qb.x, s.qb.y, "#0044cc", s.qb.number);

        // Draw ball
        if (!s.ball.thrown && s.hasBall) {
          drawBall(s.qb.x + 16, s.qb.y - 5);
        } else if (s.ball.thrown) {
          drawBall(s.ball.x, s.ball.y);
        }

        // HUD
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText(`TD: ${s.score}`, 16, 36);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "14px Sora, sans-serif";
        ctx.fillText(`Down: ${s.downs} | ${s.distance} yds to go`, 16, 58);
        ctx.fillStyle = "#6bcb77";
        ctx.fillText("1=WR1  2=WR2  3=WR3  WASD=Move QB", 16, 78);

        // Result
        if (s.resultFrame > 0) {
          s.resultFrame--;
          ctx.textAlign = "center";
          const colors: Record<string, string> = {
            "TOUCHDOWN!": "#ffd700",
            "INTERCEPTED!": "#ff4444",
            "TURNOVER ON DOWNS": "#ff4444",
            INCOMPLETE: "#ff9f1c",
          };
          const c = colors[s.result] ?? "#6bcb77";
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 20;
          ctx.font = "bold 44px Bricolage Grotesque, sans-serif";
          ctx.fillText(s.result, W / 2, H / 2);
          ctx.shadowBlur = 0;
        }
      } else if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#6bcb77";
        ctx.shadowColor = "#6bcb77";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("FOOTBALL", W / 2, H / 2 - 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText("WASD / Arrows: Move QB", W / 2, H / 2 - 5);
        ctx.fillText("Press 1/2/3 to throw to a receiver", W / 2, H / 2 + 25);
        ctx.fillText(
          "Score touchdowns! 4 downs to get 10 yards.",
          W / 2,
          H / 2 + 50,
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
      e.preventDefault();
      const s = stateRef.current;
      if (!s.started) {
        startGame();
        return;
      }
      if (e.key === "1") throwBall(1);
      if (e.key === "2") throwBall(2);
      if (e.key === "3") throwBall(3);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    const handleClick = () => {
      if (!stateRef.current.started) startGame();
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
  }, [startGame, initPlay, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="controls-legend">
        WASD: Move QB | 1/2/3: Throw to Receiver
      </div>
    </div>
  );
}
