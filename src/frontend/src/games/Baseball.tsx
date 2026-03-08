import React, { useEffect, useRef, useCallback } from "react";

interface BaseballProps {
  onScore?: (score: number) => void;
}

type SwingResult = "HOME RUN!" | "HIT!" | "FOUL" | "MISS" | null;

export default function Baseball({ onScore }: BaseballProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    started: false,
    gameOver: false,
    score: 0,
    pitches: 0,
    maxPitches: 9,
    // Pitch state
    pitchActive: false,
    pitchX: 0,
    pitchY: 0,
    pitchTargetX: 0,
    pitchTargetY: 0,
    pitchProgress: 0,
    pitchSpeed: 0.018,
    pitchReady: false,
    pitchDelay: 0,
    // Swing state
    swinging: false,
    swingFrame: 0,
    swingResult: null as SwingResult,
    resultFrame: 0,
    // Ball after hit
    hitBallX: 0,
    hitBallY: 0,
    hitBallVX: 0,
    hitBallVY: 0,
    hitActive: false,
    t: 0,
  });
  const rafRef = useRef<number>(0);

  const startPitch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    if (s.gameOver || s.pitches >= s.maxPitches) return;
    const W = canvas.width;
    const H = canvas.height;
    s.pitchActive = true;
    s.pitchX = W - 100;
    s.pitchY = H / 2 - 20;
    s.pitchTargetX = 180;
    s.pitchTargetY = H / 2 + 20 + (Math.random() - 0.5) * 60;
    s.pitchProgress = 0;
    s.pitchSpeed = 0.014 + s.score * 0.002;
    s.swinging = false;
    s.swingResult = null;
    s.hitActive = false;
    s.pitchReady = false;
    s.pitchDelay = 0;
  }, []);

  const swing = useCallback(() => {
    const s = stateRef.current;
    if (!s.pitchActive || s.swinging || s.gameOver) return;

    s.swinging = true;
    s.swingFrame = 0;
    s.pitches++;

    // Determine timing based on ball proximity to plate
    const progress = s.pitchProgress;
    let result: SwingResult;
    if (progress >= 0.82 && progress <= 0.95) result = "HOME RUN!";
    else if (progress >= 0.72 && progress < 0.82) result = "HIT!";
    else if (progress >= 0.95) result = "FOUL";
    else if (progress >= 0.6) result = "FOUL";
    else result = "MISS";

    s.swingResult = result;
    s.resultFrame = 180;

    if (result === "HOME RUN!" || result === "HIT!") {
      s.score += result === "HOME RUN!" ? 3 : 1;
      const ballX = s.pitchX + (s.pitchTargetX - s.pitchX) * s.pitchProgress;
      const ballY = s.pitchY + (s.pitchTargetY - s.pitchY) * s.pitchProgress;
      const power = result === "HOME RUN!" ? 12 : 7;
      s.hitBallX = ballX;
      s.hitBallY = ballY;
      s.hitBallVX = -power - Math.random() * 3;
      s.hitBallVY = -(power * 0.7) - Math.random() * 3;
      s.hitActive = true;
    }

    s.pitchActive = false;

    if (s.pitches >= s.maxPitches) {
      setTimeout(() => {
        stateRef.current.gameOver = true;
        onScore?.(s.score);
      }, 1500);
    } else {
      setTimeout(() => startPitch(), 1800);
    }
  }, [startPitch, onScore]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.started = true;
    s.gameOver = false;
    s.score = 0;
    s.pitches = 0;
    s.swingResult = null;
    s.hitActive = false;
    s.pitchActive = false;
    s.pitchReady = false;
    s.swinging = false;
    setTimeout(() => startPitch(), 800);
  }, [startPitch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const drawBatter = (swingFrame: number, swinging: boolean) => {
      const H = canvas.height;
      const bx = 170;
      const by = H / 2 + 60;

      ctx.save();
      // Body
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(bx - 15, by - 60, 30, 50, 4);
      ctx.fill();
      // Head with helmet
      ctx.fillStyle = "#1a1aff";
      ctx.beginPath();
      ctx.arc(bx, by - 75, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(bx + 4, by - 73, 14, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = "#fff";
      ctx.fillRect(bx - 14, by - 12, 12, 35);
      ctx.fillRect(bx + 2, by - 12, 12, 35);
      // Bat
      const batAngle = swinging
        ? Math.min(swingFrame / 8, 1) * Math.PI * 0.9 - 0.4
        : -0.4;
      ctx.save();
      ctx.translate(bx + 10, by - 40);
      ctx.rotate(batAngle);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-4, -55, 8, 60);
      ctx.fillStyle = "#d4a017";
      ctx.beginPath();
      ctx.arc(0, -55, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    };

    const drawPitcher = () => {
      const W = canvas.width;
      const H = canvas.height;
      const px = W - 90;
      const py = H / 2 + 40;
      ctx.save();
      ctx.fillStyle = "#cc0000";
      // Body
      ctx.beginPath();
      ctx.roundRect(px - 12, py - 55, 24, 44, 3);
      ctx.fill();
      // Head
      ctx.fillStyle = "#e0b890";
      ctx.beginPath();
      ctx.arc(px, py - 70, 14, 0, Math.PI * 2);
      ctx.fill();
      // Cap
      ctx.fillStyle = "#880000";
      ctx.fillRect(px - 14, py - 82, 28, 10);
      ctx.beginPath();
      ctx.arc(px, py - 82, 12, Math.PI, 0);
      ctx.fill();
      // Legs
      ctx.fillStyle = "#fff";
      ctx.fillRect(px - 11, py - 12, 10, 30);
      ctx.fillRect(px + 1, py - 12, 10, 30);
      // Throwing arm
      ctx.strokeStyle = "#cc0000";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px + 12, py - 45);
      ctx.quadraticCurveTo(px + 35, py - 65, px + 20, py - 30);
      ctx.stroke();
      ctx.restore();
    };

    const gameLoop = () => {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      s.t++;

      // Background — baseball field
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
      skyGrad.addColorStop(0, "#001a33");
      skyGrad.addColorStop(1, "#003366");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.65);

      // Field
      ctx.fillStyle = "#2d5a1b";
      ctx.fillRect(0, H * 0.55, W, H * 0.45);

      // Dirt infield
      ctx.fillStyle = "#8b6914";
      ctx.beginPath();
      ctx.arc(W * 0.4, H * 0.8, W * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Base lines
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, H / 2 + 80);
      ctx.lineTo(W - 100, H / 2 - 30);
      ctx.stroke();

      // Strike zone indicator
      if (s.pitchActive || s.pitchReady) {
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(155, H / 2 - 30, 50, 100);
        ctx.setLineDash([]);
      }

      // Pitch progress bar
      if (s.started && !s.gameOver) {
        if (s.pitchActive) {
          const bpx = s.pitchX + (s.pitchTargetX - s.pitchX) * s.pitchProgress;
          const bpy =
            s.pitchY +
            (s.pitchTargetY - s.pitchY) * s.pitchProgress +
            Math.sin(s.pitchProgress * Math.PI) * -10;
          s.pitchProgress += s.pitchSpeed;

          if (s.pitchProgress >= 1.1) {
            s.pitchActive = false;
            if (!s.swinging) {
              s.swingResult = "MISS";
              s.resultFrame = 120;
              s.pitches++;
              if (s.pitches >= s.maxPitches) {
                setTimeout(() => {
                  stateRef.current.gameOver = true;
                  onScore?.(s.score);
                }, 1500);
              } else {
                setTimeout(() => startPitch(), 1500);
              }
            }
          }

          // Draw pitch ball
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "#fff";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(bpx, bpy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // Seams
          ctx.strokeStyle = "#cc2200";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(bpx - 2, bpy - 2, 6, -0.5, 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bpx + 2, bpy + 2, 6, Math.PI - 0.3, Math.PI + 0.8);
          ctx.stroke();
        }

        // Hit ball
        if (s.hitActive) {
          s.hitBallVY += 0.4;
          s.hitBallX += s.hitBallVX;
          s.hitBallY += s.hitBallVY;
          if (s.hitBallY > H + 50) s.hitActive = false;

          ctx.fillStyle = "#fff";
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(s.hitBallX, s.hitBallY, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Trail
          ctx.fillStyle = "rgba(255,215,0,0.3)";
          ctx.beginPath();
          ctx.arc(
            s.hitBallX - s.hitBallVX * 2,
            s.hitBallY - s.hitBallVY * 2,
            8,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        // Swing frame
        if (s.swinging) s.swingFrame++;

        // Result text
        if (s.resultFrame > 0) {
          s.resultFrame--;
          ctx.textAlign = "center";
          const resultAlpha = Math.min(1, s.resultFrame / 30);
          const colors: Record<string, string> = {
            "HOME RUN!": "#ffd700",
            "HIT!": "#6bcb77",
            FOUL: "#ff9f1c",
            MISS: "#ff6b6b",
          };
          const c = colors[s.swingResult ?? "MISS"] ?? "#fff";
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 20;
          ctx.globalAlpha = resultAlpha;
          ctx.font = "bold 52px Bricolage Grotesque, sans-serif";
          ctx.fillText(s.swingResult ?? "", W / 2, H / 2 - 60);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }

        drawPitcher();
        drawBatter(s.swingFrame, s.swinging);

        // HUD
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText(`Score: ${s.score}`, 16, 36);
        ctx.fillStyle = "#ffd93d";
        ctx.font = "16px Sora, sans-serif";
        ctx.fillText(`Pitches: ${s.pitches}/${s.maxPitches}`, 16, 60);

        // Timing bar
        if (s.pitchActive) {
          const barW = 200;
          const barX = W / 2 - barW / 2;
          const barY = H - 50;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(barX - 2, barY - 2, barW + 4, 24);
          ctx.fillStyle = "#444";
          ctx.fillRect(barX, barY, barW, 20);

          // Sweet spot (perfect zone)
          ctx.fillStyle = "rgba(255,215,0,0.6)";
          ctx.fillRect(barX + barW * 0.82, barY, barW * 0.13, 20);
          // Good zone
          ctx.fillStyle = "rgba(107,203,119,0.4)";
          ctx.fillRect(barX + barW * 0.72, barY, barW * 0.1, 20);

          // Indicator
          const ind = s.pitchProgress * barW;
          ctx.fillStyle = "#fff";
          ctx.fillRect(barX + ind - 2, barY - 3, 4, 26);

          ctx.fillStyle = "#aaa";
          ctx.font = "11px Sora, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Swing Timing", W / 2, barY - 6);
        }
      } else if (!s.started) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px Bricolage Grotesque, sans-serif";
        ctx.fillText("BASEBALL", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "18px Sora, sans-serif";
        ctx.fillText("Press SPACE or Click to Swing", W / 2, H / 2 + 5);
        ctx.fillText("Time your swing with the timing bar!", W / 2, H / 2 + 32);
        ctx.fillStyle = "#4d96ff";
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Start", W / 2, H / 2 + 72);
      } else if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 20;
        ctx.font = "bold 48px Bricolage Grotesque, sans-serif";
        ctx.fillText("GAME OVER!", W / 2, H / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "24px Sora, sans-serif";
        ctx.fillText(`Final Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#4d96ff";
        ctx.shadowColor = "#4d96ff";
        ctx.shadowBlur = 10;
        ctx.font = "bold 20px Bricolage Grotesque, sans-serif";
        ctx.fillText("Click to Play Again", W / 2, H / 2 + 60);
        ctx.shadowBlur = 0;
      }

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.started || s.gameOver) startGame();
        else swing();
      }
    };
    const handleClick = () => {
      const s = stateRef.current;
      if (!s.started || s.gameOver) startGame();
      else swing();
    };

    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("click", handleClick);
    };
  }, [startGame, startPitch, swing, onScore]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: "pointer" }}
      />
      <div className="controls-legend">
        SPACE / Click: Swing | Watch the timing bar!
      </div>
    </div>
  );
}
