import * as THREE from "three";
import { shootBall, updateFreeKickWallAI, updatePenaltyGK } from "../ai";
import type { Ball } from "../ball";
import type { GameCamera } from "../camera";
import { FIELD_LENGTH, GOAL_WIDTH, isInGoal, isOutOfBounds } from "../field";
import type { InputManager } from "../input";
import { Player, PlayerConfig } from "../player";
import { TrajectoryArrow } from "../trajectoryArrow";

export interface FreeKickState {
  score: number;
  timeRemaining: number;
  phase:
    | "ready"
    | "charging"
    | "ball_in_flight"
    | "goal"
    | "miss"
    | "game_over";
  roundMessage: string;
  isGameOver: boolean;
  finalScore: number;
  aimOffsetZ: number; // -1..1 left/right aim offset
  aimHeight: number; // 0..1 vertical aim
}

const TOTAL_TIME = 60;
const RESET_DELAY = 2.0;

export class FreeKickMode {
  private scene: THREE.Scene;
  private ball: Ball;
  private shooter: Player;
  private goalkeeper: Player;
  private wallDefenders: Player[];
  private camera: GameCamera;
  private input: InputManager;
  state: FreeKickState;
  private resetTimer = 0;
  private ballStartPos: THREE.Vector3;
  private goalFlashTimer = 0;
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

    // Just outside the opponent's penalty area (~20m from goal, outside 16.5m box)
    this.ballStartPos = new THREE.Vector3(30, 0.22, 8);

    this.state = {
      score: 0,
      timeRemaining: TOTAL_TIME,
      phase: "ready",
      roundMessage:
        "Arrow keys to aim left/right/up/down, hold SPACE to shoot!",
      isGameOver: false,
      finalScore: 0,
      aimOffsetZ: 0,
      aimHeight: 0.25,
    };

    // Create shooter (home team forward)
    this.shooter = new Player(
      scene,
      {
        team: "home",
        role: "forward",
        formationPosition: this.ballStartPos
          .clone()
          .add(new THREE.Vector3(-2, 0, 0)),
        isControlled: true,
      },
      10,
    );

    // Create goalkeeper defending the positive-x (away) goal
    this.goalkeeper = new Player(
      scene,
      {
        team: "away",
        role: "goalkeeper",
        formationPosition: new THREE.Vector3(FIELD_LENGTH / 2 - 1.5, 0, 0),
      },
      1,
    );

    // Create wall defenders (4 players)
    this.wallDefenders = [];
    const wallX = this.ballStartPos.x + 9.15;
    for (let i = 0; i < 4; i++) {
      const offset = (i - 1.5) * 0.9;
      const def = new Player(
        scene,
        {
          team: "away",
          role: "defender",
          formationPosition: new THREE.Vector3(
            wallX,
            0,
            this.ballStartPos.z + offset,
          ),
        },
        i + 2,
      );
      this.wallDefenders.push(def);
    }

    this.trajectoryArrow = new TrajectoryArrow(scene);

    this.resetBall();

    // Snap camera behind the ball looking toward the goal
    camera.snapTo(new THREE.Vector3(18, 8, 14), new THREE.Vector3(52, 1, 0));
  }

  private resetBall() {
    this.ball.setPosition(this.ballStartPos.x, 0.22, this.ballStartPos.z);
    this.shooter.position
      .copy(this.ballStartPos)
      .add(new THREE.Vector3(-2, 0, 0));
    this.shooter.mesh.position.copy(this.shooter.position);
    this.shooter.velocity.set(0, 0, 0);
    this.shooter.facingDirection.set(1, 0, 0);
    this.shooter.mesh.rotation.y = 0;

    // Reset wall
    const wallX = this.ballStartPos.x + 9.15;
    this.wallDefenders.forEach((d, i) => {
      const offset = (i - 1.5) * 0.9;
      d.position.set(wallX, 0, this.ballStartPos.z + offset);
      d.mesh.position.copy(d.position);
      d.velocity.set(0, 0, 0);
    });

    // Reset GK
    this.goalkeeper.position.set(FIELD_LENGTH / 2 - 1.5, 0, 0);
    this.goalkeeper.mesh.position.copy(this.goalkeeper.position);
    this.goalkeeper.velocity.set(0, 0, 0);

    this.state.phase = "ready";
    this.state.roundMessage =
      "Arrow keys to aim left/right/up/down, hold SPACE to shoot!";
    this.state.aimOffsetZ = 0;
    this.state.aimHeight = 0.25;
  }

  update(dt: number): FreeKickState {
    if (this.state.isGameOver) return this.state;

    // Count down timer
    this.state.timeRemaining -= dt;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.isGameOver = true;
      this.state.finalScore = this.state.score;
      this.state.phase = "game_over";
      return this.state;
    }

    const inp = this.input.state;

    // Arrow keys control aim direction (left/right and height)
    if (this.state.phase === "ready" || this.state.phase === "charging") {
      this.state.aimOffsetZ += inp.aimX * dt * 2.0;
      this.state.aimOffsetZ = Math.max(-1, Math.min(1, this.state.aimOffsetZ));
      this.state.aimHeight += inp.aimY * dt * 1.5;
      this.state.aimHeight = Math.max(0, Math.min(1, this.state.aimHeight));

      // Update shooter facing direction based on aim
      const aimZ = this.state.aimOffsetZ * (GOAL_WIDTH / 2 - 0.3);
      const goalX = FIELD_LENGTH / 2;
      const toGoal = new THREE.Vector3(
        goalX - this.shooter.position.x,
        0,
        aimZ - this.shooter.position.z,
      ).normalize();
      this.shooter.facingDirection.copy(toGoal);
    }

    this.shooter.update(dt);

    // Power bar interaction
    if (this.state.phase === "ready" || this.state.phase === "charging") {
      if (inp.isCharging) {
        this.state.phase = "charging";
      }
      if (inp.justReleased && inp.powerBar > 0.05) {
        this.state.phase = "ball_in_flight";
        // Custom shoot with height aim
        const aimYDir = 0.05 + this.state.aimHeight * 0.55;
        const dir = this.shooter.facingDirection.clone();
        dir.y = aimYDir;
        dir.normalize();
        this.ball.velocity.copy(dir.multiplyScalar(inp.powerBar * 22));
        this.ball.position.copy(this.shooter.position);
        this.ball.position.y = 0.22;
        this.ball.position.addScaledVector(dir, 1.2);
        this.ball.mesh.position.copy(this.ball.position);
        this.shooter.triggerKickAnimation();
        this.input.resetPowerBar();
      }
    }

    if (this.state.phase === "ball_in_flight") {
      this.ball.update(dt);

      // Check goal
      const goalResult = isInGoal(this.ball.position);
      if (goalResult === "home") {
        this.state.score += 1;
        this.state.phase = "goal";
        this.state.roundMessage = `GOAL! ${this.state.score} scored! 🎉`;
        this.resetTimer = RESET_DELAY;
      } else if (
        isOutOfBounds(this.ball.position) ||
        (this.ball.position.y < 0.1 && this.ball.getSpeed() < 0.5)
      ) {
        this.state.phase = "miss";
        this.state.roundMessage = "Miss! Try again...";
        this.resetTimer = RESET_DELAY;
      }
    } else {
      // Keep ball on ground in ready state
      this.ball.update(0);
    }

    // Handle reset after goal/miss
    if (this.state.phase === "goal" || this.state.phase === "miss") {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetBall();
      }
    }

    // AI updates
    updateFreeKickWallAI(this.wallDefenders, this.ball, dt);
    for (const d of this.wallDefenders) d.update(dt);

    const ballKicked = this.state.phase === "ball_in_flight";
    updatePenaltyGK(
      this.goalkeeper,
      ballKicked,
      this.ball.velocity,
      FIELD_LENGTH / 2,
      dt,
    );
    this.goalkeeper.update(dt);

    // Trajectory arrow — show when charging, hide after kick
    const showArrow =
      this.state.phase === "ready" || this.state.phase === "charging";
    this.trajectoryArrow.update(
      this.ball.position,
      this.shooter.facingDirection.x,
      this.shooter.facingDirection.z,
      inp.powerBar > 0.02 ? inp.powerBar : 0.25,
      showArrow,
      this.state.aimHeight,
    );

    // Camera
    this.camera.updateFreeKick(this.ball, this.shooter, dt);

    return this.state;
  }

  dispose() {
    this.shooter.dispose();
    this.goalkeeper.dispose();
    for (const d of this.wallDefenders) d.dispose();
    this.trajectoryArrow.dispose();
  }
}
