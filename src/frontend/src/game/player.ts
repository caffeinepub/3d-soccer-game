import * as THREE from "three";

export type Team = "home" | "away";
export type PlayerRole = "goalkeeper" | "defender" | "midfielder" | "forward";

const PLAYER_SPEED = 7.0;
const PLAYER_ACCEL = 20.0;
const PLAYER_FRICTION = 0.85;
const MAX_SPRINT_SPEED = 9.0;

export interface PlayerConfig {
  team: Team;
  role: PlayerRole;
  formationPosition: THREE.Vector3;
  isControlled?: boolean;
}

export class Player {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  team: Team;
  role: PlayerRole;
  formationPosition: THREE.Vector3;
  isControlled: boolean;
  isGoalkeeper: boolean;
  facingDirection: THREE.Vector3;
  hasBall: boolean;
  number: number;
  private scene: THREE.Scene;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private kickAnimTimer = 0;
  private runAnimTimer = 0;
  private selectionRing: THREE.Mesh;

  constructor(scene: THREE.Scene, config: PlayerConfig, num = 1) {
    this.scene = scene;
    this.team = config.team;
    this.role = config.role;
    this.formationPosition = config.formationPosition.clone();
    this.isControlled = config.isControlled ?? false;
    this.isGoalkeeper = config.role === "goalkeeper";
    this.hasBall = false;
    this.number = num;
    this.position = config.formationPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.facingDirection = new THREE.Vector3(
      config.team === "home" ? 1 : -1,
      0,
      0,
    );

    this.mesh = new THREE.Group();

    // Team colors
    const jerseyColor = config.team === "home" ? 0x1565c0 : 0xc62828;
    const shortsColor = config.team === "home" ? 0x0d47a1 : 0xb71c1c;
    const skinColor = 0xf5cba7;
    const sockColor = config.team === "home" ? 0xffffff : 0xffffff;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const torsoMat = new THREE.MeshStandardMaterial({ color: jerseyColor });
    this.bodyMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.bodyMesh.position.y = 1.0;
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.52;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Shorts
    const shortsGeo = new THREE.BoxGeometry(0.5, 0.3, 0.32);
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsColor });
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = 0.65;
    this.mesh.add(shorts);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    const legMat = new THREE.MeshStandardMaterial({ color: sockColor });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.14, 0.32, 0);
    this.mesh.add(this.leftLeg);

    // Right leg
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.14, 0.32, 0);
    this.mesh.add(this.rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.1, 0.28);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.14, 0.07, 0.04);
    this.mesh.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.14, 0.07, 0.04);
    this.mesh.add(rightShoe);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.45, 0.14);
    const armMat = new THREE.MeshStandardMaterial({ color: jerseyColor });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.34, 0.95, 0);
    this.mesh.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.34, 0.95, 0);
    this.mesh.add(rightArm);

    // GK gloves (different color)
    if (this.isGoalkeeper) {
      const gloveGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
      const leftGlove = new THREE.Mesh(gloveGeo, gloveMat);
      leftGlove.position.set(-0.34, 0.72, 0);
      this.mesh.add(leftGlove);
      const rightGlove = new THREE.Mesh(gloveGeo, gloveMat);
      rightGlove.position.set(0.34, 0.72, 0);
      this.mesh.add(rightGlove);
    }

    // Selection ring (shown when controlled)
    const ringGeo = new THREE.RingGeometry(0.4, 0.55, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.02;
    this.selectionRing.visible = this.isControlled;
    this.mesh.add(this.selectionRing);

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  triggerKickAnimation() {
    this.kickAnimTimer = 0.3;
  }

  update(dt: number) {
    // Clamp velocity
    const maxSpeed = this.isControlled ? MAX_SPRINT_SPEED : PLAYER_SPEED;
    const hVel = new THREE.Vector2(this.velocity.x, this.velocity.z);
    if (hVel.length() > maxSpeed) {
      hVel.normalize().multiplyScalar(maxSpeed);
      this.velocity.x = hVel.x;
      this.velocity.z = hVel.y;
    }

    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.position.y = 0;

    // Field bounds clamping
    this.position.x = Math.max(-58, Math.min(58, this.position.x));
    this.position.z = Math.max(-40, Math.min(40, this.position.z));

    this.mesh.position.copy(this.position);

    // Face direction of movement
    const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    if (speed > 0.5) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      const currentAngle = this.mesh.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      this.mesh.rotation.y += diff * Math.min(1, dt * 15);

      this.facingDirection.set(
        Math.sin(this.mesh.rotation.y),
        0,
        Math.cos(this.mesh.rotation.y),
      );
    }

    // Run animation
    this.runAnimTimer += dt * speed * 3;
    if (speed > 0.5) {
      this.leftLeg.rotation.x = Math.sin(this.runAnimTimer) * 0.6;
      this.rightLeg.rotation.x = -Math.sin(this.runAnimTimer) * 0.6;
    } else {
      this.leftLeg.rotation.x *= 0.9;
      this.rightLeg.rotation.x *= 0.9;
    }

    // Kick animation
    if (this.kickAnimTimer > 0) {
      this.kickAnimTimer -= dt;
      const t = this.kickAnimTimer / 0.3;
      this.rightLeg.rotation.x = -Math.sin(t * Math.PI) * 1.2;
    }

    // Apply friction
    this.velocity.x *= PLAYER_FRICTION;
    this.velocity.z *= PLAYER_FRICTION;

    // Selection ring
    this.selectionRing.visible = this.isControlled;

    // Pulse the ring
    if (this.isControlled) {
      const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }

  applyInputForce(dirX: number, dirZ: number) {
    this.velocity.x += dirX * PLAYER_ACCEL * 0.016;
    this.velocity.z += dirZ * PLAYER_ACCEL * 0.016;
  }

  moveToward(target: THREE.Vector3, speed: number, dt: number) {
    const dir = target.clone().sub(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist > 0.1) {
      dir.normalize();
      this.velocity.x += dir.x * speed * dt * 3;
      this.velocity.z += dir.z * speed * dt * 3;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }
  }

  distanceTo(other: Player): number {
    return this.position.distanceTo(other.position);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}

export function createTeam(
  scene: THREE.Scene,
  team: Team,
  formation: { role: PlayerRole; pos: [number, number, number] }[],
): Player[] {
  const players: Player[] = [];
  formation.forEach((f, i) => {
    const player = new Player(
      scene,
      {
        team,
        role: f.role,
        formationPosition: new THREE.Vector3(f.pos[0], f.pos[1], f.pos[2]),
      },
      i + 1,
    );
    players.push(player);
  });
  return players;
}

// Standard 4-4-2 formation for home team (attacks +X)
export const HOME_FORMATION: {
  role: PlayerRole;
  pos: [number, number, number];
}[] = [
  { role: "goalkeeper", pos: [-50, 0, 0] },
  { role: "defender", pos: [-35, 0, -10] },
  { role: "defender", pos: [-35, 0, -3] },
  { role: "defender", pos: [-35, 0, 3] },
  { role: "defender", pos: [-35, 0, 10] },
  { role: "midfielder", pos: [-20, 0, -15] },
  { role: "midfielder", pos: [-20, 0, -5] },
  { role: "midfielder", pos: [-20, 0, 5] },
  { role: "midfielder", pos: [-20, 0, 15] },
  { role: "forward", pos: [-10, 0, -5] },
  { role: "forward", pos: [-10, 0, 5] },
];

export const AWAY_FORMATION: {
  role: PlayerRole;
  pos: [number, number, number];
}[] = [
  { role: "goalkeeper", pos: [50, 0, 0] },
  { role: "defender", pos: [35, 0, 10] },
  { role: "defender", pos: [35, 0, 3] },
  { role: "defender", pos: [35, 0, -3] },
  { role: "defender", pos: [35, 0, -10] },
  { role: "midfielder", pos: [20, 0, 15] },
  { role: "midfielder", pos: [20, 0, 5] },
  { role: "midfielder", pos: [20, 0, -5] },
  { role: "midfielder", pos: [20, 0, -15] },
  { role: "forward", pos: [10, 0, 5] },
  { role: "forward", pos: [10, 0, -5] },
];
