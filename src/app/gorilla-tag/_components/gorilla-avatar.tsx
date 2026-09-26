"use client";

import { type ReactNode } from "react";

import { HAND_RADIUS, SHOULDER_LOCAL } from "~/app/gorilla-tag/_components/gorilla-physics";

export type GorillaPalette = {
  fur: string;
  furDark: string;
  skin: string;
};

/** Player gorilla colors. */
export const PLAYER_PALETTE: GorillaPalette = {
  fur: "#5a3a22",
  furDark: "#3d2714",
  skin: "#c47a3a",
};

/** Infected tagger colors. */
export const BOT_PALETTE: GorillaPalette = {
  fur: "#7a1f1f",
  furDark: "#4a1010",
  skin: "#d45a3a",
};

type GorillaAvatarProps = {
  palette: GorillaPalette;
  children?: ReactNode;
};

/**
 * Shared low-poly gorilla body. Pass the right arm as children so the player
 * can attach mouse IK while bots attach a swinging chase arm.
 *
 * @param palette - Fur and skin colors.
 * @param children - Right-arm meshes parented at the gorilla root.
 */
export function GorillaAvatar({ palette, children }: GorillaAvatarProps) {
  return (
    <>
      <mesh position={[0, 0.38, 0.05]} rotation={[0.35, 0, 0]} castShadow>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshStandardMaterial color={palette.fur} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0.08]} rotation={[0.25, 0, 0]} castShadow>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial color={palette.fur} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.22, 0.18]} castShadow>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={palette.furDark} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.16, 0.38]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial color={palette.skin} roughness={0.7} />
      </mesh>

      <mesh position={[-0.18, 0.22, 0.08]} rotation={[0.4, 0.15, 0.1]} castShadow>
        <capsuleGeometry args={[0.12, 0.28, 4, 8]} />
        <meshStandardMaterial color={palette.furDark} roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.22, 0.08]} rotation={[0.4, -0.15, -0.1]} castShadow>
        <capsuleGeometry args={[0.12, 0.28, 4, 8]} />
        <meshStandardMaterial color={palette.furDark} roughness={0.9} />
      </mesh>

      <mesh position={[-0.4, 0.7, 0.05]} rotation={[0.9, 0, 0.45]} castShadow>
        <boxGeometry args={[0.16, 0.16, 0.7]} />
        <meshStandardMaterial color={palette.fur} roughness={0.9} />
      </mesh>
      <mesh position={[-0.52, 0.28, 0.28]} castShadow>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={palette.skin} roughness={0.7} />
      </mesh>

      <mesh position={[SHOULDER_LOCAL.x, SHOULDER_LOCAL.y, SHOULDER_LOCAL.z]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={palette.fur} roughness={0.9} />
      </mesh>

      {children ?? (
        <>
          <mesh position={[0.55, 0.55, 0.15]} rotation={[0.8, 0, -0.35]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.75]} />
            <meshStandardMaterial color={palette.fur} roughness={0.88} />
          </mesh>
          <mesh position={[0.62, 0.22, 0.35]} castShadow>
            <sphereGeometry args={[HAND_RADIUS, 10, 10]} />
            <meshStandardMaterial color={palette.skin} roughness={0.65} />
          </mesh>
        </>
      )}
    </>
  );
}
