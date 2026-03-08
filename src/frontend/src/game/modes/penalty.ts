import * as THREE from "three";
import type { Ball } from "../ball";
import type { GameCamera } from "../camera";
import {
  FIELD_LENGTH,
  GOAL_HEIGHT,
  GOAL_WIDTH,
  PENALTY_SPOT_DIST,
  isInGoal,
} from "../field";
import type { InputManager } from "../input";
import { Player } from "../player";
import { TrajectoryArrow } from "../trajectoryArrow";

export interface PenaltyState {
  playerScore: number;
  aiScore: number;
  round: number;
  maxRounds: number;
  turn: "player" | "ai";
  phase:
    | "aim"
    | "charging"
    | "ball_in_flight"
    | "result"
    | "ai_taking"
    | "game_over";
  resultMessage: string;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  winner: "player" | "ai" | "draw" | null;
  suddenDeath: boolean;
  aimOffset: number; // -1 to 1 for aiming left/right
  aimHeight: number; // 0 to 1 for aiming low/high
  isPlayerKeeping: boolean; // true when player controls the goalkeeper
}

const PENALTY_SPOT_X = -FIELD_LENGTH / 2 + PENALTY_SPOT_DIST;
const GOAL_LINE_X = -FIELD_LENGTH / 2;
const AI_SHOOT_DELAY = 2.0;
const RESULT_DELAY = 2.5;

export class PenaltyMode {
  private scene: THREE.Scene;
  private ball: Ball;
  private shooter: Player;
  private goalkeeper: Player;
  private input: InputManager;
  private camera: GameCamera;
  state: PenaltyState;

  private aiShootTimer = 0;
  private resultTimer = 0;
  private ballKicked = false;
  private gkDiveDir = 0;
  private aimIndicator: THREE.Mesh;
  private trajectoryArrow: TrajectoryArrow;

  constructor(
    scene: THREE.Scene,
    ball: Ball,
    input: InputManager,
    camera: GameCamera,
  ) {
    this.scene = scene;
    this.ball = ball;
    this.input = input;
    this.camera = camera;

    this.state = {
      playerScore: 0,
      aiScore: 0,
      round: 1,
      maxRounds: 5,
      turn: "player",
      phase: "aim",
      resultMessage:
        "Arrow keys to aim, hold SPACE to charge, release to shoot!",
      isPlayerTurn: true,
      isGameOver: false,
      winner: null,
      suddenDeath: false,
      aimOffset: 0,
      aimHeight: 0.3,
      isPlayerKeeping: false,
    };

    // Shooter (home)
    this.shooter = new Player(
      scene,
      {
        team: "home",
        role: "forward",
        formationPosition: new THREE.Vector3(PENALTY_SPOT_X - 2, 0, 0),
        isControlled: true,
      },
      10,
    );

    // GK (away) defends home goal
    this.goalkeeper = new Player(
      scene,
      {
        team: "away",
        role: "goalkeeper",
        formationPosition: new THREE.Vector3(GOAL_LINE_X + 1.5, 0, 0),
      },
      1,
    );

    // Aim indicator
    const aimGeo = new THREE.ConeGeometry(0.3, 1.0, 8);
    const aimMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      transparent: true,
      opacity: 0.7,
    });
    this.aimIndicator = new THREE.Mesh(aimGeo, aimMat);
    this.aimIndicator.rotation.x = Math.PI / 2;
    this.aimIndicator.position.set(PENALTY_SPOT_X, 1.2, 0);
    scene.add(this.aimIndicator);

    this.trajectoryArrow = new TrajectoryArrow(scene);

    this.resetPenalty();

    // Start camera behind shooter looking at the goal and keeper
    camera.snapTo(
      new THREE.Vector3(PENALTY_SPOT_X + 9, 3.5, 5),
      new THREE.Vector3(GOAL_LINE_X + 2, 1.2, 0),
    );
  }

  private resetPenalty() {
    this.ball.setPosition(PENALTY_SPOT_X, 0.22, 0);
    this.ballKicked = false;
    this.gkDiveDir = 0;

    if (this.state.turn === "player") {
      this.shooter.position.set(PENALTY_SPOT_X - 2, 0, 0);
      this.shooter.mesh.position.copy(this.shooter.position);
      this.shooter.velocity.set(0, 0, 0);
      this.shooter.facingDirection.set(1, 0, 0);
      this.shooter.mesh.rotation.y = 0;
      this.state.phase = "aim";
      this.state.resultMessage =
        "Arrow keys to aim left/right/up/down, hold SPACE to charge, release to shoot!";
      this.state.aimOffset = 0;
      this.state.aimHeight = 0.3;
      this.state.isPlayerKeeping = false;
      this.goalkeeper.isControlled = false;
      this.aimIndicator.visible = true;
    } else {
      // AI shooter — player controls the goalkeeper
      this.shooter.position.set(PENALTY_SPOT_X - 2, 0, 0);
      this.shooter.mesh.position.copy(this.shooter.position);
      this.state.phase = "ai_taking";
      this.aiShootTimer = AI_SHOOT_DELAY;
      this.state.resultMessage = "YOU are the keeper! WASD to dive and save!";
      this.state.isPlayerKeeping = true;
      this.goalkeeper.isControlled = true;
      this.aimIndicator.visible = false;
    }

    this.goalkeeper.position.set(GOAL_LINE_X + 1.5, 0, 0);
    this.goalkeeper.mesh.position.copy(this.goalkeeper.position);
    this.goalkeeper.velocity.set(0, 0, 0);
  }

  private checkGameOver(): boolean {
    const totalRounds = this.state.maxRounds;
    const finished = this.state.round > totalRounds;

    if (this.state.suddenDeath) {
      // In sudden death, game over when scores differ after each pair
      const pairDone = this.state.turn === "player"; // just completed AI turn
      if (pairDone && this.state.playerScore !== this.state.aiScore) {
        return true;
      }
      return false;
    }

    if (finished) return true;

    // Early finish: if one team can't be caught
    const remaining = totalRounds - this.state.round + 1;
    if (this.state.playerScore > this.state.aiScore + remaining) return true;
    if (this.state.aiScore > this.state.playerScore + remaining) return true;

    return false;
  }

  update(dt: number): PenaltyState {
    if (this.state.isGameOver) return this.state;

    const inp = this.input.state;

    // Aim with arrow keys — left/right and up/down
    if (
      (this.state.phase === "aim" || this.state.phase === "charging") &&
      this.state.isPlayerTurn
    ) {
      this.state.aimOffset += inp.aimX * dt * 2.0;
      this.state.aimOffset = Math.max(-1, Math.min(1, this.state.aimOffset));
      this.state.aimHeight += inp.aimY * dt * 1.5;
      this.state.aimHeight = Math.max(0, Math.min(1, this.state.aimHeight));

      const aimZ = this.state.aimOffset * (GOAL_WIDTH / 2 - 0.3);
      this.aimIndicator.position.z = aimZ;
      // Raise indicator to show height aim
      this.aimIndicator.position.y =
        1.2 + this.state.aimHeight * (GOAL_HEIGHT - 1.5);
    }

    if (this.state.phase === "aim" || this.state.phase === "charging") {
      if (inp.isCharging) this.state.phase = "charging";

      if (inp.justReleased && inp.powerBar > 0.05) {
        // Player shoots!
        this.state.phase = "ball_in_flight";
        this.ballKicked = true;
        const aimZ = this.state.aimOffset * (GOAL_WIDTH / 2 - 0.3);
        const aimYDir = 0.1 + this.state.aimHeight * 0.6; // 0.1 (low) to 0.7 (high)
        // GK dives with some chance of correct direction
        const gkCorrect =
          Math.random() < 0.35 + Math.abs(this.state.aimOffset) * 0.1;
        this.gkDiveDir = gkCorrect ? Math.sign(aimZ) : -Math.sign(aimZ);

        // Shoot ball
        const dir = new THREE.Vector3(
          -1,
          aimYDir * inp.powerBar,
          aimZ / 11,
        ).normalize();
        this.ball.velocity.copy(dir.multiplyScalar(inp.powerBar * 20));
        this.ball.position
          .copy(this.shooter.position)
          .add(new THREE.Vector3(-1, 0.22, 0));
        this.ball.mesh.position.copy(this.ball.position);
        this.aimIndicator.visible = false;
        this.input.resetPowerBar();
        this.shooter.triggerKickAnimation();
      }
    }

    // Player goalkeeper movement during ai_taking and ball_in_flight
    if (
      this.state.isPlayerKeeping &&
      (this.state.phase === "ai_taking" ||
        this.state.phase === "ball_in_flight")
    ) {
      // WASD controls the goalkeeper: W/S = move toward goal corners (Z), A/D = move laterally
      const gkSpeed = 12.0;
      this.goalkeeper.velocity.x += inp.moveX * gkSpeed * dt * 3;
      this.goalkeeper.velocity.z += inp.moveZ * gkSpeed * dt * 3;
      // Clamp keeper near goal line
      this.goalkeeper.position.x = Math.max(
        GOAL_LINE_X,
        Math.min(GOAL_LINE_X + 2.5, this.goalkeeper.position.x),
      );
      this.goalkeeper.position.z = Math.max(
        -(GOAL_WIDTH / 2 + 0.5),
        Math.min(GOAL_WIDTH / 2 + 0.5, this.goalkeeper.position.z),
      );
    }

    // AI taking penalty
    if (this.state.phase === "ai_taking") {
      this.aiShootTimer -= dt;
      if (this.aiShootTimer <= 0) {
        this.state.phase = "ball_in_flight";
        this.ballKicked = true;

        // AI aims to a corner
        const aimZ =
          (Math.random() > 0.5 ? 1 : -1) *
          (GOAL_WIDTH / 2 - 0.5) *
          (0.7 + Math.random() * 0.3);
        // No auto-dive: keeper is player-controlled; gkDiveDir unused for player-keeper phase
        this.gkDiveDir = 0;

        // Move AI shooter to ball
        this.shooter.position.set(PENALTY_SPOT_X, 0, 0);
        this.shooter.mesh.position.copy(this.shooter.position);

        const dir = new THREE.Vector3(-1, 0.4, aimZ / 11).normalize();
        this.ball.velocity.copy(dir.multiplyScalar(18));
        this.ball.position.set(PENALTY_SPOT_X, 0.22, 0);
        this.ball.mesh.position.copy(this.ball.position);
        this.shooter.triggerKickAnimation();
      }
    }

    // Ball in flight
    if (this.state.phase === "ball_in_flight") {
      this.ball.update(dt);

      if (!this.state.isPlayerKeeping) {
        // AI keeper: auto-dive to a side
        const gkTarget = new THREE.Vector3(
          GOAL_LINE_X + 1.0,
          0,
          this.gkDiveDir * (GOAL_WIDTH / 2 - 0.4),
        );
        this.goalkeeper.moveToward(gkTarget, 10.0, dt);
      }
      this.goalkeeper.update(dt);

      // GK save check
      const gkDist = this.goalkeeper.position.distanceTo(this.ball.position);
      if (gkDist < 1.5 && this.ball.velocity.length() > 2) {
        // Save!
        const awayDir = this.goalkeeper.position
          .clone()
          .sub(this.ball.position)
          .normalize();
        awayDir.y = 0.8;
        this.ball.velocity.copy(awayDir.multiplyScalar(8));
        this.state.phase = "result";
        this.state.resultMessage = this.state.isPlayerTurn
          ? "SAVED! GK got it!"
          : "AI penalty saved!";
        this.resultTimer = RESULT_DELAY;
      }

      // Check goal
      const goalResult = isInGoal(this.ball.position);
      if (goalResult !== null) {
        if (this.state.isPlayerTurn) {
          this.state.playerScore++;
          this.state.resultMessage = "GOAL! Great penalty! ⚽";
        } else {
          this.state.aiScore++;
          this.state.resultMessage = "AI SCORES! 😬";
        }
        this.state.phase = "result";
        this.resultTimer = RESULT_DELAY;
      }

      // Ball out / stopped
      if (
        this.ball.position.x < GOAL_LINE_X - 3 ||
        Math.abs(this.ball.position.z) > 20 ||
        (this.ball.getSpeed() < 0.3 && this.ball.position.y < 0.3)
      ) {
        if (this.state.phase === "ball_in_flight") {
          this.state.phase = "result";
          this.state.resultMessage = this.state.isPlayerTurn
            ? "MISS! Off target!"
            : "AI shot wide!";
          this.resultTimer = RESULT_DELAY;
        }
      }
    }

    if (this.state.phase !== "ball_in_flight") {
      this.goalkeeper.update(dt);
    }
    this.shooter.update(dt);

    // Result phase — advance to next round
    if (this.state.phase === "result") {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) {
        // Check game over
        if (this.state.isPlayerTurn) {
          this.state.isPlayerTurn = false;
          this.state.turn = "ai";
          this.resetPenalty();
        } else {
          // Both took penalties — advance round
          this.state.round++;
          this.state.turn = "player";
          this.state.isPlayerTurn = true;

          if (this.checkGameOver()) {
            this.state.isGameOver = true;
            if (this.state.playerScore > this.state.aiScore) {
              this.state.winner = "player";
            } else if (this.state.aiScore > this.state.playerScore) {
              this.state.winner = "ai";
            } else {
              // Sudden death
              this.state.suddenDeath = true;
              this.state.maxRounds = this.state.round + 4;
              this.resetPenalty();
              return this.state;
            }
          } else {
            this.resetPenalty();
          }
        }
      }
    }

    // Trajectory arrow — show when player is aiming/charging
    const showArrow =
      this.state.isPlayerTurn &&
      (this.state.phase === "aim" || this.state.phase === "charging");
    // Direction: toward negative X (the goal), Z from aimOffset
    const aimZ = this.state.aimOffset * (GOAL_WIDTH / 2 - 0.3);
    const shootDir = new THREE.Vector3(-1, 0, aimZ / 11).normalize();
    this.trajectoryArrow.update(
      this.ball.position,
      shootDir.x,
      shootDir.z,
      inp.powerBar > 0.02 ? inp.powerBar : 0.25, // show faint arrow even before charging
      showArrow,
      this.state.aimHeight,
    );

    // Camera
    this.camera.updatePenalty(this.ball, dt, this.state.isPlayerTurn);

    return this.state;
  }

  dispose() {
    this.shooter.dispose();
    this.goalkeeper.dispose();
    this.scene.remove(this.aimIndicator);
    (this.aimIndicator.material as THREE.Material).dispose();
    this.aimIndicator.geometry.dispose();
    this.trajectoryArrow.dispose();
  }
}
