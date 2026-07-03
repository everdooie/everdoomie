"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import { DeathJumpScareProvider } from "~/app/game/_components/death-jumpscare";
import { Enemies } from "~/app/game/_components/enemies";
import { GameSettingsProvider, useGameSettings } from "~/app/game/_components/game-settings-provider";
import { GameStateProvider } from "~/app/game/_components/game-state";
import { Hud } from "~/app/game/_components/hud";
import { Level } from "~/app/game/_components/level";
import { Pickups } from "~/app/game/_components/pickups";
import { Player } from "~/app/game/_components/player";
import { SettingsMenuOverlay } from "~/app/game/_components/settings-menu";
import { getMapDimensions } from "~/app/game/_components/map-data";

/**
 * Inner game shell wired to settings context and dynamic map restarts.
 */
function DoomGameContent() {
  const { levelMap, fog, cameraFar, mapRestartKey } = useGameSettings();
  const { width, depth } = getMapDimensions(levelMap);

  return (
    <GameStateProvider key={mapRestartKey} levelMap={levelMap}>
      <DeathJumpScareProvider>
        <div className="relative h-screen w-screen overflow-hidden bg-black">
          <Canvas
            shadows
            camera={{ fov: 75, near: 0.1, far: cameraFar, position: [0, 1.6, 0] }}
            gl={{ antialias: true }}
          >
            <color attach="background" args={["#0a0604"]} />
            <fog attach="fog" args={["#0a0604", fog.near, fog.far]} />

            <Suspense fallback={null}>
              <Level />
              <Pickups />
              <Enemies />
              <Player />
            </Suspense>
          </Canvas>

          <Hud />
          <SettingsMenuOverlay />

          <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-xs text-gray-600">
            Map {width}x{depth}
          </div>
        </div>
      </DeathJumpScareProvider>
    </GameStateProvider>
  );
}

/**
 * Full-screen Doom clone experience with 3D scene and HUD overlay.
 */
export function DoomGame() {
  return (
    <GameSettingsProvider>
      <DoomGameContent />
    </GameSettingsProvider>
  );
}
