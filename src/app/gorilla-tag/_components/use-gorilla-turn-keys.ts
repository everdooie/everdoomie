import { useEffect, useRef, type RefObject } from "react";

export type GorillaTurnKeys = {
  left: boolean;
  right: boolean;
};

/**
 * Returns true when a keyboard event should orbit the camera left.
 *
 * @param event - Keydown or keyup from the window.
 */
function isTurnLeft(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (
    event.code === "KeyA" ||
    event.code === "ArrowLeft" ||
    event.code === "KeyQ" ||
    key === "a" ||
    key === "arrowleft" ||
    key === "q"
  );
}

/**
 * Returns true when a keyboard event should orbit the camera right.
 *
 * @param event - Keydown or keyup from the window.
 */
function isTurnRight(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (
    event.code === "KeyD" ||
    event.code === "ArrowRight" ||
    event.code === "KeyE" ||
    key === "d" ||
    key === "arrowright" ||
    key === "e"
  );
}

/**
 * Tracks A/D (and arrow / Q/E) turn keys on the document, outside the canvas.
 *
 * @returns A ref the gorilla controller reads each frame.
 */
export function useGorillaTurnKeys(): RefObject<GorillaTurnKeys> {
  const keysRef = useRef<GorillaTurnKeys>({ left: false, right: false });

  useEffect(() => {
    /**
     * Marks a turn key as held.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (isTurnLeft(event)) {
        event.preventDefault();
        keysRef.current.left = true;
      }
      if (isTurnRight(event)) {
        event.preventDefault();
        keysRef.current.right = true;
      }
    };

    /**
     * Clears a turn key when released.
     */
    const onKeyUp = (event: KeyboardEvent) => {
      if (isTurnLeft(event)) keysRef.current.left = false;
      if (isTurnRight(event)) keysRef.current.right = false;
    };

    /**
     * Drops held keys if the tab loses focus so the gorilla does not spin forever.
     */
    const onBlur = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keysRef;
}
