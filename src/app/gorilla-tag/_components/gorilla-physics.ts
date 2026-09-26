import * as THREE from "three";

/** Gravity pulling the gorilla downward. */
export const GRAVITY = 26;

/** Peak upward speed after a slam. */
export const MAX_UPWARD_SPEED = 14;

/** Peak falling speed. */
export const MAX_FALL_SPEED = 32;

/** How hard a downward slam converts into jump speed. */
export const LAUNCH_GAIN = 1.05;

/** How closely the body tracks inverse fist motion while planted. */
export const PLANT_GAIN = 1.55;

/** Minimum downward fist speed that counts as a slam. */
export const MIN_SLAM_SPEED = 1.8;

/** Seconds before another slam can launch. */
export const HIT_COOLDOWN = 0.1;

/** Horizontal damping while airborne. */
export const AIR_FRICTION = 0.45;

/** Horizontal damping while standing. */
export const GROUND_FRICTION = 5;

/** Camera orbit speed in radians per second. */
export const CAMERA_TURN_SPEED = 4.2;

/** Fist collision radius. */
export const HAND_RADIUS = 0.2;

/** Horizontal body radius used for block walls. */
export const BODY_RADIUS = 0.42;

/** Body height used for block walls. */
export const BODY_HEIGHT = 1.25;

/** How close to a block's top you must be to land on it. */
export const LAND_ON_TOP_SLOP = 0.4;

/** Shoulder-to-elbow length. */
export const UPPER_ARM_LENGTH = 0.72;

/** Elbow-to-fist length. */
export const FOREARM_LENGTH = 0.82;

/** How far the fist can reach from the shoulder. */
export const ARM_REACH = UPPER_ARM_LENGTH + FOREARM_LENGTH - 0.04;

/** Camera follow distance behind the gorilla. */
export const CAMERA_DISTANCE = 5.2;

/** Camera height above the gorilla. */
export const CAMERA_HEIGHT = 2.15;

/** Local shoulder offset from the gorilla root (feet). */
export const SHOULDER_LOCAL = new THREE.Vector3(0.42, 1.08, 0.12);

export type Platform = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
};

/** Climbable wooden platforms in the playground. */
export const PLATFORMS: Platform[] = [
  { x: 6, y: 1, z: -5, width: 6, height: 2, depth: 6 },
  { x: -8, y: 1.6, z: 4, width: 5, height: 3.2, depth: 5 },
  { x: 10, y: 2.4, z: 8, width: 4.5, height: 4.8, depth: 4.5 },
  { x: -4, y: 0.6, z: -10, width: 7, height: 1.2, depth: 4 },
];

export type GorillaBodyState = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  wasHandOnSurface: boolean;
  hitCooldown: number;
};

const _toTarget = new THREE.Vector3();
const _poleDir = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);
const _boneDir = new THREE.Vector3();
const _boneQuat = new THREE.Quaternion();

/**
 * Creates the default gorilla physics state at the playground origin.
 */
export function createGorillaBodyState(): GorillaBodyState {
  return {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    wasHandOnSurface: false,
    hitCooldown: 0,
  };
}

/**
 * Returns the highest walkable surface under a world point.
 *
 * Wooden blocks only count when you are already at or above their top, so
 * walking into a side does not snap you onto the block.
 *
 * @param x - World X.
 * @param z - World Z.
 * @param y - Current feet Y.
 */
export function getSupportHeight(x: number, z: number, y: number): number {
  let support = 0;

  for (const platform of PLATFORMS) {
    const topY = platform.y + platform.height / 2;
    const onFootprint =
      Math.abs(x - platform.x) <= platform.width / 2 &&
      Math.abs(z - platform.z) <= platform.depth / 2;
    if (onFootprint && y >= topY - LAND_ON_TOP_SLOP) {
      support = Math.max(support, topY);
    }
  }

  return support;
}

/**
 * Returns the top face Y of a wooden block.
 *
 * @param platform - Block in the playground.
 */
export function getPlatformTop(platform: Platform): number {
  return platform.y + platform.height / 2;
}

/**
 * Pushes the gorilla out of wooden blocks instead of teleporting onto them.
 *
 * Landing is allowed only when the feet are already near the top face.
 *
 * @param state - Body state (mutated).
 */
export function resolveBlockCollisions(state: GorillaBodyState): void {
  const px = state.position.x;
  const py = state.position.y;
  const pz = state.position.z;
  const bodyTop = py + BODY_HEIGHT;

  for (const platform of PLATFORMS) {
    const halfW = platform.width / 2;
    const halfD = platform.depth / 2;
    const topY = getPlatformTop(platform);
    const botY = platform.y - platform.height / 2;
    const minX = platform.x - halfW - BODY_RADIUS;
    const maxX = platform.x + halfW + BODY_RADIUS;
    const minZ = platform.z - halfD - BODY_RADIUS;
    const maxZ = platform.z + halfD + BODY_RADIUS;

    if (px < minX || px > maxX || pz < minZ || pz > maxZ) continue;
    if (bodyTop < botY || py > topY) continue;

    if (py >= topY - LAND_ON_TOP_SLOP) {
      continue;
    }

    const penLeft = px - minX;
    const penRight = maxX - px;
    const penNear = pz - minZ;
    const penFar = maxZ - pz;
    const minPen = Math.min(penLeft, penRight, penNear, penFar);

    if (minPen === penLeft) {
      state.position.x = minX;
      if (state.velocity.x < 0) state.velocity.x = 0;
    } else if (minPen === penRight) {
      state.position.x = maxX;
      if (state.velocity.x > 0) state.velocity.x = 0;
    } else if (minPen === penNear) {
      state.position.z = minZ;
      if (state.velocity.z < 0) state.velocity.z = 0;
    } else {
      state.position.z = maxZ;
      if (state.velocity.z > 0) state.velocity.z = 0;
    }
  }
}

/**
 * Solves a two-bone arm so the fist reaches toward a local-space target.
 *
 * @param shoulder - Local shoulder joint.
 * @param target - Desired local fist position.
 * @param pole - Local point the elbow should bend toward.
 * @param elbowOut - Receives the local elbow position.
 * @param handOut - Receives the reachable local fist position.
 */
export function solveTwoBoneIk(
  shoulder: THREE.Vector3,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  elbowOut: THREE.Vector3,
  handOut: THREE.Vector3,
): void {
  _toTarget.subVectors(target, shoulder);
  const dist = _toTarget.length();
  const maxReach = ARM_REACH;
  const minReach = Math.abs(UPPER_ARM_LENGTH - FOREARM_LENGTH) + 0.02;
  const clampedDist = THREE.MathUtils.clamp(dist, minReach, maxReach);

  if (dist < 1e-5) {
    _toTarget.set(0, -1, 0);
  } else {
    _toTarget.multiplyScalar(1 / dist);
  }

  handOut.copy(shoulder).addScaledVector(_toTarget, clampedDist);

  const cosShoulder = THREE.MathUtils.clamp(
    (UPPER_ARM_LENGTH * UPPER_ARM_LENGTH +
      clampedDist * clampedDist -
      FOREARM_LENGTH * FOREARM_LENGTH) /
      (2 * UPPER_ARM_LENGTH * clampedDist),
    -1,
    1,
  );
  const sinShoulder = Math.sqrt(Math.max(0, 1 - cosShoulder * cosShoulder));

  _poleDir.subVectors(pole, shoulder);
  _poleDir.addScaledVector(_toTarget, -_poleDir.dot(_toTarget));
  if (_poleDir.lengthSq() < 1e-6) {
    _poleDir.crossVectors(_toTarget, _up);
    if (_poleDir.lengthSq() < 1e-6) {
      _poleDir.crossVectors(_toTarget, _xAxis);
    }
  }
  _poleDir.normalize();

  elbowOut
    .copy(shoulder)
    .addScaledVector(_toTarget, cosShoulder * UPPER_ARM_LENGTH)
    .addScaledVector(_poleDir, sinShoulder * UPPER_ARM_LENGTH);
}

/**
 * Places a Z-aligned bone mesh so it spans from one joint to another.
 *
 * @param mesh - Bone mesh whose geometry is 1 unit long along Z.
 * @param from - Start joint in the mesh parent's space.
 * @param to - End joint in the mesh parent's space.
 */
export function placeBone(mesh: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3): void {
  mesh.position.lerpVectors(from, to, 0.5);
  _boneDir.subVectors(to, from);
  const length = _boneDir.length();
  if (length < 1e-5) {
    mesh.scale.set(1, 1, 0.05);
    return;
  }

  _boneDir.multiplyScalar(1 / length);
  _boneQuat.setFromUnitVectors(_zAxis, _boneDir);
  mesh.quaternion.copy(_boneQuat);
  mesh.scale.set(1, 1, length);
}

/**
 * Integrates gorilla-tag body physics for one frame.
 *
 * Slamming a fist into the grass or the top of a block launches the body up.
 * Walking into a block's side stops you; it does not teleport you on top.
 * While the fist is planted, mouse motion pushes the body the opposite way.
 *
 * @param state - Persistent body state (mutated).
 * @param delta - Frame time in seconds.
 * @param swingVelocity - Fist velocity in world space, excluding body motion.
 * @param handWorld - Current fist position in world space.
 */
export function stepGorillaBody(
  state: GorillaBodyState,
  delta: number,
  swingVelocity: THREE.Vector3,
  handWorld: THREE.Vector3,
): boolean {
  const dt = Math.min(delta, 0.05);
  state.hitCooldown = Math.max(0, state.hitCooldown - dt);

  const surface = getSupportHeight(handWorld.x, handWorld.z, handWorld.y);
  const handOnSurface = handWorld.y <= surface + HAND_RADIUS + 0.04;

  let launched = false;
  if (
    handOnSurface &&
    !state.wasHandOnSurface &&
    state.hitCooldown <= 0 &&
    swingVelocity.y < -MIN_SLAM_SPEED
  ) {
    const boost = -swingVelocity.y * LAUNCH_GAIN;
    state.velocity.y = Math.min(MAX_UPWARD_SPEED, Math.max(state.velocity.y, 0) + boost);
    state.velocity.x -= swingVelocity.x * 0.7;
    state.velocity.z -= swingVelocity.z * 0.7;
    state.hitCooldown = HIT_COOLDOWN;
    launched = true;
  }

  if (handOnSurface) {
    const blend = Math.min(1, 12 * dt);
    state.velocity.x += (-swingVelocity.x * PLANT_GAIN - state.velocity.x) * blend;
    state.velocity.z += (-swingVelocity.z * PLANT_GAIN - state.velocity.z) * blend;
  }

  state.wasHandOnSurface = handOnSurface;

  state.velocity.y -= GRAVITY * dt;
  if (state.velocity.y < -MAX_FALL_SPEED) {
    state.velocity.y = -MAX_FALL_SPEED;
  }

  const feetY = getSupportHeight(state.position.x, state.position.z, state.position.y);
  const onFeet = state.position.y <= feetY + 0.02;
  if (!handOnSurface) {
    const damp = Math.exp(-(onFeet ? GROUND_FRICTION : AIR_FRICTION) * dt);
    state.velocity.x *= damp;
    state.velocity.z *= damp;
  }

  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;
  state.position.y += state.velocity.y * dt;

  resolveBlockCollisions(state);

  const nextFeet = getSupportHeight(state.position.x, state.position.z, state.position.y);
  if (state.position.y <= nextFeet) {
    state.position.y = nextFeet;
    if (state.velocity.y < 0) state.velocity.y = 0;
  }

  state.position.x = THREE.MathUtils.clamp(state.position.x, -28, 28);
  state.position.z = THREE.MathUtils.clamp(state.position.z, -28, 28);

  return launched;
}

/** Horizontal chase speed for tag bots. */
export const BOT_CHASE_SPEED = 5.4;

/** Horizontal flee speed when the player is the tagger. */
export const BOT_FLEE_SPEED = 4.1;

/** Upward hop speed when a bot slams. */
export const BOT_HOP_SPEED = 5.8;

/** Seconds between bot hops. */
export const BOT_HOP_INTERVAL = 0.42;

/** Body radius used for tag overlap. */
export const TAG_RADIUS = 1.05;

/** Seconds after spawn before bots can tag the player. */
export const TAG_IMMUNITY_SECONDS = 2.5;

export type TagBotState = GorillaBodyState & {
  hopTimer: number;
  yaw: number;
  caught: boolean;
};

/**
 * Creates a tag bot at a world spawn point.
 *
 * @param x - Spawn X.
 * @param z - Spawn Z.
 */
export function createTagBotState(x: number, z: number): TagBotState {
  return {
    position: new THREE.Vector3(x, getSupportHeight(x, z, 0), z),
    velocity: new THREE.Vector3(),
    wasHandOnSurface: false,
    hitCooldown: 0,
    hopTimer: Math.random() * BOT_HOP_INTERVAL,
    yaw: 0,
    caught: false,
  };
}

/**
 * Moves a tag bot toward or away from the player with hopping locomotion.
 *
 * @param state - Bot physics state (mutated).
 * @param delta - Frame time in seconds.
 * @param target - Player world position.
 * @param flee - When true, the bot runs away instead of chasing.
 */
export function stepTagBot(
  state: TagBotState,
  delta: number,
  target: THREE.Vector3,
  flee = false,
): void {
  const dt = Math.min(delta, 0.05);
  const dx = target.x - state.position.x;
  const dz = target.z - state.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist > 0.05) {
    let dirX = (dx / dist) * (flee ? -1 : 1);
    let dirZ = (dz / dist) * (flee ? -1 : 1);
    if (flee) {
      if (state.position.x > 22 && dirX > 0) dirX = -0.55;
      if (state.position.x < -22 && dirX < 0) dirX = 0.55;
      if (state.position.z > 22 && dirZ > 0) dirZ = -0.55;
      if (state.position.z < -22 && dirZ < 0) dirZ = 0.55;
      const turn = Math.hypot(dirX, dirZ);
      if (turn > 1e-5) {
        dirX /= turn;
        dirZ /= turn;
      }
    }

    const climb = target.y - state.position.y;
    const base = flee ? BOT_FLEE_SPEED : BOT_CHASE_SPEED;
    const speed = flee
      ? base * (dist > 14 ? 0.4 : 1)
      : base + (climb > 1.2 ? 1.2 : 0);
    const blend = Math.min(1, 6 * dt);
    state.velocity.x += (dirX * speed - state.velocity.x) * blend;
    state.velocity.z += (dirZ * speed - state.velocity.z) * blend;
    state.yaw = Math.atan2(dirX, dirZ);
  }

  state.hopTimer -= dt;
  const feet = getSupportHeight(state.position.x, state.position.z, state.position.y);
  const grounded = state.position.y <= feet + 0.04;

  if (grounded && state.hopTimer <= 0) {
    const extra = flee
      ? dist < 6
        ? 1.8
        : 0
      : target.y > state.position.y + 1.4
        ? 3.2
        : 0;
    state.velocity.y = BOT_HOP_SPEED + extra;
    state.hopTimer = BOT_HOP_INTERVAL + Math.random() * 0.12;
  }

  state.velocity.y -= GRAVITY * dt;
  if (state.velocity.y < -MAX_FALL_SPEED) {
    state.velocity.y = -MAX_FALL_SPEED;
  }

  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;
  state.position.y += state.velocity.y * dt;
  state.position.x = THREE.MathUtils.clamp(state.position.x, -28, 28);
  state.position.z = THREE.MathUtils.clamp(state.position.z, -28, 28);

  resolveBlockCollisions(state);

  const nextFeet = getSupportHeight(state.position.x, state.position.z, state.position.y);
  if (state.position.y <= nextFeet) {
    state.position.y = nextFeet;
    if (state.velocity.y < 0) state.velocity.y = 0;
  }
}
