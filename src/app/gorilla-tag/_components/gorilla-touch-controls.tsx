"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { gorillaTouchState, resetGorillaTouch } from "~/app/gorilla-tag/_components/gorilla-touch";

/** Radians of camera yaw per pixel of horizontal drag on the look side. */
const LOOK_SENSITIVITY = 0.007;

type GorillaTouchControlsProps = {
  active: boolean;
};

/**
 * True on phones, tablets, and narrow windows where the split touch layout should show.
 */
export function useGorillaTouchLayout(): boolean {
  const [touchLayout, setTouchLayout] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 900px)");
    /**
     * Syncs the touch layout with the current media query.
     */
    const update = () => setTouchLayout(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return touchLayout;
}

/**
 * Maps a pointer inside a half-screen zone to normalized device coordinates.
 *
 * @param event - Pointer event whose current target is the zone.
 */
function pointerToNdc(event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  return {
    x: Math.min(1, Math.max(-1, x)),
    y: Math.min(1, Math.max(-1, y)),
  };
}

/**
 * Split-screen touch controls: left half holds the arm, right half turns the camera.
 *
 * @param active - When false, the overlay is hidden and touch state is cleared.
 */
export function GorillaTouchControls({ active }: GorillaTouchControlsProps) {
  const handDotRef = useRef<HTMLDivElement>(null);
  const lookPointerId = useRef<number | null>(null);
  const lastLookX = useRef(0);

  useEffect(() => {
    if (active) return;
    resetGorillaTouch();
  }, [active]);

  if (!active) return null;

  /**
   * Plants the fist aim at the finger inside the hand half.
   */
  const placeHand = (event: ReactPointerEvent<HTMLDivElement>) => {
    const ndc = pointerToNdc(event);
    gorillaTouchState.hasHand = true;
    gorillaTouchState.pointerX = ndc.x;
    gorillaTouchState.pointerY = ndc.y;

    const dot = handDotRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!dot) return;
    dot.style.opacity = "1";
    dot.style.transform = `translate(${event.clientX - rect.left - 18}px, ${event.clientY - rect.top - 18}px)`;
  };

  return (
    <div
      className="absolute inset-0 z-[12] touch-none select-none"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1/2 border-r border-white/20 bg-black/10"
        onPointerDown={(event) => {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Capture can fail for some pointer types; the move handler still aims.
          }
          placeHand(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          placeHand(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <div
          ref={handDotRef}
          className="pointer-events-none absolute top-0 left-0 h-9 w-9 rounded-full border-2 border-amber-200 bg-amber-300/40 opacity-0"
        />
        <p className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-white/80">
          HAND
        </p>
      </div>

      <div
        className="absolute inset-y-0 right-0 w-1/2 bg-black/5"
        onPointerDown={(event) => {
          lookPointerId.current = event.pointerId;
          lastLookX.current = event.clientX;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Capture can fail for some pointer types; the id still tracks the drag.
          }
        }}
        onPointerMove={(event) => {
          if (lookPointerId.current !== event.pointerId) return;
          const deltaX = event.clientX - lastLookX.current;
          lastLookX.current = event.clientX;
          gorillaTouchState.lookYaw += -deltaX * LOOK_SENSITIVITY;
        }}
        onPointerUp={(event) => {
          if (lookPointerId.current !== event.pointerId) return;
          lookPointerId.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          lookPointerId.current = null;
        }}
      >
        <p className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-white/80">
          LOOK
        </p>
      </div>
    </div>
  );
}
