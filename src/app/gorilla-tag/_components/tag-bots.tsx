"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Group, Vector3 } from "three";

import {
  BOT_PALETTE,
  GorillaAvatar,
  PLAYER_PALETTE,
  type GorillaPalette,
} from "~/app/gorilla-tag/_components/gorilla-avatar";
import {
  createTagBotState,
  stepTagBot,
  TAG_IMMUNITY_SECONDS,
  TAG_RADIUS,
  type TagBotState,
} from "~/app/gorilla-tag/_components/gorilla-physics";

const BOT_SPAWNS: { x: number; z: number }[] = [
  { x: -12, z: 9 },
  { x: 13, z: -7 },
  { x: -8, z: -13 },
  { x: 15, z: 11 },
];

/** How many bots spawn in tag and tagger modes. */
export const BOT_COUNT = BOT_SPAWNS.length;

export type BotRole = "hunter" | "prey";

type TagBotsProps = {
  playing: boolean;
  roundOver: boolean;
  role: BotRole;
  playerPositionRef: RefObject<Vector3>;
  onPlayerTagged: () => void;
  onPreyTagged: () => void;
};

/**
 * Gorilla bots that either hunt the player or flee from the tagger.
 *
 * @param playing - When false, bots idle.
 * @param roundOver - When true, tagging and movement stop.
 * @param role - Hunters chase; prey flee and can be tagged.
 * @param playerPositionRef - Live player feet position.
 * @param onPlayerTagged - Called once when a hunter tags the player.
 * @param onPreyTagged - Called once per prey the player tags.
 */
export function TagBots({
  playing,
  roundOver,
  role,
  playerPositionRef,
  onPlayerTagged,
  onPreyTagged,
}: TagBotsProps) {
  const bots = useMemo(
    () => BOT_SPAWNS.map((spawn) => createTagBotState(spawn.x, spawn.z)),
    [],
  );
  const spawnedAt = useRef(performance.now());
  const playerTaggedRef = useRef(false);

  useEffect(() => {
    if (!playing) return;
    spawnedAt.current = performance.now();
    playerTaggedRef.current = false;
  }, [playing]);

  return (
    <>
      {bots.map((bot, index) => (
        <TagBot
          key={`bot-${index}`}
          bot={bot}
          playing={playing}
          roundOver={roundOver}
          role={role}
          playerPositionRef={playerPositionRef}
          spawnedAtRef={spawnedAt}
          playerTaggedRef={playerTaggedRef}
          onPlayerTagged={onPlayerTagged}
          onPreyTagged={onPreyTagged}
        />
      ))}
    </>
  );
}

type TagBotProps = {
  bot: TagBotState;
  playing: boolean;
  roundOver: boolean;
  role: BotRole;
  playerPositionRef: RefObject<Vector3>;
  spawnedAtRef: RefObject<number>;
  playerTaggedRef: RefObject<boolean>;
  onPlayerTagged: () => void;
  onPreyTagged: () => void;
};

/**
 * One hopping gorilla, either a red tagger or a brown runner.
 *
 * @param bot - Physics state for this bot.
 * @param playing - When false, the bot idles.
 * @param roundOver - When true, the bot stops tagging and moving.
 * @param role - Hunter chases the player; prey flees.
 * @param playerPositionRef - Live player feet position.
 * @param spawnedAtRef - Round start time for immunity.
 * @param playerTaggedRef - Shared flag so only one hunter tags the player.
 * @param onPlayerTagged - Fired when this hunter tags the player.
 * @param onPreyTagged - Fired when the player tags this prey bot.
 */
function TagBot({
  bot,
  playing,
  roundOver,
  role,
  playerPositionRef,
  spawnedAtRef,
  playerTaggedRef,
  onPlayerTagged,
  onPreyTagged,
}: TagBotProps) {
  const groupRef = useRef<Group>(null);
  const armRef = useRef<Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);
  const [caught, setCaught] = useState(false);

  const flee = role === "prey";
  const palette: GorillaPalette = role === "hunter" || caught ? BOT_PALETTE : PLAYER_PALETTE;

  useFrame((_, delta) => {
    const group = groupRef.current;
    const player = playerPositionRef.current;
    if (!group || !player) return;

    const canMove = playing && !roundOver && !bot.caught;
    if (canMove) {
      stepTagBot(bot, delta, player, flee);
    }

    group.position.copy(bot.position);
    group.rotation.y = bot.yaw;

    phase.current += delta * (canMove ? 10 : 2);
    if (armRef.current) {
      armRef.current.rotation.x = Math.sin(phase.current) * 0.85 + 0.35;
    }

    if (!playing || roundOver) return;

    const immune = performance.now() - spawnedAtRef.current < TAG_IMMUNITY_SECONDS * 1000;
    if (immune) return;

    const gap = bot.position.distanceTo(player);
    if (gap > TAG_RADIUS) return;

    if (role === "hunter") {
      if (playerTaggedRef.current) return;
      playerTaggedRef.current = true;
      onPlayerTagged();
      return;
    }

    if (bot.caught) return;
    bot.caught = true;
    setCaught(true);
    onPreyTagged();
  });

  return (
    <group ref={groupRef}>
      <GorillaAvatar palette={palette}>
        <group ref={armRef} position={[0.42, 1.05, 0.05]}>
          <mesh position={[0.08, -0.28, 0.12]} rotation={[0.2, 0, -0.2]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.72]} />
            <meshStandardMaterial color={palette.fur} roughness={0.88} />
          </mesh>
          <mesh position={[0.12, -0.62, 0.28]} castShadow>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color={palette.skin} roughness={0.65} />
          </mesh>
        </group>
      </GorillaAvatar>
      {palette === BOT_PALETTE && (
        <pointLight position={[0, 1.2, 0]} intensity={1.4} distance={4} color="#ff6644" />
      )}
    </group>
  );
}
