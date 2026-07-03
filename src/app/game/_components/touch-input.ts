/** Normalized movement vector from the virtual joystick (-1..1 on each axis). */
export type TouchMoveVector = {
  x: number;
  z: number;
};

/** Mutable touch input state shared between mobile HUD and the player controller. */
export type TouchInputState = {
  move: TouchMoveVector;
  lookDeltaYaw: number;
  lookDeltaPitch: number;
  fireHeld: boolean;
};

/** Shared touch input consumed each frame by {@link Player} in Android mode. */
export const touchInputState: TouchInputState = {
  move: { x: 0, z: 0 },
  lookDeltaYaw: 0,
  lookDeltaPitch: 0,
  fireHeld: false,
};

/**
 * Resets all touch input fields to neutral values.
 */
export function resetTouchInputState(): void {
  touchInputState.move.x = 0;
  touchInputState.move.z = 0;
  touchInputState.lookDeltaYaw = 0;
  touchInputState.lookDeltaPitch = 0;
  touchInputState.fireHeld = false;
}

/**
 * Drains and returns accumulated look deltas for the current frame.
 */
export function consumeTouchLookDelta(): { yaw: number; pitch: number } {
  const yaw = touchInputState.lookDeltaYaw;
  const pitch = touchInputState.lookDeltaPitch;
  touchInputState.lookDeltaYaw = 0;
  touchInputState.lookDeltaPitch = 0;
  return { yaw, pitch };
}
