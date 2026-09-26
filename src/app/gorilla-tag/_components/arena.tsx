"use client";

import { PLATFORMS } from "~/app/gorilla-tag/_components/gorilla-physics";

const TREES: { x: number; z: number; height: number }[] = [
  { x: -14, z: -12, height: 7 },
  { x: 16, z: -14, height: 8 },
  { x: -18, z: 10, height: 6.5 },
  { x: 18, z: 14, height: 9 },
  { x: 2, z: 16, height: 7.5 },
  { x: -10, z: 18, height: 6 },
];

/**
 * Forest playground: grass floor, wooden platforms, and tree trunks.
 */
export function Arena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#3d7a3a" roughness={0.95} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[8, 24]} />
        <meshStandardMaterial color="#4a8a42" roughness={1} />
      </mesh>

      {PLATFORMS.map((platform) => (
        <mesh
          key={`${platform.x}-${platform.z}`}
          position={[platform.x, platform.y, platform.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[platform.width, platform.height, platform.depth]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
        </mesh>
      ))}

      {TREES.map((tree) => (
        <group key={`tree-${tree.x}-${tree.z}`} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.6, tree.height, 8]} />
            <meshStandardMaterial color="#5a3a22" roughness={0.9} />
          </mesh>
          <mesh position={[0, tree.height + 1.2, 0]} castShadow>
            <sphereGeometry args={[2.2, 10, 10]} />
            <meshStandardMaterial color="#2f6b2a" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <ambientLight intensity={0.55} color="#fff4d6" />
      <hemisphereLight args={["#9fd4ff", "#3d5c2a", 0.7]} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.35}
        color="#fff3c4"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}
