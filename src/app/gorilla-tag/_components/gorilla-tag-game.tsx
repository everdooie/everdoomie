"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { Arena } from "~/app/gorilla-tag/_components/arena";
import { BOT_PALETTE, PLAYER_PALETTE } from "~/app/gorilla-tag/_components/gorilla-avatar";
import { GorillaController } from "~/app/gorilla-tag/_components/gorilla-controller";
import {
  getGorillaModeOption,
  type GorillaMode,
} from "~/app/gorilla-tag/_components/gorilla-modes";
import { ModeSelect } from "~/app/gorilla-tag/_components/mode-select";
import { BOT_COUNT, TagBots } from "~/app/gorilla-tag/_components/tag-bots";
import { useGorillaTurnKeys } from "~/app/gorilla-tag/_components/use-gorilla-turn-keys";

/**
 * Formats a survival or hunt time for the HUD.
 *
 * @param ms - Elapsed milliseconds.
 */
function formatSurviveMs(ms: number): string {
  const seconds = Math.max(0, ms / 1000);
  return `${seconds.toFixed(1)}s`;
}

/**
 * Full-screen gorilla-tag playground with roam, tag, and tagger modes.
 */
export function GorillaTagGame() {
  const [mode, setMode] = useState<GorillaMode>("tag");
  const [playing, setPlaying] = useState(false);
  const [tagged, setTagged] = useState(false);
  const [won, setWon] = useState(false);
  const [caught, setCaught] = useState(0);
  const [runId, setRunId] = useState(0);
  const [now, setNow] = useState(0);
  const startedAt = useRef(0);
  const survivedMs = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const playerPositionRef = useRef(new THREE.Vector3());
  const turnKeysRef = useGorillaTurnKeys();
  const roundOver = tagged || won;
  const option = getGorillaModeOption(mode);

  /**
   * Starts or restarts a round in the given mode.
   *
   * @param nextMode - Mode to play.
   */
  const start = (nextMode: GorillaMode) => {
    setMode(nextMode);
    setRunId((id) => id + 1);
    setTagged(false);
    setWon(false);
    setCaught(0);
    survivedMs.current = 0;
    startedAt.current = performance.now();
    setNow(startedAt.current);
    setPlaying(true);
  };

  /**
   * Remounts the player and bots in the current mode.
   */
  const playAgain = () => {
    start(mode);
  };

  /**
   * Returns to the mode picker without starting a round.
   */
  const backToModes = () => {
    setPlaying(false);
    setTagged(false);
    setWon(false);
    setCaught(0);
  };

  /**
   * Freezes a tag round when a tagger touches the player.
   */
  const onPlayerTagged = () => {
    survivedMs.current = performance.now() - startedAt.current;
    setTagged(true);
  };

  /**
   * Counts a tagger-mode catch and wins when every runner is tagged.
   */
  const onPreyTagged = () => {
    setCaught((count) => {
      const next = count + 1;
      if (next >= BOT_COUNT) {
        survivedMs.current = performance.now() - startedAt.current;
        setWon(true);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!playing) return;
    shellRef.current?.focus();
  }, [playing, runId]);

  useEffect(() => {
    if (!playing || roundOver) return;
    const interval = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(interval);
  }, [playing, roundOver]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return;
      backToModes();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const liveMs = roundOver ? survivedMs.current : Math.max(0, now - startedAt.current);
  const playerPalette = mode === "tagger" ? BOT_PALETTE : PLAYER_PALETTE;

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      className="relative h-screen w-screen overflow-hidden bg-sky-300 outline-none"
    >
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 2.2, 5.2] }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#87c4f0"]} />
        <fog attach="fog" args={["#87c4f0", 28, 70]} />
        <Arena />
        <GorillaController
          key={`player-${runId}`}
          playing={playing}
          tagged={roundOver}
          palette={playerPalette}
          turnKeysRef={turnKeysRef}
          playerPositionRef={playerPositionRef}
        />
        {mode !== "roam" && (
          <TagBots
            key={`bots-${runId}`}
            playing={playing}
            roundOver={roundOver}
            role={mode === "tagger" ? "prey" : "hunter"}
            playerPositionRef={playerPositionRef}
            onPlayerTagged={onPlayerTagged}
            onPreyTagged={onPreyTagged}
          />
        )}
      </Canvas>

      {!playing && <ModeSelect onSelect={start} />}

      {playing && !roundOver && (
        <>
          <div className="pointer-events-none absolute top-5 left-1/2 z-10 -translate-x-1/2 font-mono text-white">
            <p className="rounded bg-black/50 px-4 py-2 text-center">
              <span className="text-amber-300">{option.title}</span>{" "}
              {mode === "roam" ? (
                <span className="text-lg font-bold">free play</span>
              ) : mode === "tagger" ? (
                <span className="text-2xl font-bold">
                  {caught}/{BOT_COUNT}
                </span>
              ) : (
                <span className="text-2xl font-bold">{formatSurviveMs(liveMs)}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={backToModes}
            className="absolute top-5 right-5 z-10 rounded-full border border-white/40 bg-black/50 px-4 py-2 font-mono text-sm text-white/90 hover:bg-black/70"
          >
            MODES
          </button>
          <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-center font-mono text-sm text-white/90">
            <p className="rounded bg-black/40 px-4 py-2">{option.hint}</p>
          </div>
        </>
      )}

      {tagged && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-950/70 text-white">
          <h2 className="mb-2 text-6xl font-black tracking-widest text-red-400">TAGGED</h2>
          <p className="mb-8 font-mono text-lg text-white/90">
            You lasted {formatSurviveMs(survivedMs.current)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={playAgain}
              className="rounded-full border-2 border-amber-400 bg-amber-500/20 px-8 py-3 text-lg font-bold tracking-wide text-amber-200"
            >
              PLAY AGAIN
            </button>
            <button
              type="button"
              onClick={backToModes}
              className="rounded-full border-2 border-white/40 bg-white/10 px-8 py-3 text-lg font-bold tracking-wide text-white"
            >
              MODES
            </button>
          </div>
        </div>
      )}

      {won && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-amber-950/70 text-white">
          <h2 className="mb-2 text-6xl font-black tracking-widest text-amber-300">ALL TAGGED</h2>
          <p className="mb-8 font-mono text-lg text-white/90">
            Hunt finished in {formatSurviveMs(survivedMs.current)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={playAgain}
              className="rounded-full border-2 border-amber-400 bg-amber-500/20 px-8 py-3 text-lg font-bold tracking-wide text-amber-200"
            >
              PLAY AGAIN
            </button>
            <button
              type="button"
              onClick={backToModes}
              className="rounded-full border-2 border-white/40 bg-white/10 px-8 py-3 text-lg font-bold tracking-wide text-white"
            >
              MODES
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
