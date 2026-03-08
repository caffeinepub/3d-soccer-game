import * as THREE from "three";

const DOT_COUNT = 8;
const DOT_RADIUS = 0.12;
const MAX_RANGE = 18; // max arrow length in world units

export class TrajectoryArrow {
  private scene: THREE.Scene;
  private dots: THREE.Mesh[];
  private arrowHead: THREE.Mesh;
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.dots = [];

    const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    for (let i = 0; i < DOT_COUNT; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      dot.renderOrder = 2;
      this.dots.push(dot);
      this.group.add(dot);
    }

    // Arrowhead cone at tip
    const headGeo = new THREE.ConeGeometry(0.22, 0.55, 8);
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.arrowHead = new THREE.Mesh(headGeo, headMat);
    this.arrowHead.renderOrder = 2;
    this.group.add(this.arrowHead);

    this.group.visible = false;
    scene.add(this.group);
  }

  /**
   * Update the trajectory arrow.
   * @param ballPos   Current ball world position
   * @param dirX      Shoot direction X (normalised)
   * @param dirZ      Shoot direction Z (normalised)
   * @param power     0..1 power bar value
   * @param visible   Whether to show the arrow
   * @param aimHeight 0..1 vertical aim (0 = low, 1 = high). Adds arc to dots.
   */
  update(
    ballPos: THREE.Vector3,
    dirX: number,
    dirZ: number,
    power: number,
    visible: boolean,
    aimHeight = 0,
  ) {
    this.group.visible = visible && power > 0.02;
    if (!this.group.visible) return;

    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len < 0.01) {
      this.group.visible = false;
      return;
    }
    const nx = dirX / len;
    const nz = dirZ / len;

    const totalLen = power * MAX_RANGE;
    const step = totalLen / (DOT_COUNT + 1);

    const groundY = 0.18; // just above ground
    // Peak height of arc: 0 when flat, up to ~3.5m when aiming high
    const peakHeight = aimHeight * 3.5;

    for (let i = 0; i < DOT_COUNT; i++) {
      const t = (i + 1) * step;
      const frac = (i + 1) / (DOT_COUNT + 1); // 0..1 along trajectory
      // Parabolic arc: rises then falls, peaks around mid-flight
      const arc = peakHeight * 4 * frac * (1 - frac);
      // Fade dots farther out
      const alpha = 0.85 * (1 - (i / DOT_COUNT) * 0.55);
      const scale = 1.0 - (i / DOT_COUNT) * 0.4;
      this.dots[i].position.set(
        ballPos.x + nx * t,
        groundY + arc,
        ballPos.z + nz * t,
      );
      this.dots[i].scale.setScalar(scale);
      (this.dots[i].material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    // Arrowhead at the tip
    const tipT = (DOT_COUNT + 0.8) * step;
    const tipFrac = (DOT_COUNT + 0.8) / (DOT_COUNT + 1);
    const tipArc = peakHeight * 4 * tipFrac * (1 - tipFrac);
    this.arrowHead.position.set(
      ballPos.x + nx * tipT,
      groundY + tipArc + 0.27,
      ballPos.z + nz * tipT,
    );
    // Rotate cone to point in direction of travel (cone default points +Y)
    const angle = Math.atan2(nx, nz);
    this.arrowHead.rotation.set(-Math.PI / 2, 0, 0); // lay flat
    this.arrowHead.rotation.y = angle;
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
