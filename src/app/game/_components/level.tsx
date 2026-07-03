"use client";

import { useMemo } from "react";

import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import {
  getMapDimensions,
  TILE_SIZE,
  WALL_HEIGHT,
  CellType,
} from "~/app/game/_components/map-data";

/**
 * Builds wall, floor, and ceiling geometry from the grid map.
 *
 * Renders a retro Doom-style interior with stone walls and dim lighting.
 */
export function Level() {
  const { levelMap, lighting } = useGameSettings();
  const { width, depth } = useMemo(() => getMapDimensions(levelMap), [levelMap]);

  const walls = useMemo(() => {
    const positions: [number, number, number][] = [];

    for (let row = 0; row < levelMap.length; row++) {
      for (let col = 0; col < (levelMap[row]?.length ?? 0); col++) {
        if (levelMap[row]?.[col] === CellType.WALL) {
          positions.push([
            col * TILE_SIZE + TILE_SIZE / 2,
            WALL_HEIGHT / 2,
            row * TILE_SIZE + TILE_SIZE / 2,
          ]);
        }
      }
    }

    return positions;
  }, [levelMap]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#2a1f14" roughness={0.9} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[width / 2, WALL_HEIGHT, depth / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1208" roughness={1} />
      </mesh>

      {walls.map((position, index) => (
        <mesh key={`wall-${index}`} position={position} castShadow receiveShadow>
          <boxGeometry args={[TILE_SIZE, WALL_HEIGHT, TILE_SIZE]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#6b5344" : "#5a4638"}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}

      <ambientLight intensity={lighting.ambient} color="#ffcc99" />
      <hemisphereLight
        args={["#3d2a1f", "#1a1008", lighting.hemisphere]}
        position={[width / 2, WALL_HEIGHT, depth / 2]}
      />
      <directionalLight
        position={[width / 2, WALL_HEIGHT + 4, depth / 2]}
        intensity={lighting.directional}
        color="#ffd4a3"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {walls.slice(0, 8).map((position, index) => (
        <pointLight
          key={`light-${index}`}
          position={[position[0], 2.2, position[2]]}
          intensity={lighting.torchIntensity}
          distance={lighting.torchDistance}
          color={index % 2 === 0 ? "#ff6633" : "#ff9944"}
        />
      ))}
    </group>
  );
}
