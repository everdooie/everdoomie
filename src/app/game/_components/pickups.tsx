"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";

import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import { useGameState } from "~/app/game/_components/game-state";
import {
  getPickupItem,
  PICKUP_RADIUS,
  type PickupItemId,
  type PickupShape,
} from "~/app/game/_components/pickup-data";
import { isSimulationPaused } from "~/app/game/_components/simulation-pause";

type PickupMeshProps = {
  x: number;
  z: number;
  itemId: PickupItemId;
};

/**
 * Renders the 3D geometry for a pickup shape.
 *
 * @param shape - Visual shape identifier.
 * @param color - Base material color.
 * @param emissive - Emissive highlight color.
 * @param kind - Buff, debuff, or utility styling intensity.
 */
function PickupGeometry({
  shape,
  color,
  emissive,
  kind,
}: {
  shape: PickupShape;
  color: string;
  emissive: string;
  kind: "buff" | "debuff" | "utility";
}) {
  const intensity = kind === "buff" ? 1.5 : kind === "utility" ? 1.8 : 1;

  const material = (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={intensity}
      roughness={0.3}
      metalness={shape === "crate" ? 0.2 : 0.45}
    />
  );

  switch (shape) {
    case "crate":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.4, 0.55]} />
          {material}
        </mesh>
      );
    case "box":
      return (
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          {material}
        </mesh>
      );
    case "torus":
      return (
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.1, 8, 16]} />
          {material}
        </mesh>
      );
    case "sphere":
      return (
        <mesh castShadow>
          <sphereGeometry args={[0.32, 12, 12]} />
          {material}
        </mesh>
      );
    default:
      return (
        <mesh castShadow>
          <octahedronGeometry args={[0.35, 0]} />
          {material}
        </mesh>
      );
  }
}

/**
 * Renders a collectible pickup with shape, glow, and idle animation.
 *
 * @param x - World X position.
 * @param z - World Z position.
 * @param itemId - Pickup item type.
 */
function PickupMesh({ x, z, itemId }: PickupMeshProps) {
  const meshRef = useRef<THREE.Group>(null);
  const item = getPickupItem(itemId);
  const spinSpeed = item.kind === "debuff" ? -2 : item.id === "ammo-crate" ? 0.8 : 2.8;
  const { isPaused } = useGameSettings();

  useFrame((_, delta) => {
    if (!meshRef.current || isPaused || isSimulationPaused()) return;
    meshRef.current.rotation.y += delta * spinSpeed;
    const bob =
      item.id === "ammo-crate"
        ? 0.35 + Math.sin(performance.now() * 0.005) * 0.08
        : 0.75 + Math.sin(performance.now() * 0.004 + x) * 0.14;
    meshRef.current.position.y = bob;
  });

  return (
    <group ref={meshRef} position={[x, 0.75, z]}>
      <PickupGeometry
        shape={item.shape}
        color={item.color}
        emissive={item.emissive}
        kind={item.kind}
      />
      {item.id === "ammo-crate" && (
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.25, 0.08, 0.25]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={2} />
        </mesh>
      )}
      <pointLight
        color={item.emissive}
        intensity={item.kind === "utility" ? 1.6 : item.kind === "buff" ? 1.3 : 0.8}
        distance={5}
      />
    </group>
  );
}

/**
 * Renders active pickups and handles proximity collection against the player.
 */
export function Pickups() {
  const {
    pickups,
    playerPositionRef,
    collectPickup,
    isGameOver,
    isVictory,
    sessionId,
    currentWave,
  } = useGameState();
  const { isPaused } = useGameSettings();
  const collectedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    collectedRef.current = new Set();
  }, [sessionId, currentWave]);

  useFrame(() => {
    if (isGameOver || isVictory || isPaused || isSimulationPaused()) return;

    const player = playerPositionRef.current;
    for (const pickup of pickups) {
      if (collectedRef.current.has(pickup.id)) continue;

      const distance = Math.hypot(player.x - pickup.x, player.z - pickup.z);
      if (distance <= PICKUP_RADIUS) {
        collectedRef.current.add(pickup.id);
        collectPickup(pickup.id);
      }
    }
  });

  return (
    <group>
      {pickups.map((pickup) => (
        <PickupMesh key={pickup.id} x={pickup.x} z={pickup.z} itemId={pickup.itemId} />
      ))}
    </group>
  );
}
