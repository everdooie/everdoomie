"use client";

import { useCallback, useRef } from "react";

import { unlockJumpScareAudio } from "~/app/game/_components/death-jumpscare-audio";
import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import { useGameState } from "~/app/game/_components/game-state";
import { resetTouchInputState, touchInputState } from "~/app/game/_components/touch-input";

const JOYSTICK_RADIUS_PX = 56;
const LOOK_SENSITIVITY = 0.004;

/**
 * On-screen touch controls for Android mode: joystick, look zone, fire, and settings.
 */
export function MobileTouchControls() {
  const { settings, openSettings, isSettingsOpen } = useGameSettings();
  const { isLocked, isGameOver, isVictory } = useGameState();

  const joystickOriginRef = useRef<{ x: number; y: number } | null>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookRef = useRef<{ x: number; y: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const isAndroid = settings.platform === "android";
  const isActive = isAndroid && isLocked && !isGameOver && !isVictory && !isSettingsOpen;

  /**
   * Opens the pause/settings menu and clears touch input (same as Escape on desktop).
   */
  const handlePause = useCallback(() => {
    resetTouchInputState();
    openSettings();
  }, [openSettings]);

  /**
   * Updates the visual joystick knob position from normalized input.
   */
  const updateKnobVisual = useCallback((normX: number, normZ: number) => {
    if (!knobRef.current) return;
    knobRef.current.style.transform = `translate(${normX * JOYSTICK_RADIUS_PX}px, ${normZ * JOYSTICK_RADIUS_PX}px)`;
  }, []);

  /**
   * Maps a touch position within the joystick base to a normalized move vector.
   */
  const applyJoystickTouch = useCallback(
    (clientX: number, clientY: number) => {
      const origin = joystickOriginRef.current;
      if (!origin) return;

      const deltaX = clientX - origin.x;
      const deltaY = clientY - origin.y;
      const distance = Math.hypot(deltaX, deltaY);
      const clampedDistance = Math.min(distance, JOYSTICK_RADIUS_PX);
      const angle = Math.atan2(deltaY, deltaX);

      const normX =
        clampedDistance === 0 ? 0 : (Math.cos(angle) * clampedDistance) / JOYSTICK_RADIUS_PX;
      const normZ =
        clampedDistance === 0 ? 0 : (Math.sin(angle) * clampedDistance) / JOYSTICK_RADIUS_PX;

      touchInputState.move.x = normX;
      touchInputState.move.z = normZ;
      updateKnobVisual(normX, normZ);
    },
    [updateKnobVisual],
  );

  /**
   * Clears joystick input when the movement touch ends.
   */
  const resetJoystick = useCallback(() => {
    joystickTouchIdRef.current = null;
    joystickOriginRef.current = null;
    touchInputState.move.x = 0;
    touchInputState.move.z = 0;
    updateKnobVisual(0, 0);
  }, [updateKnobVisual]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] touch-none select-none">
      {/* Movement joystick — left side */}
      <div
        className="pointer-events-auto absolute bottom-8 left-6 h-36 w-36 touch-none"
        onTouchStart={(event) => {
          event.preventDefault();
          unlockJumpScareAudio();
          const touch = event.changedTouches[0];
          if (!touch) return;

          const rect = event.currentTarget.getBoundingClientRect();
          joystickOriginRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
          joystickTouchIdRef.current = touch.identifier;
          applyJoystickTouch(touch.clientX, touch.clientY);
        }}
        onTouchMove={(event) => {
          event.preventDefault();
          const touchId = joystickTouchIdRef.current;
          if (touchId === null) return;

          for (const touch of Array.from(event.changedTouches)) {
            if (touch.identifier === touchId) {
              applyJoystickTouch(touch.clientX, touch.clientY);
              break;
            }
          }
        }}
        onTouchEnd={(event) => {
          event.preventDefault();
          const touchId = joystickTouchIdRef.current;
          if (touchId === null) return;

          for (const touch of Array.from(event.changedTouches)) {
            if (touch.identifier === touchId) {
              resetJoystick();
              break;
            }
          }
        }}
        onTouchCancel={(event) => {
          event.preventDefault();
          resetJoystick();
        }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-red-900/50 bg-black/40" />
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/70 bg-red-950/70 shadow-lg shadow-red-950/50"
        />
      </div>

      {/* Look zone — right half of screen (above fire button) */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 left-[38%] touch-none"
        onTouchStart={(event) => {
          event.preventDefault();
          unlockJumpScareAudio();
          const touch = event.changedTouches[0];
          if (!touch) return;
          lookTouchIdRef.current = touch.identifier;
          lastLookRef.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchMove={(event) => {
          event.preventDefault();
          const touchId = lookTouchIdRef.current;
          if (touchId === null) return;

          for (const touch of Array.from(event.changedTouches)) {
            if (touch.identifier !== touchId) continue;
            const last = lastLookRef.current;
            if (!last) break;

            const deltaX = touch.clientX - last.x;
            const deltaY = touch.clientY - last.y;
            touchInputState.lookDeltaYaw -= deltaX * LOOK_SENSITIVITY;
            touchInputState.lookDeltaPitch -= deltaY * LOOK_SENSITIVITY;
            lastLookRef.current = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }}
        onTouchEnd={(event) => {
          event.preventDefault();
          const touchId = lookTouchIdRef.current;
          if (touchId === null) return;

          for (const touch of Array.from(event.changedTouches)) {
            if (touch.identifier === touchId) {
              lookTouchIdRef.current = null;
              lastLookRef.current = null;
              break;
            }
          }
        }}
        onTouchCancel={() => {
          lookTouchIdRef.current = null;
          lastLookRef.current = null;
        }}
      />

      {/* Fire button */}
      <button
        type="button"
        aria-label="Fire weapon"
        className="pointer-events-auto absolute right-6 bottom-8 flex h-20 w-20 min-h-12 min-w-12 items-center justify-center rounded-full border-2 border-red-500 bg-red-900/70 text-sm font-bold tracking-wider text-red-200 shadow-lg shadow-red-950/60 active:bg-red-700/80"
        onTouchStart={(event) => {
          event.preventDefault();
          unlockJumpScareAudio();
          touchInputState.fireHeld = true;
        }}
        onTouchEnd={(event) => {
          event.preventDefault();
          touchInputState.fireHeld = false;
        }}
        onTouchCancel={() => {
          touchInputState.fireHeld = false;
        }}
      >
        FIRE
      </button>

      {/* Pause — mobile has no Escape key */}
      <button
        type="button"
        aria-label="Pause game"
        className="pointer-events-auto absolute top-4 left-4 flex h-12 min-h-12 items-center justify-center rounded-full border-2 border-gray-600 bg-black/70 px-4 text-xs font-bold tracking-widest text-gray-200 shadow-lg active:bg-gray-900/80"
        onTouchStart={(event) => {
          event.preventDefault();
          handlePause();
        }}
      >
        PAUSE
      </button>

      {/* Settings gear — also opens pause menu */}
      <button
        type="button"
        aria-label="Open settings"
        className="pointer-events-auto absolute top-4 right-4 flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-gray-700 bg-black/60 text-lg text-gray-300"
        onTouchStart={(event) => {
          event.preventDefault();
          handlePause();
        }}
      >
        ⚙
      </button>
    </div>
  );
}
