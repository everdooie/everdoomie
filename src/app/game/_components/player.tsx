"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, type ComponentRef } from "react";
import * as THREE from "three";

import { unlockJumpScareAudio } from "~/app/game/_components/death-jumpscare-audio";
import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import { useGameState } from "~/app/game/_components/game-state";
import {
  isWalkable,
  parseSpawnPoints,
  SHOOT_RANGE,
} from "~/app/game/_components/map-data";
import {
  consumeTouchLookDelta,
  resetTouchInputState,
  touchInputState,
} from "~/app/game/_components/touch-input";

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

const PITCH_LIMIT = Math.PI / 2 - 0.05;

/**
 * First-person player controller with WASD/pointer-lock (computer) or touch (Android).
 *
 * Attach to the scene root; it creates the active camera and handles combat input.
 */
export function Player() {
  const { camera, scene } = useThree();
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const lastShotRef = useRef(0);
  const muzzleFlashRef = useRef<THREE.PointLight>(null);
  const { levelMap, isPaused, isSettingsOpen, settings } = useGameSettings();
  const spawns = useMemo(() => parseSpawnPoints(levelMap), [levelMap]);
  const isAndroid = settings.platform === "android";

  const {
    playerPositionRef,
    setIsLocked,
    damageEnemy,
    consumeAmmo,
    combatStats,
    enemies,
    isGameOver,
    isVictory,
    isLocked,
    sessionId,
  } = useGameState();

  useEffect(() => {
    camera.position.set(spawns.player.x, 1.6, spawns.player.z);
    camera.rotation.set(0, 0, 0);
    playerPositionRef.current = { x: spawns.player.x, z: spawns.player.z };
    resetTouchInputState();
  }, [camera, playerPositionRef, spawns.player.x, spawns.player.z, sessionId]);

  useEffect(() => {
    if (isAndroid) return;

    /**
     * Tracks pressed movement keys for continuous WASD input.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          keys.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.right = true;
          break;
      }
    };

    /**
     * Clears movement key state when keys are released.
     */
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          keys.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.right = false;
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isAndroid]);

  /**
   * Applies splash damage to enemies near a primary hit target.
   *
   * @param primaryId - Enemy that was directly hit.
   * @param directDamage - Damage dealt to the primary target.
   */
  const applySplashDamage = useCallback(
    (primaryId: string, directDamage: number) => {
      if (!combatStats.hasExplosiveRounds) return;

      const primary = enemies.find((enemy) => enemy.id === primaryId);
      if (!primary) return;

      const splashDamage = Math.round(
        directDamage * combatStats.explosiveSplashMultiplier,
      );

      for (const enemy of enemies) {
        if (enemy.id === primaryId) continue;
        const distance = Math.hypot(enemy.x - primary.x, enemy.z - primary.z);
        if (distance <= combatStats.explosiveSplashRadius) {
          damageEnemy(enemy.id, splashDamage);
        }
      }
    },
    [combatStats, damageEnemy, enemies],
  );

  /**
   * Performs a hitscan shot from the camera forward vector.
   */
  const shoot = useCallback(() => {
    if (isGameOver || isVictory || isPaused) return;

    unlockJumpScareAudio();

    const now = performance.now();
    if (now - lastShotRef.current < combatStats.fireCooldownMs) return;
    if (!consumeAmmo()) return;

    lastShotRef.current = now;

    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.intensity = 8;
      setTimeout(() => {
        if (muzzleFlashRef.current) muzzleFlashRef.current.intensity = 0;
      }, 50);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = SHOOT_RANGE;

    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        const enemyId = current.userData.enemyId as string | undefined;
        if (enemyId) {
          damageEnemy(enemyId, combatStats.shotDamage);
          applySplashDamage(enemyId, combatStats.shotDamage);
          return;
        }
        current = current.parent;
      }
    }
  }, [
    applySplashDamage,
    camera,
    combatStats.fireCooldownMs,
    combatStats.shotDamage,
    consumeAmmo,
    damageEnemy,
    isGameOver,
    isPaused,
    isVictory,
    scene,
  ]);

  useEffect(() => {
    if (isAndroid) return;

    /**
     * Fires the weapon when the player clicks while pointer lock is active.
     */
    const onMouseDown = () => {
      unlockJumpScareAudio();
      if (document.pointerLockElement) {
        shoot();
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isAndroid, shoot]);

  useFrame((_, delta) => {
    if (!isLocked || isGameOver || isVictory || isPaused || isSettingsOpen) return;

    if (isAndroid) {
      const { yaw, pitch } = consumeTouchLookDelta();
      camera.rotation.order = "YXZ";
      camera.rotation.y += yaw;
      camera.rotation.x = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, camera.rotation.x + pitch),
      );

      if (touchInputState.fireHeld) {
        shoot();
      }
    }

    velocity.current.set(0, 0, 0);
    direction.current.set(0, 0, 0);

    if (isAndroid) {
      direction.current.x = touchInputState.move.x;
      direction.current.z = touchInputState.move.z;
    } else {
      if (keys.forward) direction.current.z -= 1;
      if (keys.backward) direction.current.z += 1;
      if (keys.left) direction.current.x -= 1;
      if (keys.right) direction.current.x += 1;
    }

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize();
      direction.current.applyQuaternion(camera.quaternion);
      direction.current.y = 0;
      direction.current.normalize();

      velocity.current
        .copy(direction.current)
        .multiplyScalar(combatStats.moveSpeed * delta);

      const nextX = camera.position.x + velocity.current.x;
      const nextZ = camera.position.z + velocity.current.z;

      if (isWalkable(nextX, camera.position.z, levelMap)) {
        camera.position.x = nextX;
      }
      if (isWalkable(camera.position.x, nextZ, levelMap)) {
        camera.position.z = nextZ;
      }

      playerPositionRef.current = {
        x: camera.position.x,
        z: camera.position.z,
      };
    }

    camera.position.y = 1.6;
  });

  return (
    <>
      {!isAndroid && (
        <PointerLockControls
          ref={controlsRef}
          onLock={() => {
            unlockJumpScareAudio();
            setIsLocked(true);
          }}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      <group position={[0, -0.4, -0.6]}>
        <mesh position={[0.25, -0.2, -0.3]} rotation={[0.1, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.5]} />
          <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0.25, -0.15, 0.05]} rotation={[0.15, 0.05, 0]}>
          <boxGeometry args={[0.08, 0.15, 0.25]} />
          <meshStandardMaterial color="#222222" roughness={0.6} />
        </mesh>
      </group>

      <pointLight
        ref={muzzleFlashRef}
        position={[0.3, -0.1, -0.5]}
        intensity={0}
        distance={3}
        color="#ffaa44"
      />
    </>
  );
}
