import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Ball } from "../game/ball";
import { GameCamera } from "../game/camera";
import { createEngine } from "../game/engine";
import { SoccerField } from "../game/field";
import { InputManager } from "../game/input";
import { FreeKickMode } from "../game/modes/freeKick";
import { KickoffMode } from "../game/modes/kickoff";
import { PenaltyMode } from "../game/modes/penalty";
import { HUD } from "./HUD";
import { MobileControls } from "./MobileControls";

export type GameModeType = "freeKick" | "penalty" | "kickoff";

interface GameCanvasProps {
  mode: GameModeType;
  onGameOver: (score: number, homeScore?: number, awayScore?: number) => void;
}

interface HudState {
  powerBar: number;
  isCharging: boolean;
  homeScore: number;
  awayScore: number;
  timeRemaining: number;
  roundMessage: string;
  playerScore: number;
  aiScore: number;
  round: number;
  maxRounds: number;
  isPlayerTurn: boolean;
  penaltyMessage: string;
  suddenDeath: boolean;
  controlledPlayerNumber: number;
  isPlayerKeeping: boolean;
}

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function GameCanvas({ mode, onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const inputManagerRef = useRef<InputManager | null>(null);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [hudState, setHudState] = useState<HudState>({
    powerBar: 0,
    isCharging: false,
    homeScore: 0,
    awayScore: 0,
    timeRemaining: mode === "freeKick" ? 60 : 180,
    roundMessage: "",
    playerScore: 0,
    aiScore: 0,
    round: 1,
    maxRounds: 5,
    isPlayerTurn: true,
    penaltyMessage: "",
    suddenDeath: false,
    controlledPlayerNumber: 10,
    isPlayerKeeping: false,
  });

  const [showMobile] = useState(isTouchDevice());

  const handleSwitchPlayer = useCallback(() => {
    if (inputManagerRef.current) {
      inputManagerRef.current.setTouchSwitch(true);
      setTimeout(() => inputManagerRef.current?.setTouchSwitch(false), 150);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Setup engine
    const engine = createEngine(canvas);
    const { renderer, scene, camera, clock } = engine;

    // Field
    new SoccerField(scene);

    // Ball
    const ball = new Ball(scene);

    // Input
    const input = new InputManager();
    inputManagerRef.current = input;

    // Camera
    const gameCamera = new GameCamera(camera);

    // Mode instance
    let freeKickMode: FreeKickMode | null = null;
    let penaltyMode: PenaltyMode | null = null;
    let kickoffMode: KickoffMode | null = null;

    if (mode === "freeKick") {
      freeKickMode = new FreeKickMode(scene, ball, input, gameCamera);
    } else if (mode === "penalty") {
      penaltyMode = new PenaltyMode(scene, ball, input, gameCamera);
    } else {
      kickoffMode = new KickoffMode(scene, ball, input, gameCamera);
    }

    let gameOver = false;

    // Animation loop
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      input.update(dt);

      if (mode === "freeKick" && freeKickMode) {
        const state = freeKickMode.update(dt);
        setHudState((prev) => ({
          ...prev,
          powerBar: input.state.powerBar,
          isCharging: input.state.isCharging,
          homeScore: state.score,
          timeRemaining: state.timeRemaining,
          roundMessage: state.roundMessage,
        }));
        if (state.isGameOver && !gameOver) {
          gameOver = true;
          setTimeout(() => onGameOverRef.current(state.finalScore), 1000);
        }
      } else if (mode === "penalty" && penaltyMode) {
        const state = penaltyMode.update(dt);
        setHudState((prev) => ({
          ...prev,
          powerBar: input.state.powerBar,
          isCharging: input.state.isCharging,
          playerScore: state.playerScore,
          aiScore: state.aiScore,
          round: state.round,
          maxRounds: state.maxRounds,
          isPlayerTurn: state.isPlayerTurn,
          penaltyMessage: state.resultMessage,
          suddenDeath: state.suddenDeath,
          isPlayerKeeping: state.isPlayerKeeping,
        }));
        if (state.isGameOver && !gameOver) {
          gameOver = true;
          setTimeout(() => onGameOverRef.current(state.playerScore), 1500);
        }
      } else if (mode === "kickoff" && kickoffMode) {
        const state = kickoffMode.update(dt);
        setHudState((prev) => ({
          ...prev,
          powerBar: input.state.powerBar,
          isCharging: input.state.isCharging,
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          timeRemaining: state.timeRemaining,
          roundMessage: state.roundMessage,
          controlledPlayerNumber: state.controlledPlayerNumber,
        }));
        if (state.isGameOver && !gameOver) {
          gameOver = true;
          setTimeout(
            () =>
              onGameOverRef.current(
                state.homeScore,
                state.homeScore,
                state.awayScore,
              ),
            1500,
          );
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      input.dispose();
      ball.dispose();
      freeKickMode?.dispose();
      penaltyMode?.dispose();
      kickoffMode?.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="game-canvas-container" data-ocid="game.canvas_target">
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      <HUD
        mode={mode}
        powerBar={hudState.powerBar}
        isCharging={hudState.isCharging}
        homeScore={hudState.homeScore}
        awayScore={hudState.awayScore}
        timeRemaining={hudState.timeRemaining}
        roundMessage={hudState.roundMessage}
        playerScore={hudState.playerScore}
        aiScore={hudState.aiScore}
        round={hudState.round}
        maxRounds={hudState.maxRounds}
        isPlayerTurn={hudState.isPlayerTurn}
        penaltyMessage={hudState.penaltyMessage}
        suddenDeath={hudState.suddenDeath}
        controlledPlayerNumber={hudState.controlledPlayerNumber}
        isPlayerKeeping={hudState.isPlayerKeeping}
        onSwitchPlayer={handleSwitchPlayer}
      />

      {showMobile && inputManagerRef.current && (
        <MobileControls
          inputManager={inputManagerRef.current}
          showSwitchButton={mode === "kickoff"}
        />
      )}
    </div>
  );
}
