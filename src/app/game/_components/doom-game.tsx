"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";

import { DeathJumpScareProvider } from "~/app/game/_components/death-jumpscare";
import {
  DEATH_ROAR_AUDIO_ELEMENT_ID,
  DEATH_ROAR_AUDIO_SRC,
  JUMPSCARE_AUDIO_ELEMENT_ID,
  JUMPSCARE_AUDIO_SRC,
} from "~/app/game/_components/death-jumpscare-audio";
import { Enemies } from "~/app/game/_components/enemies";
import { GameSettingsProvider, useGameSettings } from "~/app/game/_components/game-settings-provider";
import { GameStateProvider } from "~/app/game/_components/game-state";
import { Hud } from "~/app/game/_components/hud";
import { Level } from "~/app/game/_components/level";
import { MobileTouchControls } from "~/app/game/_components/mobile-touch-controls";
import { Pickups } from "~/app/game/_components/pickups";
import { PlatformSelectScreen } from "~/app/game/_components/platform-select-screen";
import { Player } from "~/app/game/_components/player";
import { SettingsMenuOverlay } from "~/app/game/_components/settings-menu";
import { getMapDimensions } from "~/app/game/_components/map-data";

/**
 * Prevents page scroll and pinch-zoom while playing on touch devices.
 */
function usePreventTouchDefaults(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    /**
     * Blocks browser gestures that interfere with in-game touch controls.
     */
    const preventTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    document.addEventListener("touchmove", preventTouch, { passive: false });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.removeEventListener("touchmove", preventTouch);
    };
  }, [enabled]);
}

/**
 * Inner game shell wired to settings context and dynamic map restarts.
 */
function DoomGameContent() {
  const { levelMap, fog, cameraFar, mapRestartKey, settings, isPaused } = useGameSettings();
  const { width, depth } = getMapDimensions(levelMap);
  const isAndroid = settings.platform === "android";

  usePreventTouchDefaults(isAndroid);

  return (
    <GameStateProvider key={mapRestartKey} levelMap={levelMap}>
      <DeathJumpScareProvider>
        <div className="relative h-screen w-screen touch-none overflow-hidden bg-black">
          {/* Preload scare audio in DOM so first click unlocks ready elements. */}
          <audio
            id={JUMPSCARE_AUDIO_ELEMENT_ID}
            src={JUMPSCARE_AUDIO_SRC}
            preload="auto"
            className="hidden"
            aria-hidden={true}
          />
          <audio
            id={DEATH_ROAR_AUDIO_ELEMENT_ID}
            src={DEATH_ROAR_AUDIO_SRC}
            preload="auto"
            className="hidden"
            aria-hidden={true}
          />
          <Canvas
            shadows
            frameloop={isPaused ? "never" : "always"}
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
          <MobileTouchControls />
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
 * Routes between platform selection and the active game session.
 */
function DoomGameRouter() {
  const { hasSelectedPlatform, selectPlatform } = useGameSettings();

  if (!hasSelectedPlatform) {
    return <PlatformSelectScreen onSelect={selectPlatform} />;
  }

  return <DoomGameContent />;
}

/**
 * Full-screen Doom clone experience with 3D scene and HUD overlay.
 */
export function DoomGame() {
  return (
    <GameSettingsProvider>
      <DoomGameRouter />
    </GameSettingsProvider>
  );
}
