import * as THREE from "three";

// Field dimensions (standard proportions)
export const FIELD_LENGTH = 105;
export const FIELD_WIDTH = 68;
export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.5;
export const PENALTY_AREA_LENGTH = 16.5;
export const PENALTY_AREA_WIDTH = 40.32;
export const GOAL_AREA_LENGTH = 5.5;
export const GOAL_AREA_WIDTH = 18.32;
export const CENTER_CIRCLE_RADIUS = 9.15;
export const PENALTY_SPOT_DIST = 11;

export class SoccerField {
  group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.buildGrass();
    this.buildMarkings();
    this.buildGoals();
    this.buildCornerFlags();
    scene.add(this.group);
  }

  private buildGrass() {
    // Main grass plane
    const grassGeo = new THREE.PlaneGeometry(
      FIELD_LENGTH + 20,
      FIELD_WIDTH + 20,
    );
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d7d32,
      roughness: 0.9,
      metalness: 0.0,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.group.add(grass);

    // Stripe effect — alternating lighter/darker strips
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x388e3c,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
    });
    const stripeCount = 12;
    const stripeWidth = FIELD_LENGTH / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      const stripeGeo = new THREE.PlaneGeometry(stripeWidth, FIELD_WIDTH);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(
        -FIELD_LENGTH / 2 + stripeWidth * i + stripeWidth / 2,
        0.001,
        0,
      );
      this.group.add(stripe);
    }
  }

  private buildMarkings() {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1,
    });

    const lines: THREE.Vector3[][] = [];

    // Touchlines (sidelines)
    lines.push([
      new THREE.Vector3(-FIELD_LENGTH / 2, 0.01, -FIELD_WIDTH / 2),
      new THREE.Vector3(FIELD_LENGTH / 2, 0.01, -FIELD_WIDTH / 2),
    ]);
    lines.push([
      new THREE.Vector3(-FIELD_LENGTH / 2, 0.01, FIELD_WIDTH / 2),
      new THREE.Vector3(FIELD_LENGTH / 2, 0.01, FIELD_WIDTH / 2),
    ]);
    // Goal lines
    lines.push([
      new THREE.Vector3(-FIELD_LENGTH / 2, 0.01, -FIELD_WIDTH / 2),
      new THREE.Vector3(-FIELD_LENGTH / 2, 0.01, FIELD_WIDTH / 2),
    ]);
    lines.push([
      new THREE.Vector3(FIELD_LENGTH / 2, 0.01, -FIELD_WIDTH / 2),
      new THREE.Vector3(FIELD_LENGTH / 2, 0.01, FIELD_WIDTH / 2),
    ]);
    // Center line
    lines.push([
      new THREE.Vector3(0, 0.01, -FIELD_WIDTH / 2),
      new THREE.Vector3(0, 0.01, FIELD_WIDTH / 2),
    ]);

    // Penalty areas
    for (const side of [-1, 1]) {
      const gx = (FIELD_LENGTH / 2) * side;
      const paxOff = PENALTY_AREA_LENGTH * side * -1;
      lines.push([
        new THREE.Vector3(gx, 0.01, -PENALTY_AREA_WIDTH / 2),
        new THREE.Vector3(gx + paxOff, 0.01, -PENALTY_AREA_WIDTH / 2),
      ]);
      lines.push([
        new THREE.Vector3(gx + paxOff, 0.01, -PENALTY_AREA_WIDTH / 2),
        new THREE.Vector3(gx + paxOff, 0.01, PENALTY_AREA_WIDTH / 2),
      ]);
      lines.push([
        new THREE.Vector3(gx + paxOff, 0.01, PENALTY_AREA_WIDTH / 2),
        new THREE.Vector3(gx, 0.01, PENALTY_AREA_WIDTH / 2),
      ]);

      // Goal area
      const gaxOff = GOAL_AREA_LENGTH * side * -1;
      lines.push([
        new THREE.Vector3(gx, 0.01, -GOAL_AREA_WIDTH / 2),
        new THREE.Vector3(gx + gaxOff, 0.01, -GOAL_AREA_WIDTH / 2),
      ]);
      lines.push([
        new THREE.Vector3(gx + gaxOff, 0.01, -GOAL_AREA_WIDTH / 2),
        new THREE.Vector3(gx + gaxOff, 0.01, GOAL_AREA_WIDTH / 2),
      ]);
      lines.push([
        new THREE.Vector3(gx + gaxOff, 0.01, GOAL_AREA_WIDTH / 2),
        new THREE.Vector3(gx, 0.01, GOAL_AREA_WIDTH / 2),
      ]);

      // Penalty spot
      const spotX = gx + PENALTY_SPOT_DIST * side * -1;
      this.addSpot(spotX, 0, lineMat);
    }

    // Add all line segments
    for (const pts of lines) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat);
      this.group.add(line);
    }

    // Center circle
    this.addCircle(0, 0, CENTER_CIRCLE_RADIUS, 64, lineMat);
    // Center spot
    this.addSpot(0, 0, lineMat);

    // Corner arcs
    const cornerRadius = 1;
    const corners = [
      {
        x: -FIELD_LENGTH / 2,
        z: -FIELD_WIDTH / 2,
        startAngle: 0,
        endAngle: Math.PI / 2,
      },
      {
        x: FIELD_LENGTH / 2,
        z: -FIELD_WIDTH / 2,
        startAngle: Math.PI / 2,
        endAngle: Math.PI,
      },
      {
        x: FIELD_LENGTH / 2,
        z: FIELD_WIDTH / 2,
        startAngle: Math.PI,
        endAngle: (3 * Math.PI) / 2,
      },
      {
        x: -FIELD_LENGTH / 2,
        z: FIELD_WIDTH / 2,
        startAngle: (3 * Math.PI) / 2,
        endAngle: 2 * Math.PI,
      },
    ];
    for (const c of corners) {
      this.addArc(
        c.x,
        c.z,
        cornerRadius,
        c.startAngle,
        c.endAngle,
        16,
        lineMat,
      );
    }
  }

  private addCircle(
    cx: number,
    cz: number,
    radius: number,
    segments: number,
    mat: THREE.LineBasicMaterial,
  ) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          cx + Math.cos(angle) * radius,
          0.01,
          cz + Math.sin(angle) * radius,
        ),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    this.group.add(line);
  }

  private addArc(
    cx: number,
    cz: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    segments: number,
    mat: THREE.LineBasicMaterial,
  ) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + ((endAngle - startAngle) * i) / segments;
      pts.push(
        new THREE.Vector3(
          cx + Math.cos(angle) * radius,
          0.01,
          cz + Math.sin(angle) * radius,
        ),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    this.group.add(line);
  }

  private addSpot(x: number, z: number, mat: THREE.LineBasicMaterial) {
    this.addCircle(x, z, 0.3, 16, mat);
  }

  private buildGoals() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.3,
    });
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    for (const side of [-1, 1]) {
      const gx = (FIELD_LENGTH / 2) * side;
      const goalGroup = new THREE.Group();

      const postRadius = 0.06;
      const crossbarRadius = 0.06;

      // Left post
      const leftPostGeo = new THREE.CylinderGeometry(
        postRadius,
        postRadius,
        GOAL_HEIGHT,
        8,
      );
      const leftPost = new THREE.Mesh(leftPostGeo, postMat);
      leftPost.position.set(0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
      leftPost.castShadow = true;
      goalGroup.add(leftPost);

      // Right post
      const rightPostGeo = new THREE.CylinderGeometry(
        postRadius,
        postRadius,
        GOAL_HEIGHT,
        8,
      );
      const rightPost = new THREE.Mesh(rightPostGeo, postMat);
      rightPost.position.set(0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
      rightPost.castShadow = true;
      goalGroup.add(rightPost);

      // Crossbar
      const crossbarGeo = new THREE.CylinderGeometry(
        crossbarRadius,
        crossbarRadius,
        GOAL_WIDTH,
        8,
      );
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, GOAL_HEIGHT, 0);
      crossbar.castShadow = true;
      goalGroup.add(crossbar);

      // Back post (depth)
      const backDepth = -GOAL_DEPTH * side;
      const backLeftGeo = new THREE.CylinderGeometry(
        postRadius,
        postRadius,
        GOAL_HEIGHT,
        8,
      );
      const backLeft = new THREE.Mesh(backLeftGeo, postMat);
      backLeft.position.set(backDepth, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
      goalGroup.add(backLeft);

      const backRightGeo = new THREE.CylinderGeometry(
        postRadius,
        postRadius,
        GOAL_HEIGHT,
        8,
      );
      const backRight = new THREE.Mesh(backRightGeo, postMat);
      backRight.position.set(backDepth, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
      goalGroup.add(backRight);

      // Top back bar
      const topBackGeo = new THREE.CylinderGeometry(
        crossbarRadius,
        crossbarRadius,
        GOAL_WIDTH,
        8,
      );
      const topBack = new THREE.Mesh(topBackGeo, postMat);
      topBack.rotation.x = Math.PI / 2;
      topBack.position.set(backDepth, GOAL_HEIGHT, 0);
      goalGroup.add(topBack);

      // Connect side bars (top)
      const sideBarLen = GOAL_DEPTH;
      const topLeftSideGeo = new THREE.CylinderGeometry(
        crossbarRadius,
        crossbarRadius,
        sideBarLen,
        8,
      );
      const topLeftSide = new THREE.Mesh(topLeftSideGeo, postMat);
      topLeftSide.rotation.z = Math.PI / 2;
      topLeftSide.position.set(backDepth / 2, GOAL_HEIGHT, -GOAL_WIDTH / 2);
      goalGroup.add(topLeftSide);

      const topRightSideGeo = new THREE.CylinderGeometry(
        crossbarRadius,
        crossbarRadius,
        sideBarLen,
        8,
      );
      const topRightSide = new THREE.Mesh(topRightSideGeo, postMat);
      topRightSide.rotation.z = Math.PI / 2;
      topRightSide.position.set(backDepth / 2, GOAL_HEIGHT, GOAL_WIDTH / 2);
      goalGroup.add(topRightSide);

      // Net (back, sides, top)
      const netBack = new THREE.Mesh(
        new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT),
        netMat,
      );
      netBack.position.set(backDepth, GOAL_HEIGHT / 2, 0);
      netBack.rotation.y = side === -1 ? 0 : Math.PI;
      goalGroup.add(netBack);

      const netTop = new THREE.Mesh(
        new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_WIDTH),
        netMat,
      );
      netTop.rotation.x = Math.PI / 2;
      netTop.rotation.z = Math.PI / 2;
      netTop.position.set(backDepth / 2, GOAL_HEIGHT, 0);
      goalGroup.add(netTop);

      const netLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT),
        netMat,
      );
      netLeft.rotation.y = Math.PI / 2;
      netLeft.position.set(backDepth / 2, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
      goalGroup.add(netLeft);

      const netRight = new THREE.Mesh(
        new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT),
        netMat,
      );
      netRight.rotation.y = -Math.PI / 2;
      netRight.position.set(backDepth / 2, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
      goalGroup.add(netRight);

      goalGroup.position.set(gx, 0, 0);
      this.group.add(goalGroup);
    }
  }

  private buildCornerFlags() {
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
    const corners = [
      { x: -FIELD_LENGTH / 2, z: -FIELD_WIDTH / 2 },
      { x: FIELD_LENGTH / 2, z: -FIELD_WIDTH / 2 },
      { x: FIELD_LENGTH / 2, z: FIELD_WIDTH / 2 },
      { x: -FIELD_LENGTH / 2, z: FIELD_WIDTH / 2 },
    ];
    for (const c of corners) {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
      const pole = new THREE.Mesh(poleGeo, flagMat);
      pole.position.set(c.x, 0.75, c.z);
      this.group.add(pole);

      // Small flag triangle
      const flagGeo = new THREE.BufferGeometry();
      const verts = new Float32Array([0, 0.75, 0, 0, 1.5, 0, 0.6, 1.2, 0]);
      flagGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      const flagMesh = new THREE.Mesh(
        flagGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffeb3b,
          side: THREE.DoubleSide,
        }),
      );
      flagMesh.position.set(c.x, 0, c.z);
      this.group.add(flagMesh);
    }
  }
}

export function isInGoal(position: THREE.Vector3): "home" | "away" | null {
  // Away goal: positive X side
  if (
    position.x > FIELD_LENGTH / 2 - 0.5 &&
    Math.abs(position.z) < GOAL_WIDTH / 2 &&
    position.y < GOAL_HEIGHT + 0.5
  ) {
    return "home"; // home team scored
  }
  // Home goal: negative X side
  if (
    position.x < -FIELD_LENGTH / 2 + 0.5 &&
    Math.abs(position.z) < GOAL_WIDTH / 2 &&
    position.y < GOAL_HEIGHT + 0.5
  ) {
    return "away"; // away team scored
  }
  return null;
}

export function isOutOfBounds(position: THREE.Vector3): boolean {
  return (
    Math.abs(position.x) > FIELD_LENGTH / 2 + 1 ||
    Math.abs(position.z) > FIELD_WIDTH / 2 + 1
  );
}
