"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";

import {
  DemogorgonModel,
  ENEMY_LIGHT_COLOR,
} from "~/app/game/_components/demogorgon-model";
import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import { useGameState } from "~/app/game/_components/game-state";
import {
  ENEMY_DAMAGE_COOLDOWN,
  isWalkable,
} from "~/app/game/_components/map-data";

type EnemyMeshProps = {
  id: string;
  initialX: number;
  initialZ: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
};

/**
 * Renders and updates a single Demogorgon enemy that chases the player.
 *
 * @param id - Unique enemy identifier used for damage tracking.
 * @param initialX - Starting world X position.
 * @param initialZ - Starting world Z position.
 * @param health - Current hit points.
 * @param maxHealth - Maximum hit points for health tinting.
 * @param speed - Movement speed toward the player.
 * @param damage - Contact damage dealt to the player.
 */
function EnemyMesh({
  id,
  initialX,
  initialZ,
  health,
  maxHealth,
  speed,
  damage,
}: EnemyMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const positionRef = useRef({ x: initialX, z: initialZ });
  const { playerPositionRef, damagePlayer, isGameOver, isVictory, wavePhase, sessionId } =
    useGameState();
  const { levelMap, isPaused, lighting } = useGameSettings();
  const lastDamageRef = useRef(0);

  useEffect(() => {
    positionRef.current = { x: initialX, z: initialZ };
    if (meshRef.current) {
      meshRef.current.position.set(initialX, 0, initialZ);
    }
  }, [initialX, initialZ, sessionId]);

  useFrame((_, delta) => {
    if (isGameOver || isVictory || isPaused || wavePhase === "intermission" || !meshRef.current) {
      return;
    }

    const player = playerPositionRef.current;
    const dx = player.x - positionRef.current.x;
    const dz = player.z - positionRef.current.z;
    const distance = Math.hypot(dx, dz);

    if (distance > 0.5) {
      const moveX = (dx / distance) * speed * delta;
      const moveZ = (dz / distance) * speed * delta;
      const nextX = positionRef.current.x + moveX;
      const nextZ = positionRef.current.z + moveZ;

      if (isWalkable(nextX, positionRef.current.z, levelMap, 0.5)) {
        positionRef.current.x = nextX;
      }
      if (isWalkable(positionRef.current.x, nextZ, levelMap, 0.5)) {
        positionRef.current.z = nextZ;
      }
    }

    meshRef.current.position.set(positionRef.current.x, 0, positionRef.current.z);
    meshRef.current.lookAt(player.x, 0, player.z);

    if (distance < 1.2) {
      const now = performance.now();
      if (now - lastDamageRef.current > ENEMY_DAMAGE_COOLDOWN) {
        damagePlayer(damage);
        lastDamageRef.current = now;
      }
    }
  });

  const healthRatio = Math.max(0, health / maxHealth);

  return (
    <group ref={meshRef} position={[initialX, 0, initialZ]} userData={{ enemyId: id }}>
      <pointLight
        position={[0, 1.2, 0.4]}
        intensity={lighting.enemyLightIntensity}
        distance={lighting.enemyLightDistance}
        color={ENEMY_LIGHT_COLOR}
        decay={2}
      />
      <DemogorgonModel
        healthRatio={healthRatio}
        emissiveMin={lighting.enemyEmissiveMin}
        emissiveMax={lighting.enemyEmissiveMax}
      />
    </group>
  );
}

/**
 * Renders all active enemies from game state.
 */
export function Enemies() {
  const { enemies } = useGameState();

  return (
    <group>
      {enemies.map((enemy) => (
        <EnemyMesh
          key={enemy.id}
          id={enemy.id}
          initialX={enemy.x}
          initialZ={enemy.z}
          health={enemy.health}
          maxHealth={enemy.maxHealth}
          speed={enemy.speed}
          damage={enemy.damage}
        />
      ))}
    </group>
  );
}
