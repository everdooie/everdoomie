"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";

import {
  unlockJumpScareAudio,
} from "~/app/game/_components/death-jumpscare-audio";
import { DemogorgonModel } from "~/app/game/_components/demogorgon-model";
import { useGameState } from "~/app/game/_components/game-state";

/** How long the full-screen scare overlay stays visible before the game-over UI. */
const SCARE_DURATION_MS = 2200;

/** Camera distance — pulled back so the full head reads on screen. */
const SCARE_CAMERA_POSITION: [number, number, number] = [0, 1.52, 2.15];
const SCARE_LOOK_AT: [number, number, number] = [0, 1.42, 0];
const SCARE_FOV = 52;
const SCARE_MODEL_SCALE = 1.35;
/** Vertical offset — shifts the Demogorgon down for better face framing. */
const SCARE_MODEL_Y_OFFSET = -0.38;

const DeathJumpScareContext = createContext(false);

/**
 * Positions the scare camera for a tight but readable Demogorgon head shot.
 */
function ScareFaceCamera() {
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.position.set(...SCARE_CAMERA_POSITION);
    camera.lookAt(...SCARE_LOOK_AT);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = SCARE_FOV;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  return null;
}

/**
 * Renders an oversized Demogorgon head inside a dedicated fullscreen canvas.
 */
function DemogorgonFaceScene() {
  return (
    <>
      <ScareFaceCamera />
      <color attach="background" args={["#050000"]} />
      <ambientLight intensity={0.12} />
      <pointLight position={[0.25, 1.85, 0.45]} intensity={7} color="#ff2a10" />
      <pointLight position={[-0.55, 1.35, 0.35]} intensity={3.5} color="#aa0a00" />
      <pointLight position={[0, 0.6, 0.8]} intensity={1.2} color="#330000" />
      <group position={[0, SCARE_MODEL_Y_OFFSET, 0]} scale={SCARE_MODEL_SCALE}>
        <DemogorgonModel healthRatio={1} emissiveMin={0.75} emissiveMax={1.35} />
      </group>
    </>
  );
}

/**
 * Tracks whether the death jump scare is currently playing for this run.
 *
 * Triggers once when `isGameOver` transitions to true (not on victory).
 *
 * @param isGameOver - Whether the player has died.
 * @param isVictory - Whether the player won; scares are skipped on victory.
 */
function useDeathJumpScareActive(isGameOver: boolean, isVictory: boolean): boolean {
  const [isActive, setIsActive] = useState(false);
  const wasGameOverRef = useRef(false);

  useEffect(() => {
    if (isGameOver && !isVictory && !wasGameOverRef.current) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      setIsActive(true);

      const timer = setTimeout(() => setIsActive(false), SCARE_DURATION_MS);
      wasGameOverRef.current = true;
      return () => clearTimeout(timer);
    }

    if (!isGameOver) {
      setIsActive(false);
      wasGameOverRef.current = false;
    } else {
      wasGameOverRef.current = isGameOver;
    }
  }, [isGameOver, isVictory]);

  return isActive;
}

/**
 * Full-screen visual layer for the death jump scare.
 */
function DeathJumpScareVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      <style>{`
        @keyframes death-scare-flash {
          0% { opacity: 1; background: rgba(255, 255, 255, 0.98); }
          12% { opacity: 1; background: rgba(180, 0, 0, 0.95); }
          28% { opacity: 0.85; background: rgba(40, 0, 0, 0.9); }
          100% { opacity: 0; background: rgba(0, 0, 0, 1); }
        }
        @keyframes death-scare-shake {
          0%, 100% { transform: translate(0, 0) scale(1); }
          20% { transform: translate(-8px, 5px) scale(1.02); }
          40% { transform: translate(10px, -6px) scale(1); }
          60% { transform: translate(-6px, -4px) scale(1.01); }
          80% { transform: translate(5px, 6px) scale(1); }
        }
        .death-scare-flash {
          animation: death-scare-flash 0.35s ease-out forwards;
        }
        .death-scare-face {
          animation: death-scare-shake 0.12s steps(2, end) infinite;
        }
      `}</style>

      <div className="death-scare-flash absolute inset-0" />

      <div className="absolute inset-0 bg-black">
        <div className="death-scare-face absolute inset-0">
          <Canvas
            gl={{ antialias: true }}
            dpr={[1, 2]}
            camera={{
              fov: SCARE_FOV,
              near: 0.05,
              far: 20,
              position: SCARE_CAMERA_POSITION,
            }}
          >
            <Suspense fallback={null}>
              <DemogorgonFaceScene />
            </Suspense>
          </Canvas>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
      <div className="absolute inset-0 mix-blend-multiply bg-red-950/40" />
    </div>
  );
}

/**
 * Provides death jump-scare state and renders the scare overlay once per death.
 *
 * Wrap game UI children inside {@link GameStateProvider} so death transitions are visible.
 */
export function DeathJumpScareProvider({ children }: { children: ReactNode }) {
  const { isGameOver, isVictory } = useGameState();
  const isActive = useDeathJumpScareActive(isGameOver, isVictory);

  useEffect(() => {
    /**
     * Unlocks scare audio on any gameplay click so death SFX is allowed by autoplay policy.
     */
    const onUserGesture = () => unlockJumpScareAudio();

    window.addEventListener("pointerdown", onUserGesture, { capture: true });
    window.addEventListener("keydown", onUserGesture, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onUserGesture, { capture: true });
      window.removeEventListener("keydown", onUserGesture, { capture: true });
    };
  }, []);

  return (
    <DeathJumpScareContext.Provider value={isActive}>
      {children}
      {isActive && <DeathJumpScareVisual />}
    </DeathJumpScareContext.Provider>
  );
}

/**
 * Returns whether the death jump scare is currently obscuring the game-over screen.
 */
export function useIsDeathJumpScareActive(): boolean {
  return useContext(DeathJumpScareContext);
}
