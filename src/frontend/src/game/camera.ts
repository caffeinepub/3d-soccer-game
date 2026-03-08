import * as THREE from "three";
import type { Ball } from "./ball";
import type { Player } from "./player";

export class GameCamera {
  camera: THREE.PerspectiveCamera;
  private smoothPosition: THREE.Vector3;
  private smoothTarget: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.smoothPosition = camera.position.clone();
    this.smoothTarget = new THREE.Vector3(0, 0, 0);
  }

  update(
    controlledPlayer: Player,
    ball: Ball,
    _dt: number,
    mode: "follow" | "top" | "tactical" = "follow",
  ) {
    const target = controlledPlayer.position.clone().lerp(ball.position, 0.3);
    const playerFacing = controlledPlayer.facingDirection.clone();

    let desiredPos: THREE.Vector3;

    if (mode === "follow") {
      // Third-person follow camera behind player
      const back = playerFacing.clone().multiplyScalar(-14);
      const up = new THREE.Vector3(0, 9, 0);
      desiredPos = target.clone().add(back).add(up);

      // Clamp camera so field edge doesn't go off screen
      desiredPos.x = Math.max(-62, Math.min(62, desiredPos.x));
      desiredPos.z = Math.max(-45, Math.min(45, desiredPos.z));
      desiredPos.y = Math.max(6, Math.min(25, desiredPos.y));
    } else if (mode === "top") {
      desiredPos = new THREE.Vector3(target.x, 40, target.z + 10);
    } else {
      // Tactical: wide overhead
      desiredPos = new THREE.Vector3(0, 55, 20);
    }

    this.smoothPosition.lerp(desiredPos, 0.07);
    this.smoothTarget.lerp(target, 0.12);

    this.camera.position.copy(this.smoothPosition);
    this.camera.lookAt(this.smoothTarget);
  }

  snapTo(position: THREE.Vector3, lookAt: THREE.Vector3) {
    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
    this.smoothPosition.copy(position);
    this.smoothTarget.copy(lookAt);
  }

  // Free kick specific camera
  updateFreeKick(ball: Ball, controlledPlayer: Player, _dt: number) {
    const behindBall = ball.position.clone();
    const facing = controlledPlayer.facingDirection.clone().negate();
    behindBall.add(facing.multiplyScalar(10));
    behindBall.y = 6;

    this.smoothPosition.lerp(behindBall, 0.06);
    this.smoothTarget.lerp(
      new THREE.Vector3(
        ball.position.x + controlledPlayer.facingDirection.x * 20,
        2,
        ball.position.z,
      ),
      0.1,
    );
    this.camera.position.copy(this.smoothPosition);
    this.camera.lookAt(this.smoothTarget);
  }

  // Penalty specific camera
  updatePenalty(ball: Ball, _dt: number, isPlayerKicking: boolean) {
    let targetPos: THREE.Vector3;
    let lookTarget: THREE.Vector3;

    if (isPlayerKicking) {
      // Camera behind the player (more positive X), looking toward negative-X goal + keeper
      targetPos = new THREE.Vector3(
        ball.position.x + 9,
        3.5,
        ball.position.z + 5,
      );
      lookTarget = new THREE.Vector3(
        ball.position.x - 14,
        1.2,
        ball.position.z,
      );
    } else {
      // Player is keeper: camera behind the goal (negative X side), looking toward the shooter
      targetPos = new THREE.Vector3(
        ball.position.x - 8,
        3.5,
        ball.position.z - 5,
      );
      lookTarget = new THREE.Vector3(
        ball.position.x + 14,
        1.2,
        ball.position.z,
      );
    }

    this.smoothPosition.lerp(targetPos, 0.06);
    this.smoothTarget.lerp(lookTarget, 0.1);
    this.camera.position.copy(this.smoothPosition);
    this.camera.lookAt(this.smoothTarget);
  }
}
