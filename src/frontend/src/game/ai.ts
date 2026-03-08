import * as THREE from "three";
import type { Ball } from "./ball";
import { FIELD_LENGTH, GOAL_WIDTH } from "./field";
import type { Player } from "./player";

const BALL_CONTROL_RANGE = 1.2;
const TACKLE_RANGE = 1.5;
const SHOOT_RANGE = 25;

export function updateTeammateAI(
  player: Player,
  ball: Ball,
  controlledPlayer: Player,
  teammates: Player[],
  opponents: Player[],
  dt: number,
) {
  if (player.isControlled) return;

  const distToBall = player.position.distanceTo(ball.position);
  const ballOwner = findNearestPlayer(
    [...teammates, ...opponents],
    ball.position,
    2.0,
  );
  const teamHasBall = ballOwner?.team === player.team;

  if (player.isGoalkeeper) {
    updateGoalkeeperAI(
      player,
      ball,
      player.team === "home" ? -FIELD_LENGTH / 2 : FIELD_LENGTH / 2,
      dt,
    );
    return;
  }

  // Determine if we should press or hold formation
  const isClosestTeammateToBall = isClosestInTeam(player, teammates, ball);

  if (isClosestTeammateToBall && !controlledPlayer.hasBall) {
    // Press toward ball
    player.moveToward(ball.position, 6.5, dt);
  } else if (teamHasBall) {
    // Support attack: move to open space ahead of ball
    const supportPos = getAttackSupportPosition(player, ball, player.team);
    player.moveToward(supportPos, 5.0, dt);
  } else {
    // Defensive shape: move toward formation position
    const formPos = getDefensivePosition(player, ball);
    player.moveToward(formPos, 4.0, dt);
  }

  // Basic AI shooting: if close to goal and has ball
  if (distToBall < BALL_CONTROL_RANGE && !controlledPlayer.hasBall) {
    const goalPos =
      player.team === "home"
        ? new THREE.Vector3(FIELD_LENGTH / 2, 0, 0)
        : new THREE.Vector3(-FIELD_LENGTH / 2, 0, 0);
    const distToGoal = player.position.distanceTo(goalPos);
    if (distToGoal < SHOOT_RANGE) {
      // Shoot toward goal
      const dir = goalPos.clone().sub(ball.position);
      dir.y = 0.2;
      dir.normalize();
      const power = Math.min(
        1.0,
        0.5 + ((SHOOT_RANGE - distToGoal) / SHOOT_RANGE) * 0.5,
      );
      ball.velocity.copy(dir.multiplyScalar(power * 18));
    }
  }
}

export function updateOpponentAI(
  player: Player,
  ball: Ball,
  controlledPlayer: Player,
  opponents: Player[],
  homeTeam: Player[],
  dt: number,
) {
  if (player.isControlled) return;

  const distToBall = player.position.distanceTo(ball.position);

  if (player.isGoalkeeper) {
    updateGoalkeeperAI(player, ball, FIELD_LENGTH / 2, dt);
    return;
  }

  const ballOwner = findNearestPlayer(
    [...homeTeam, ...opponents],
    ball.position,
    2.0,
  );
  const awayHasBall = ballOwner?.team === "away";

  const isClosestOpponentToBall = isClosestInTeam(player, opponents, ball);

  if (isClosestOpponentToBall) {
    // Press ball carrier
    player.moveToward(ball.position, 6.0, dt);

    // Tackle if close enough
    if (distToBall < TACKLE_RANGE && ball.velocity.length() < 5) {
      // Steal ball
      const dir = new THREE.Vector3(
        ball.position.x - player.position.x,
        0,
        ball.position.z - player.position.z,
      ).normalize();
      ball.velocity.x += dir.x * 5 + (Math.random() - 0.5) * 3;
      ball.velocity.z += dir.z * 5 + (Math.random() - 0.5) * 3;
    }
  } else if (awayHasBall) {
    // Support attack
    const supportPos = getAttackSupportPosition(player, ball, "away");
    player.moveToward(supportPos, 5.0, dt);
  } else {
    // Defensive shape
    const formPos = getDefensivePosition(player, ball);
    player.moveToward(formPos, 3.5, dt);
  }

  // Away AI shooting
  if (distToBall < BALL_CONTROL_RANGE && !controlledPlayer.hasBall) {
    const goalPos = new THREE.Vector3(-FIELD_LENGTH / 2, 0, 0); // attack home goal
    const distToGoal = player.position.distanceTo(goalPos);
    if (distToGoal < SHOOT_RANGE) {
      const dir = goalPos.clone().sub(ball.position);
      dir.y = 0.2;
      dir.normalize();
      const power = Math.min(
        1.0,
        0.5 + ((SHOOT_RANGE - distToGoal) / SHOOT_RANGE) * 0.5,
      );
      ball.velocity.copy(dir.multiplyScalar(power * 17));
    }
  }
}

function updateGoalkeeperAI(
  player: Player,
  ball: Ball,
  goalLineX: number,
  dt: number,
) {
  const distToBall = player.position.distanceTo(ball.position);

  // Track ball laterally but stay near goal line
  const targetZ = Math.max(
    -GOAL_WIDTH / 2 + 0.5,
    Math.min(GOAL_WIDTH / 2 - 0.5, ball.position.z),
  );
  const targetX = goalLineX + (goalLineX < 0 ? 2 : -2); // just off goal line

  const target = new THREE.Vector3(targetX, 0, targetZ);
  player.moveToward(target, 5.0, dt);

  // Dive if ball is incoming close
  if (distToBall < 8 && Math.abs(ball.velocity.x) > 5) {
    player.moveToward(new THREE.Vector3(targetX, 0, ball.position.z), 9.0, dt);
  }

  // Save: redirect ball if very close
  if (distToBall < 2.0) {
    const awayDir = player.position.clone().sub(ball.position).normalize();
    awayDir.y = 0.5;
    awayDir.multiplyScalar(12);
    ball.velocity.copy(awayDir);
  }
}

function findNearestPlayer(
  players: Player[],
  position: THREE.Vector3,
  maxDist: number,
): Player | null {
  let nearest: Player | null = null;
  let minDist = maxDist;
  for (const p of players) {
    const d = p.position.distanceTo(position);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  return nearest;
}

function isClosestInTeam(
  player: Player,
  teammates: Player[],
  ball: Ball,
): boolean {
  const myDist = player.position.distanceTo(ball.position);
  for (const t of teammates) {
    if (t === player || t.isControlled || t.isGoalkeeper) continue;
    if (t.position.distanceTo(ball.position) < myDist) return false;
  }
  return true;
}

function getAttackSupportPosition(
  player: Player,
  ball: Ball,
  team: "home" | "away",
): THREE.Vector3 {
  const formPos = player.formationPosition.clone();
  // Move formation position toward ball's X side
  const attackDir = team === "home" ? 1 : -1;
  const ballX = ball.position.x * 0.4;
  formPos.x += ballX * 0.5 * attackDir;
  formPos.z += (ball.position.z - formPos.z) * 0.3;
  return formPos;
}

function getDefensivePosition(player: Player, ball: Ball): THREE.Vector3 {
  const formPos = player.formationPosition.clone();
  // Pull toward ball slightly
  formPos.x += (ball.position.x - formPos.x) * 0.15;
  formPos.z += (ball.position.z - formPos.z) * 0.1;
  return formPos;
}

// Free kick wall AI
export function updateFreeKickWallAI(
  defenders: Player[],
  ball: Ball,
  dt: number,
) {
  // Maintain wall position - stand 9.15 units from ball
  const wallCenterZ = ball.position.z;
  const wallX = ball.position.x + (ball.position.x < 0 ? 9.15 : -9.15);

  defenders.forEach((d, i) => {
    const offset = (i - (defenders.length - 1) / 2) * 0.9;
    const target = new THREE.Vector3(wallX, 0, wallCenterZ + offset);
    d.moveToward(target, 8.0, dt);
  });
}

// Penalty AI: GK dives on shot
export function updatePenaltyGK(
  gk: Player,
  ballKicked: boolean,
  ballVelocity: THREE.Vector3,
  goalLineX: number,
  dt: number,
): void {
  if (!ballKicked) {
    // Slight lateral sway
    const sway = Math.sin(Date.now() * 0.002) * 1.5;
    const target = new THREE.Vector3(
      goalLineX + (goalLineX < 0 ? 1.5 : -1.5),
      0,
      sway,
    );
    gk.moveToward(target, 3.0, dt);
  } else {
    // Dive toward ball
    const diveTarget = new THREE.Vector3(
      goalLineX + (goalLineX < 0 ? 1.5 : -1.5),
      0,
      ballVelocity.z > 0 ? 3 : -3,
    );
    gk.moveToward(diveTarget, 12.0, dt);
  }
}

export function passBallToTeammate(
  ball: Ball,
  fromPlayer: Player,
  teammates: Player[],
  power: number,
  direction: THREE.Vector3,
): boolean {
  const candidates = teammates.filter((t) => {
    if (t.isControlled) return false;
    const toT = t.position.clone().sub(fromPlayer.position).normalize();
    return toT.dot(direction) > 0.3;
  });

  if (candidates.length === 0) return false;

  candidates.sort(
    (a, b) =>
      a.position.distanceTo(fromPlayer.position) -
      b.position.distanceTo(fromPlayer.position),
  );

  const target = candidates[0];
  const dir = target.position.clone().sub(fromPlayer.position);
  dir.y = 0.15 * power;
  dir.normalize();
  ball.velocity.copy(dir.multiplyScalar(power * 16));
  ball.position.copy(fromPlayer.position).addScaledVector(dir, 1.2);
  return true;
}

export function shootBall(ball: Ball, player: Player, power: number) {
  const dir = player.facingDirection.clone();
  dir.y = 0.25;
  dir.normalize();
  ball.velocity.copy(dir.multiplyScalar(power * 22));
  ball.position.copy(player.position);
  ball.position.y = 0.22;
  ball.position.addScaledVector(dir, 1.2);
  ball.mesh.position.copy(ball.position);
  player.triggerKickAnimation();
}
