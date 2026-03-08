import * as THREE from "three";
import {
  passBallToTeammate,
  shootBall,
  updateOpponentAI,
  updateTeammateAI,
} from "../ai";
import type { Ball } from "../ball";
import type { GameCamera } from "../camera";
import { FIELD_LENGTH, FIELD_WIDTH, isInGoal, isOutOfBounds } from "../field";
import type { InputManager } from "../input";
import {
  AWAY_FORMATION,
  HOME_FORMATION,
  type Player,
  createTeam,
} from "../player";
import { TrajectoryArrow } from "../trajectoryArrow";

export interface KickoffState {
  homeScore: number;
  awayScore: number;
  timeRemaining: number;
  phase:
    | "kickoff_wait"
    | "playing"
    | "goal_home"
    | "goal_away"
    | "half_time"
    | "full_time"
    | "game_over";
  roundMessage: string;
  isGameOver: boolean;
  controlledPlayerNumber: number;
}

const MATCH_DURATION = 180; // 3 minutes
const GOAL_RESET_DELAY = 3.0;
const BALL_CONTROL_RANGE = 1.8;

export class KickoffMode {
  private scene: THREE.Scene;
  private ball: Ball;
  private homeTeam: Player[];
  private awayTeam: Player[];
  private controlledPlayer: Player;
  private input: InputManager;
  camera: GameCamera;
  state: KickoffState;
  private resetTimer = 0;
  private kickoffTeam: "home" | "away" = "home";
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
      homeScore: 0,
      awayScore: 0,
      timeRemaining: MATCH_DURATION,
      phase: "kickoff_wait",
      roundMessage: "Press SPACE to kick off!",
      isGameOver: false,
      controlledPlayerNumber: 10,
    };

    this.trajectoryArrow = new TrajectoryArrow(scene);

    // Create teams
    this.homeTeam = createTeam(scene, "home", HOME_FORMATION);
    this.awayTeam = createTeam(scene, "away", AWAY_FORMATION);

    // Set controlled player to center forward
    this.controlledPlayer = this.homeTeam[9]; // 0-indexed: forward
    this.controlledPlayer.isControlled = true;

    this.kickoffSetup("home");

    camera.snapTo(new THREE.Vector3(0, 30, 30), new THREE.Vector3(0, 0, 0));
  }

  private kickoffSetup(team: "home" | "away") {
    this.kickoffTeam = team;
    // Reset all players to formation
    for (const p of this.homeTeam) {
      p.position.copy(p.formationPosition);
      p.mesh.position.copy(p.position);
      p.velocity.set(0, 0, 0);
    }
    for (const p of this.awayTeam) {
      p.position.copy(p.formationPosition);
      p.mesh.position.copy(p.position);
      p.velocity.set(0, 0, 0);
    }

    this.ball.setPosition(0, 0.22, 0);

    // Move controlled player to center
    if (team === "home") {
      this.controlledPlayer = this.homeTeam[9];
      for (const p of this.homeTeam) {
        p.isControlled = false;
      }
      this.controlledPlayer.isControlled = true;
      this.controlledPlayer.position.set(0, 0, 0);
      this.controlledPlayer.mesh.position.copy(this.controlledPlayer.position);
    } else {
      this.controlledPlayer = this.awayTeam[9];
      for (const p of this.awayTeam) {
        p.isControlled = false;
      }
      this.controlledPlayer.isControlled = true;
      this.controlledPlayer.position.set(0, 0, 0);
      this.controlledPlayer.mesh.position.copy(this.controlledPlayer.position);
    }

    this.state.phase = "kickoff_wait";
    this.state.roundMessage = "Press SPACE to kick off!";
  }

  private switchControlledPlayer() {
    const teammates = this.homeTeam.filter((p) => !p.isControlled);
    teammates.sort(
      (a, b) =>
        a.position.distanceTo(this.ball.position) -
        b.position.distanceTo(this.ball.position),
    );
    if (teammates.length > 0) {
      this.controlledPlayer.isControlled = false;
      this.controlledPlayer = teammates[0];
      this.controlledPlayer.isControlled = true;
      this.state.controlledPlayerNumber = this.controlledPlayer.number;
    }
  }

  private getNearestTeammate(): Player | null {
    const teammates = this.homeTeam.filter((p) => !p.isControlled);
    if (teammates.length === 0) return null;
    return teammates.reduce((nearest, p) => {
      return p.position.distanceTo(this.controlledPlayer.position) <
        nearest.position.distanceTo(this.controlledPlayer.position)
        ? p
        : nearest;
    });
  }

  update(dt: number): KickoffState {
    if (this.state.isGameOver) return this.state;

    const inp = this.input.state;

    // Timer
    if (this.state.phase === "playing") {
      this.state.timeRemaining -= dt;
      if (this.state.timeRemaining <= 0) {
        this.state.timeRemaining = 0;
        this.state.isGameOver = true;
        this.state.phase = "full_time";
        this.state.roundMessage = "FULL TIME!";
      }
    }

    // Kickoff phase
    if (this.state.phase === "kickoff_wait") {
      if (inp.justReleased && inp.powerBar > 0.05) {
        this.state.phase = "playing";
        shootBall(this.ball, this.controlledPlayer, inp.powerBar * 0.5);
        this.input.resetPowerBar();
      }
      // Apply limited movement in kickoff zone (WASD + arrow keys both work)
      this.controlledPlayer.applyInputForce(
        inp.moveX || inp.aimX,
        inp.moveZ - inp.aimY,
      );
    }

    // Playing phase
    if (this.state.phase === "playing") {
      // Player switch
      if (inp.justSwitchedPlayer) {
        this.switchControlledPlayer();
      }

      // Controlled player input (WASD + arrow keys both work)
      this.controlledPlayer.applyInputForce(
        inp.moveX || inp.aimX,
        inp.moveZ - inp.aimY,
      );

      // Shooting / passing
      if (inp.justReleased && inp.powerBar > 0.05) {
        const hasBall =
          this.controlledPlayer.position.distanceTo(this.ball.position) <
          BALL_CONTROL_RANGE;

        if (hasBall) {
          // Try to pass to teammate
          const direction = this.controlledPlayer.facingDirection.clone();
          const teammates = this.homeTeam.filter((p) => !p.isControlled);
          const passed = passBallToTeammate(
            this.ball,
            this.controlledPlayer,
            teammates,
            inp.powerBar,
            direction,
          );
          if (!passed) {
            shootBall(this.ball, this.controlledPlayer, inp.powerBar);
          }
          this.controlledPlayer.triggerKickAnimation();
        } else {
          // Long pass/shot
          shootBall(this.ball, this.controlledPlayer, inp.powerBar);
        }
        this.input.resetPowerBar();
      }
    }

    // Update ball
    this.ball.update(dt);

    // Mark who has ball
    const allPlayers = [...this.homeTeam, ...this.awayTeam];
    for (const p of allPlayers) {
      p.hasBall = false;
    }
    const nearBall = allPlayers.find(
      (p) => p.position.distanceTo(this.ball.position) < BALL_CONTROL_RANGE,
    );
    if (nearBall) nearBall.hasBall = true;

    // Update controlled player
    this.controlledPlayer.update(dt);

    // Update AI
    const teammates = this.homeTeam.filter(
      (p) => !p.isControlled && p !== this.controlledPlayer,
    );
    for (const p of teammates) {
      updateTeammateAI(
        p,
        this.ball,
        this.controlledPlayer,
        this.homeTeam,
        this.awayTeam,
        dt,
      );
      p.update(dt);
    }

    for (const p of this.awayTeam) {
      updateOpponentAI(
        p,
        this.ball,
        this.controlledPlayer,
        this.awayTeam,
        this.homeTeam,
        dt,
      );
      p.update(dt);
    }

    // Check goal
    if (this.state.phase === "playing") {
      const goalResult = isInGoal(this.ball.position);
      if (goalResult === "home") {
        this.state.homeScore++;
        this.state.phase = "goal_home";
        this.state.roundMessage = `GOAL! 🎉 Home ${this.state.homeScore} - ${this.state.awayScore} Away`;
        this.resetTimer = GOAL_RESET_DELAY;
        this.kickoffTeam = "away"; // away kicks off after conceding
      } else if (goalResult === "away") {
        this.state.awayScore++;
        this.state.phase = "goal_away";
        this.state.roundMessage = `GOAL CONCEDED! 😬 Home ${this.state.homeScore} - ${this.state.awayScore} Away`;
        this.resetTimer = GOAL_RESET_DELAY;
        this.kickoffTeam = "home"; // home kicks off after conceding
      }

      // Out of bounds — simplify: throw ball back to nearest player
      if (isOutOfBounds(this.ball.position)) {
        // Reset near where it went out
        const resetPos = this.ball.position.clone();
        resetPos.x = Math.max(
          -FIELD_LENGTH / 2 + 1,
          Math.min(FIELD_LENGTH / 2 - 1, resetPos.x),
        );
        resetPos.z = Math.max(
          -FIELD_WIDTH / 2 + 1,
          Math.min(FIELD_WIDTH / 2 - 1, resetPos.z),
        );
        this.ball.setPosition(resetPos.x, 0.22, resetPos.z);

        // Give ball to nearest player
        const nearest = allPlayers.reduce((a, b) =>
          a.position.distanceTo(this.ball.position) <
          b.position.distanceTo(this.ball.position)
            ? a
            : b,
        );
        if (nearest.team === "home") {
          // Give possession to home team
          const dir = nearest.facingDirection.clone();
          dir.y = 0.1;
          this.ball.velocity.copy(dir.multiplyScalar(3));
        }
      }
    }

    // Reset after goal
    if (this.state.phase === "goal_home" || this.state.phase === "goal_away") {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.kickoffSetup(this.kickoffTeam);
      }
    }

    // Trajectory arrow — show when charging near ball
    const hasBallNow =
      this.controlledPlayer.position.distanceTo(this.ball.position) < 2.5;
    const showArrow = inp.isCharging && hasBallNow;
    this.trajectoryArrow.update(
      this.ball.position,
      this.controlledPlayer.facingDirection.x,
      this.controlledPlayer.facingDirection.z,
      inp.powerBar,
      showArrow,
    );

    // Camera follow
    this.camera.update(this.controlledPlayer, this.ball, dt, "follow");

    return this.state;
  }

  dispose() {
    for (const p of this.homeTeam) p.dispose();
    for (const p of this.awayTeam) p.dispose();
    this.trajectoryArrow.dispose();
  }
}
