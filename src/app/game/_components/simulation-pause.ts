/**
 * Synchronous pause flag for game simulation loops.
 *
 * React state updates are async; useFrame runs every animation frame and may
 * observe stale `isPaused` for a frame or two after Escape opens settings.
 * This ref is flipped immediately in {@link setSimulationPaused}.
 */
export const simulationPausedRef = { current: false };

/**
 * Sets whether gameplay simulation should run.
 *
 * Call with `true` when opening settings and `false` when resuming.
 */
export function setSimulationPaused(paused: boolean): void {
  simulationPausedRef.current = paused;
}

/**
 * Returns whether gameplay simulation is currently frozen.
 */
export function isSimulationPaused(): boolean {
  return simulationPausedRef.current;
}
