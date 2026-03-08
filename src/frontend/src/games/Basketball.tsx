import React, { useEffect, useRef, useCallback } from "react";

interface BasketballProps {
  onScore?: (score: number) => void;
}

interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  scored: boolean;
}

export default function Basketball({ onScore }: BasketballProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    score: 0,
    timeLeft: 30,
    gameOver: false,
    started: false,
    hoopX: 0,
    hoopY: 0,
    hoopW: 70,
    hoopH: 50,
    ball: {
      x: 120,
      y: 0,
      vx: 0,
      vy: 0,
      active: false,
      scored: false,
    } as BallState,
    aimX: 0,
    aimY: 0,
    aiming: false,
    mouseX: 0,
    mouseY: 0,
    showMiss: 0,
    showScore: 0,
    level: 1,
  });
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetBall = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.ball = {
      x: 100 + Math.random() * 80,
      y: canvas.height - 80,
      vx: 0,
      vy: 0,
      active: false,
      scored: false,
    };
    s.aiming = false;
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.started = true;
    s.gameOver = false;
    s.score = 0;
    s.timeLeft = 30;
    s.level = 1;
    s.hoopX = canvas.width - 160;
    s.hoopY = canvas.height - 200;
    resetBall();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const st = stateRef.current;
      if (st.gameOver) return;
      st.timeLeft--;
      if (st.timeLeft <= 0) {
        st.gameOver = true;
        onScore?.(st.score);
        clearInterval(timerRef.current!);
      }
    }, 1000);
  }, [resetBall, onScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    stateRef.current.ball.y = canvas.height - 80;

    const drawHoop = (hx: number, hy: number, hw: number, hh: number) => {
      // Backboard
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(hx + hw - 6, hy - 40, 12, 90);
      ctx.strokeStyle = "#cc2200";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + hw + 2, hy - 20, 0, 50);

      // Board inner square
      ctx.strokeStyle = "#cc2200";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + hw - 2, hy - 15, 6, 30);

      // Rim
      ctx.strokeStyle = "#ff6600";
      ctx.shadowColor = "#ff6600";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + hw, hy);
      ctx.stroke();

      // Net
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) {
        const netX = hx + (i * hw) / 4;
        ctx.beginPath();
        ctx.moveTo(netX, hy);
        ctx.lineTo(hx + hw * 0.1 + (i * hw * 0.8) / 4, hy + hh);
        ctx.stroke();
      }
      for (let j = 1; j <= 3; j++) {
        const ny = hy + (j * hh) / 3;
        const spread = (j / 3) * hw * 0.2;
        ctx.beginPath();
        ctx.moveTo(hx + spread, ny);
        ctx.lineTo(hx + hw - spread, ny);
        ctx.stroke();
      }
    };

    const drawBall = (bx: number, by: number) => {
      const r = 20;
      const grad = ctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, r);
      grad.addColorStop(0, "#ff9a3c");
      grad.addColorStop(0.7, "#e85d00");
      grad.addColorStop(1, "#8b2500");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#ff6a00";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Lines
      ctx.strokeStyle = "#8b2500";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - r, by);
      ctx.lineTo(bx + r, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.6, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        bx,
        by,
        r * 0.6,
        Math.PI - Math.PI * 0.4,
        Math.PI + Math.PI * 0.4,
      );
      ctx.stroke();
    };

    const drawTrajectory = (sx: number, sy: number, mx: number, my: number) => {
      const dx = mx - sx;
      const dy = my - sy;
      const vx = dx * 0.08;
      const vy = dy * 0.08;

      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(255,220,100,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let tx = sx;
      let ty = sy;
      let tvx = vx;
      let tvy = vy;
      for (let i = 0; i < 40; i++) {
        tvy += 0.5;
        tx += tvx;
        ty += tvy;
        if (ty > canvas.height || tx > canvas.width) break;
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Background — basketball court
      const courtGrad = ctx.createLinearGradient(0, 0, 0, H);
      courtGrad.addColorStop(0, "#1a0a00");
      courtGrad.addColorStop(1, "#2d1200");
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 0, W, H);

      // Court floor
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(0, H - 30, W, 30);
      // Floor lines
      ctx.strokeStyle = "rgba(255,200,100,0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      ctx.beginPath();
      ctx.moveTo(0, H - 30);
      ctx.lineTo(W, H - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Court markings
      ctx.strokeStyle = "rgba(255,200,100,0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(W / 2, H - 30, 80, Math.PI, 0);
      ctx.stroke();

      if (s.started) {
        // Physics
        if (s.ball.active) {
          s.ball.vy += 0.5;
          s.ball.x += s.ball.vx;
          s.ball.y += s.ball.vy;

          // Bounce off walls
          if (s.ball.x < 20 || s.ball.x > W - 20) s.ball.vx *= -0.7;
          if (s.ball.x < 20) s.ball.x = 20;
          if (s.ball.x > W - 20) s.ball.x = W - 20;

          // Floor bounce / reset
          if (s.ball.y > H - 50 && !s.ball.scored) {
            if (s.ball.vy > 2) {
              s.ball.vy *= -0.5;
              s.ball.vx *= 0.8;
              s.ball.y = H - 50;
              if (Math.abs(s.ball.vy) < 1) {
                s.showMiss = 60;
                resetBall();
              }
            }
          }

          // Score check: ball passes through rim
          const hx = s.hoopX;
          const hy = s.hoopY;
          const hw = s.hoopW;
          if (
            !s.ball.scored &&
            s.ball.x > hx + 5 &&
            s.ball.x < hx + hw - 5 &&
            s.ball.y > hy - 5 &&
            s.ball.y < hy + 15 &&
            s.ball.vy > 0
          ) {
            s.ball.scored = true;
            s.score++;
            s.showScore = 90;
            // Level up every 3 points
            if (s.score % 3 === 0) {
              s.level++;
              s.hoopY = Math.max(80, s.hoopY - 20);
              s.hoopX = Math.min(W - 100, s.hoopX + 10);
            }
            setTimeout(() => resetBall(), 800);
          }

          // Off screen
          if (s.ball.x > W + 50 || s.ball.y > H + 50) {
            s.showMiss = 60;
            resetBall();
          }
        }

        // Hoop
        drawHoop(s.hoopX, s.hoopY, s.hoopW, s.hoopH);

        // Trajectory preview when aiming
        if (!s.ball.active) {
          drawTrajectory(s.ball.x, s.ball.y, s.mouseX, s.mouseY);
        }

        // Ball
        drawBall(s.ball.x, s.ball.y);

        // UI
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px Bricolage Grotesque, sans-serif";
        ctx.fillText(`Score: ${s.score}`, 16, 36);
        ctx.fillStyle = s.timeLeft <= 10 ? "#ff4444" : "#ffd93d";
        ctx.fillText(`Time: ${s.timeLeft}s`, 16, 64);
        ctx.fillStyle = "#4d96ff";
        ctx.font = "14px Sora, sans-serif";
        ctx.fillText(`Level: ${s.level}`, 16, 88);

        // Miss / Score indicators
        if (s.showMiss > 0) {
          s.showMiss--;
          ctx.textAlign = "center";
          ctx.fillStyle = "#ff4444";
          ctx.shadowColor = "#ff4444";
          ctx.shadowBlur = 10;
          ctx.font = "bold 36px Bricolage Grotesque, sans-serif";
          ctx.fillText("MISS!", W / 2, H / 2);
          ctx.shadowBlur = 0;
        }
        if (s.showScore > 0) {
          s.showScore--;
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffd93d";
          ctx.shadowColor = "#ffd93d";
          ctx.shadowBlur = 15;
          ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
          ctx.fillText("SCORE! +1", W / 2, H / 2);
          ctx.shadowBlur = 0;
        }

        if (s.gameOver) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(0, 0, W, H);
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffd93d";
          ctx.shadowColor = "#ffd93d";
          ctx.shadowBlur = 20;
          ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
          ctx.fillText("TIME'S UP!", W / 2, H / 2 - 50);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.font = "28px Sora, sans-serif";
          ctx.fillText(`Final Score: ${s.score}`, W / 2, H / 2 + 10);
          ctx.fillStyle = "#4d96ff";
          ctx.shadowColor = "#4d96ff";
          ctx.shadowBlur = 10;
          ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
          ctx.fillText("Click to Play Again", W / 2, H / 2 + 60);
          ctx.shadowBlur = 0;
        }
      } else {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("BASKETBALL", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "18px Sora, sans-serif";
        ctx.fillText("Click to aim and shoot!", W / 2, H / 2 + 10);
        ctx.fillText(
          "30 seconds to score as many as you can!",
          W / 2,
          H / 2 + 38,
        );
        ctx.fillStyle = "#ffd93d";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 80);
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouseX = (e.clientX - rect.left) * scaleX;
      stateRef.current.mouseY = (e.clientY - rect.top) * scaleY;
    };

    const handleClick = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s.started || s.gameOver) {
        startGame();
        return;
      }
      if (s.ball.active) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const dx = mx - s.ball.x;
      const dy = my - s.ball.y;
      s.ball.vx = dx * 0.08;
      s.ball.vy = dy * 0.08;
      s.ball.active = true;
    };

    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startGame, resetBall]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "crosshair" }}
      />
      <div className="controls-legend">Click to Aim &amp; Shoot</div>
    </div>
  );
}
