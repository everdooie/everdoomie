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
 * Prevents page scroll, pinch-zoom, and iOS Safari gesture defaults while
 * playing with on-screen touch controls.
 *
 * @param enabled - When true, installs document-level touch/gesture guards.
 */
function usePreventTouchDefaults(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    /**
     * Blocks multi-touch browser gestures that interfere with in-game controls.
     */
    const preventTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    /**
     * Blocks Safari's pinch-zoom / gesture pipeline (iOS-specific event).
     */
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    document.addEventListener("touchmove", preventTouch, { passive: false });
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.removeEventListener("touchmove", preventTouch);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, [enabled]);
}

/**
 * Inner game shell wired to settings context and dynamic map restarts.
 */
function DoomGameContent() {
  const { levelMap, fog, cameraFar, mapRestartKey, settings, isPaused } = useGameSettings();
  const { width, depth } = getMapDimensions(levelMap);
  const isMobile = settings.platform === "mobile";

  usePreventTouchDefaults(isMobile);

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
