"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Public URL path to the Demogorgon GLB asset. */
export const DEMOGORGON_MODEL_PATH = "/models/demogorgon.glb";

/** Target enemy height in world units (matches prior capsule enemies). */
export const DEMOGORGON_TARGET_HEIGHT = 2;

/**
 * Y-axis rotation offset so the GLB face aligns with the enemy group's lookAt.
 * Three.js lookAt aligns +Z toward the target; this GLB exports with face at +Z.
 */
export const DEMOGORGON_Y_ROTATION = 0;

type DemogorgonModelProps = {
  /** 0–1 health fraction; lowers material brightness as the enemy takes damage. */
  healthRatio?: number;
  /** Minimum emissive intensity at low health. */
  emissiveMin?: number;
  /** Maximum emissive intensity at full health. */
  emissiveMax?: number;
};

/**
 * Scales and grounds a cloned GLB scene so its feet sit at the local origin.
 *
 * @param scene - Loaded GLTF scene root.
 */
function prepareDemogorgonScene(scene: THREE.Object3D): THREE.Object3D {
  const clone = scene.clone(true);

  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const scale = DEMOGORGON_TARGET_HEIGHT / Math.max(size.y, 0.001);
  clone.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(clone);
  const center = scaledBox.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= scaledBox.min.y;

  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return clone;
}

/** Subtle emissive color so enemies read in dark corners. */
const ENEMY_EMISSIVE_COLOR = "#5a1a1a";

/** Chest-mounted point light — keeps demons visible without flooding the maze. */
export const ENEMY_LIGHT_INTENSITY = 1.1;
export const ENEMY_LIGHT_DISTANCE = 4.2;
export const ENEMY_LIGHT_COLOR = "#ee4a2a";

/**
 * Applies health-based color tint and emissive visibility to enemy materials.
 *
 * @param root - Prepared model root object.
 * @param healthRatio - Remaining health as a 0–1 fraction.
 */
function applyEnemyAppearance(
  root: THREE.Object3D,
  healthRatio: number,
  emissiveMin: number,
  emissiveMax: number,
): void {
  const tint = 0.58 + healthRatio * 0.28;
  const emissiveIntensity = emissiveMin + healthRatio * (emissiveMax - emissiveMin);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;

      material.userData.baseColor ??= material.color.clone();
      material.color.copy(material.userData.baseColor as THREE.Color).multiplyScalar(tint);
      material.emissive.set(ENEMY_EMISSIVE_COLOR);
      material.emissiveIntensity = emissiveIntensity;
    }
  });
}

/**
 * Renders the Demogorgon GLB enemy model scaled for the everdoomie maze.
 *
 * Each instance clones the shared GLTF scene so multiple enemies can render
 * independently. The model is auto-scaled to ~2 world units tall with feet
 * on the ground plane.
 */
export function DemogorgonModel({
  healthRatio = 1,
  emissiveMin = 0.14,
  emissiveMax = 0.4,
}: DemogorgonModelProps) {
  const { scene } = useGLTF(DEMOGORGON_MODEL_PATH);

  const model = useMemo(() => prepareDemogorgonScene(scene), [scene]);

  useEffect(() => {
    applyEnemyAppearance(model, healthRatio, emissiveMin, emissiveMax);
  }, [emissiveMax, emissiveMin, healthRatio, model]);

  return <primitive object={model} rotation={[0, DEMOGORGON_Y_ROTATION, 0]} />;
}

useGLTF.preload(DEMOGORGON_MODEL_PATH);
