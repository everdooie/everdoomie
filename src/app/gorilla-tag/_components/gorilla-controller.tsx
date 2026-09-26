"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";

import { GorillaAvatar, type GorillaPalette } from "~/app/gorilla-tag/_components/gorilla-avatar";
import {
  ARM_REACH,
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_TURN_SPEED,
  createGorillaBodyState,
  HAND_RADIUS,
  PLATFORMS,
  SHOULDER_LOCAL,
  placeBone,
  solveTwoBoneIk,
  stepGorillaBody,
} from "~/app/gorilla-tag/_components/gorilla-physics";
import { consumeGorillaLookYaw, gorillaTouchState } from "~/app/gorilla-tag/_components/gorilla-touch";
import { type GorillaTurnKeys } from "~/app/gorilla-tag/_components/use-gorilla-turn-keys";

const FIST_HIT = "#ffb060";

/** Ignore surface hits closer than this to the camera. */
const MIN_AIM_RAY_DIST = 0.5;

/** How far behind the gorilla a slam target may sit. */
const MAX_AIM_BEHIND = 1.1;

/** Surface hits farther than this from the body are treated as air aim. */
const MAX_SURFACE_AIM_FROM_BODY = 7;

const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _viewPlane = new THREE.Plane();
const _viewNormal = new THREE.Vector3();
const _viewAnchor = new THREE.Vector3();
const _groundHit = new THREE.Vector3();
const _boxHit = new THREE.Vector3();
const _aimPoint = new THREE.Vector3();
const _localTarget = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _box = new THREE.Box3();
const _min = new THREE.Vector3();
const _max = new THREE.Vector3();
const _fromShoulder = new THREE.Vector3();
const _yawAxis = new THREE.Vector3(0, 1, 0);
const _touchPointer = new THREE.Vector2();

type GorillaControllerProps = {
  playing: boolean;
  tagged: boolean;
  touchAim: boolean;
  palette: GorillaPalette;
  turnKeysRef: RefObject<GorillaTurnKeys>;
  playerPositionRef: RefObject<THREE.Vector3>;
};

/**
 * World-space forward on XZ for the gorilla (away from the camera).
 *
 * @param cameraYaw - Orbit yaw in radians.
 * @param axis - 0 for X, 2 for Z.
 */
function facingAxis(cameraYaw: number, axis: 0 | 2): number {
  return axis === 0 ? -Math.sin(cameraYaw) : -Math.cos(cameraYaw);
}

/**
 * True when a world point is close enough and not behind the gorilla's back.
 *
 * @param hit - Candidate aim point.
 * @param bodyPos - Gorilla feet.
 * @param cameraYaw - Orbit yaw in radians.
 */
function isReachableSurfaceAim(
  hit: THREE.Vector3,
  bodyPos: THREE.Vector3,
  cameraYaw: number,
): boolean {
  const fx = facingAxis(cameraYaw, 0);
  const fz = facingAxis(cameraYaw, 2);
  const along = (hit.x - bodyPos.x) * fx + (hit.z - bodyPos.z) * fz;
  if (along < -MAX_AIM_BEHIND) return false;
  const beside = Math.hypot(hit.x - bodyPos.x, hit.z - bodyPos.z);
  return beside <= MAX_SURFACE_AIM_FROM_BODY;
}

/**
 * Points the fist at nearby grass or blocks, or into the air in front of the gorilla.
 *
 * Sky / far-horizon cursor positions use a vertical plane through the body so
 * the hand lifts up instead of snapping onto the ground behind the camera.
 *
 * @param raycaster - Camera ray through the mouse.
 * @param bodyPos - Gorilla feet.
 * @param cameraYaw - Orbit yaw in radians.
 */
function raycastAim(
  raycaster: THREE.Raycaster,
  bodyPos: THREE.Vector3,
  cameraYaw: number,
): THREE.Vector3 {
  let bestDist = Infinity;
  let found = false;

  /**
   * Keeps the closest valid surface hit.
   *
   * @param hit - Intersection point.
   */
  const consider = (hit: THREE.Vector3) => {
    const dist = raycaster.ray.origin.distanceTo(hit);
    if (dist <= MIN_AIM_RAY_DIST || dist >= bestDist) return;
    if (!isReachableSurfaceAim(hit, bodyPos, cameraYaw)) return;
    bestDist = dist;
    _aimPoint.copy(hit);
    found = true;
  };

  if (raycaster.ray.intersectPlane(_groundPlane, _groundHit)) {
    consider(_groundHit);
  }

  for (const platform of PLATFORMS) {
    _min.set(
      platform.x - platform.width / 2,
      platform.y - platform.height / 2,
      platform.z - platform.depth / 2,
    );
    _max.set(
      platform.x + platform.width / 2,
      platform.y + platform.height / 2,
      platform.z + platform.depth / 2,
    );
    _box.set(_min, _max);
    const hit = raycaster.ray.intersectBox(_box, _boxHit);
    if (hit) consider(hit);
  }

  if (found) return _aimPoint;

  const fx = facingAxis(cameraYaw, 0);
  const fz = facingAxis(cameraYaw, 2);
  _viewNormal.set(-fx, 0, -fz);
  _viewAnchor.set(bodyPos.x, bodyPos.y + SHOULDER_LOCAL.y, bodyPos.z);
  _viewPlane.setFromNormalAndCoplanarPoint(_viewNormal, _viewAnchor);

  if (!raycaster.ray.intersectPlane(_viewPlane, _aimPoint)) {
    _aimPoint.set(
      bodyPos.x + fx * 0.85,
      bodyPos.y + SHOULDER_LOCAL.y + 0.95,
      bodyPos.z + fz * 0.85,
    );
  }

  const along = (_aimPoint.x - bodyPos.x) * fx + (_aimPoint.z - bodyPos.z) * fz;
  if (along < 0.2) {
    _aimPoint.x = bodyPos.x + fx * 0.7;
    _aimPoint.z = bodyPos.z + fz * 0.7;
  }
  if (_aimPoint.y < bodyPos.y + 0.08) {
    _aimPoint.y = bodyPos.y + 0.08;
  }

  return _aimPoint;
}

/**
 * Third-person gorilla whose right arm reaches toward the mouse.
 *
 * Slam the fist into the grass or a platform to launch upward.
 *
 * @param playing - When false, pose is frozen.
 * @param tagged - When true, locomotion stops after a round ends.
 * @param touchAim - When true, the hand half drives the arm instead of the mouse.
 * @param palette - Fur and skin colors (brown civilian or red tagger).
 * @param turnKeysRef - A/D look keys tracked on the page (not the canvas).
 * @param playerPositionRef - Written each frame so tag bots can chase or flee.
 */
export function GorillaController({
  playing,
  tagged,
  touchAim,
  palette,
  turnKeysRef,
  playerPositionRef,
}: GorillaControllerProps) {
  const { camera, pointer, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const upperRef = useRef<THREE.Mesh>(null);
  const lowerRef = useRef<THREE.Mesh>(null);
  const fistRef = useRef<THREE.Mesh>(null);
  const fistMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef(createGorillaBodyState());
  const prevLocalHand = useRef(new THREE.Vector3());
  const swingVel = useRef(new THREE.Vector3());
  const handWorld = useRef(new THREE.Vector3());
  const hasPrev = useRef(false);
  const launchedAt = useRef(0);
  const cameraYaw = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const upper = upperRef.current;
    const lower = lowerRef.current;
    const fist = fistRef.current;
    if (!group || !upper || !lower || !fist) return;

    const body = bodyRef.current;

    if (playing && !tagged) {
      const held = turnKeysRef.current;
      const turn = (held?.left ? 1 : 0) + (held?.right ? -1 : 0);
      cameraYaw.current += turn * CAMERA_TURN_SPEED * Math.min(delta, 0.05);
      cameraYaw.current += consumeGorillaLookYaw();
    } else {
      consumeGorillaLookYaw();
    }

    group.position.copy(body.position);
    group.rotation.y = cameraYaw.current + Math.PI;

    if (touchAim && gorillaTouchState.hasHand) {
      _touchPointer.set(gorillaTouchState.pointerX, gorillaTouchState.pointerY);
      raycaster.setFromCamera(_touchPointer, camera);
    } else {
      raycaster.setFromCamera(pointer, camera);
    }
    const aim = raycastAim(raycaster, body.position, cameraYaw.current);
    if (markerRef.current) {
      markerRef.current.position.copy(aim);
      markerRef.current.position.y += 0.04;
    }

    group.updateMatrixWorld();

    _localTarget.copy(aim);
    group.worldToLocal(_localTarget);
    if (_localTarget.y > SHOULDER_LOCAL.y && _localTarget.z < 0.1) {
      _localTarget.z = 0.1;
    }
    _fromShoulder.copy(_localTarget).sub(SHOULDER_LOCAL);
    if (_fromShoulder.length() > ARM_REACH) {
      _fromShoulder.setLength(ARM_REACH);
      _localTarget.copy(SHOULDER_LOCAL).add(_fromShoulder);
    }

    _shoulder.copy(SHOULDER_LOCAL);
    _pole.set(SHOULDER_LOCAL.x + 0.7, SHOULDER_LOCAL.y - 0.2, SHOULDER_LOCAL.z + 0.2);
    solveTwoBoneIk(_shoulder, _localTarget, _pole, _elbow, _hand);
    placeBone(upper, _shoulder, _elbow);
    placeBone(lower, _elbow, _hand);
    fist.position.copy(_hand);

    const dt = Math.max(delta, 1 / 120);
    if (hasPrev.current) {
      swingVel.current.copy(_localTarget).sub(prevLocalHand.current);
      swingVel.current.applyAxisAngle(_yawAxis, group.rotation.y);
      swingVel.current.divideScalar(dt);
    } else {
      swingVel.current.set(0, 0, 0);
      hasPrev.current = true;
    }
    prevLocalHand.current.copy(_localTarget);
    handWorld.current.copy(_hand).applyMatrix4(group.matrixWorld);

    if (playing && !tagged) {
      const launched = stepGorillaBody(body, delta, swingVel.current, handWorld.current);
      if (launched) launchedAt.current = performance.now();
    }

    playerPositionRef.current?.copy(body.position);

    const flash = performance.now() - launchedAt.current < 150;
    if (fistMatRef.current) {
      fistMatRef.current.emissive.set(flash ? FIST_HIT : "#4a2a12");
      fistMatRef.current.color.set(flash ? FIST_HIT : palette.skin);
    }

    _camOffset.set(
      Math.sin(cameraYaw.current) * CAMERA_DISTANCE,
      CAMERA_HEIGHT + body.position.y * 0.05,
      Math.cos(cameraYaw.current) * CAMERA_DISTANCE,
    );
    camera.position.lerp(
      _lookAt.set(body.position.x, body.position.y, body.position.z).add(_camOffset),
      1 - Math.exp(-10 * Math.min(delta, 0.05)),
    );
    camera.lookAt(body.position.x, body.position.y + 1.15, body.position.z);
  });

  return (
    <>
      <group ref={groupRef}>
        <GorillaAvatar palette={palette}>
          <mesh ref={upperRef} castShadow>
            <boxGeometry args={[0.2, 0.2, 1]} />
            <meshStandardMaterial color={palette.fur} roughness={0.88} />
          </mesh>
          <mesh ref={lowerRef} castShadow>
            <boxGeometry args={[0.17, 0.17, 1]} />
            <meshStandardMaterial color={palette.furDark} roughness={0.86} />
          </mesh>
          <mesh ref={fistRef} castShadow>
            <sphereGeometry args={[HAND_RADIUS, 12, 12]} />
            <meshStandardMaterial
              ref={fistMatRef}
              color={palette.skin}
              roughness={0.65}
              emissive="#4a2a12"
              emissiveIntensity={0.35}
            />
          </mesh>
        </GorillaAvatar>
      </group>

      <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 16]} />
        <meshBasicMaterial color="#ffe27a" transparent opacity={0.7} />
      </mesh>
    </>
  );
}
