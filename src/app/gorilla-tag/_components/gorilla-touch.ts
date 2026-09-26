/** Shared finger aim and camera drag read by the gorilla each frame. */
export const gorillaTouchState = {
  /** True after the hand side has been touched at least once this round. */
  hasHand: false,
  /** Normalized device coordinate X (-1 left, 1 right) inside the hand half. */
  pointerX: 0,
  /** Normalized device coordinate Y (-1 down, 1 up) inside the hand half. */
  pointerY: -0.4,
  /** Camera yaw to apply once, in radians. Consumed by the controller. */
  lookYaw: 0,
};

/**
 * Clears finger aim and pending camera drag between rounds.
 */
export function resetGorillaTouch(): void {
  gorillaTouchState.hasHand = false;
  gorillaTouchState.pointerX = 0;
  gorillaTouchState.pointerY = -0.4;
  gorillaTouchState.lookYaw = 0;
}

/**
 * Returns pending camera yaw from the look side and clears it.
 */
export function consumeGorillaLookYaw(): number {
  const yaw = gorillaTouchState.lookYaw;
  gorillaTouchState.lookYaw = 0;
  return yaw;
}
