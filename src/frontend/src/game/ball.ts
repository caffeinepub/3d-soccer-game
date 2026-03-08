import * as THREE from "three";

const BALL_RADIUS = 0.22;
const FRICTION = 0.985;
const AIR_RESISTANCE = 0.995;
const BOUNCE_RESTITUTION = 0.5;
const GRAVITY = 9.8;
const GROUND_FRICTION = 0.97;

export class Ball {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
  private scene: THREE.Scene;
  private prevPosition: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(0, BALL_RADIUS, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.prevPosition = this.position.clone();

    // Ball geometry — black/white soccer pattern via two materials
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;

    // Add shadow disc on ground
    const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.2, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.005;
    this.mesh.add(shadowDisc);
    // Counteract parent rotation so disc stays flat
    this.mesh.add(shadowDisc);

    scene.add(this.mesh);
    this.mesh.position.copy(this.position);
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
  }

  update(dt: number): "inPlay" | "outOfBounds" | null {
    this.prevPosition.copy(this.position);

    // Gravity
    this.velocity.y -= GRAVITY * dt;

    // Air resistance
    this.velocity.multiplyScalar(AIR_RESISTANCE);

    // Integrate position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Ground collision
    if (this.position.y <= BALL_RADIUS) {
      this.position.y = BALL_RADIUS;
      if (Math.abs(this.velocity.y) > 0.5) {
        this.velocity.y = -this.velocity.y * BOUNCE_RESTITUTION;
      } else {
        this.velocity.y = 0;
      }
      // Ground friction
      this.velocity.x *= GROUND_FRICTION;
      this.velocity.z *= GROUND_FRICTION;

      // Rolling friction when near stationary
      const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
      if (hSpeed > 0.1) {
        this.velocity.x *= FRICTION;
        this.velocity.z *= FRICTION;
      } else if (hSpeed < 0.1) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    // Update mesh
    this.mesh.position.copy(this.position);

    // Spin the ball based on velocity
    const speed = this.velocity.length();
    if (speed > 0.01) {
      const axis = new THREE.Vector3(
        -this.velocity.z,
        0,
        this.velocity.x,
      ).normalize();
      this.mesh.rotateOnWorldAxis(axis, (speed * dt) / BALL_RADIUS);
    }

    return "inPlay";
  }

  getSpeed(): number {
    return this.velocity.length();
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
