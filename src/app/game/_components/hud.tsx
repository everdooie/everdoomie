"use client";

import { useEffect, useState } from "react";

import { useIsDeathJumpScareActive } from "~/app/game/_components/death-jumpscare";
import { unlockJumpScareAudio } from "~/app/game/_components/death-jumpscare-audio";
import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import { useGameState } from "~/app/game/_components/game-state";
import { getEffectSecondsRemaining } from "~/app/game/_components/status-effects";
import { TOTAL_WAVES } from "~/app/game/_components/wave-data";

/**
 * HTML overlay showing health, ammo, wave progress, active effects, and status messages.
 */
export function Hud() {
  const {
    health,
    ammo,
    kills,
    enemies,
    activeEffects,
    combatStats,
    currentWave,
    wavePhase,
    waveMessage,
    pickupMessage,
    isLocked,
    isGameOver,
    isVictory,
    restart,
    setIsLocked,
  } = useGameState();
  const { isSettingsOpen, settings } = useGameSettings();
  const isDeathScareActive = useIsDeathJumpScareActive();
  const isAndroid = settings.platform === "android";

  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!isLocked || activeEffects.length === 0 || isSettingsOpen) return;

    const interval = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(interval);
  }, [activeEffects.length, isLocked, isSettingsOpen]);

  /**
   * Starts Android gameplay without pointer lock.
   */
  const handleAndroidStart = () => {
    unlockJumpScareAudio();
    setIsLocked(true);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono text-white select-none">
      {!isLocked && !isGameOver && !isVictory && !isSettingsOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <h1 className="mb-2 text-4xl font-bold tracking-widest text-red-500">
              EVERDOOM
            </h1>
            <p className="mb-6 text-lg text-gray-300">
              Survive {TOTAL_WAVES} waves of demons
            </p>

            {isAndroid ? (
              <>
                <button
                  type="button"
                  onClick={handleAndroidStart}
                  className="mb-6 rounded border-2 border-red-600 bg-red-900/50 px-8 py-3 text-lg font-bold tracking-wider text-red-300 transition hover:bg-red-800/70"
                >
                  TAP TO START
                </button>
                <div className="space-y-1 text-sm text-gray-400">
                  <p>Left joystick — Move</p>
                  <p>Right side — Drag to look</p>
                  <p>FIRE button — Shoot</p>
                  <p>PAUSE — Pause &amp; settings</p>
                </div>
              </>
            ) : (
              <div className="space-y-1 text-sm text-gray-400">
                <p>Click the screen to begin</p>
                <p>WASD — Move</p>
                <p>Mouse — Look</p>
                <p>Click — Shoot</p>
                <p>Escape — Settings</p>
                <p>Collect orbs for powerful buffs — avoid cursed ones</p>
                <p>Run dry on ammo and an emergency crate will drop</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isLocked && !isSettingsOpen && (
        <>
          <div className="absolute top-4 left-4 space-y-1 text-sm">
            <p className="text-orange-400">
              WAVE{" "}
              <span className="text-xl font-bold text-white">
                {currentWave}/{TOTAL_WAVES}
              </span>
            </p>
            <p className="text-red-400">
              HEALTH{" "}
              <span className="text-xl font-bold text-white">{health}</span>
            </p>
            <p className={`${ammo === 0 ? "animate-pulse text-red-400" : "text-yellow-400"}`}>
              AMMO{" "}
              <span className="text-xl font-bold text-white">{ammo}</span>
            </p>
            <p className="text-green-400">
              KILLS{" "}
              <span className="text-xl font-bold text-white">{kills}</span>
            </p>
            <p className="text-gray-400">
              ENEMIES{" "}
              <span className="font-bold text-white">{enemies.length}</span>
            </p>
            <p className="text-cyan-300">
              DAMAGE{" "}
              <span className="font-bold text-white">{combatStats.shotDamage}</span>
              <span className="ml-2 text-xs text-gray-400">
                ({Math.round(1000 / combatStats.fireCooldownMs)} rds/s)
              </span>
            </p>
          </div>

          {activeEffects.length > 0 && (
            <div className={`absolute top-4 min-w-48 space-y-1.5 text-xs ${isAndroid ? "right-20" : "right-4"}`}>
              <p className="text-[10px] tracking-widest text-gray-500 uppercase">
                Active Effects
              </p>
              {activeEffects.map((effect) => (
                <div
                  key={effect.id}
                  className={`flex items-center justify-between rounded border px-2 py-1 ${
                    effect.kind === "buff"
                      ? "border-green-500/40 bg-green-950/50 text-green-200"
                      : "border-purple-500/40 bg-purple-950/50 text-purple-200"
                  }`}
                >
                  <span>
                    {effect.icon} {effect.label}
                  </span>
                  <span className="font-bold tabular-nums">
                    {getEffectSecondsRemaining(effect.expiresAt, now)}s
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isAndroid && (
            <div className="absolute right-4 bottom-4 max-w-xs text-right text-[10px] text-gray-500">
              <p className="text-green-500">Green/cyan — buffs & heals</p>
              <p className="text-purple-400">Purple/gray — curses & jams</p>
              <p className="text-yellow-400">Gold crate — emergency ammo</p>
              <p className="mt-2 text-gray-600">Esc — settings</p>
            </div>
          )}

          {waveMessage && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
              <p
                className={`text-lg font-bold tracking-widest ${
                  wavePhase === "intermission" ? "text-yellow-300" : "text-orange-300"
                }`}
              >
                {waveMessage}
              </p>
            </div>
          )}

          {pickupMessage && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
              <p className="rounded border border-white/20 bg-black/70 px-5 py-2 text-sm font-bold text-white shadow-lg">
                {pickupMessage}
              </p>
            </div>
          )}

          {ammo === 0 && (
            <div className={`absolute left-1/2 -translate-x-1/2 text-center ${isAndroid ? "bottom-36" : "bottom-24"}`}>
              <p className="animate-pulse text-sm font-bold tracking-wider text-yellow-300">
                OUT OF AMMO — FIND THE GOLD CRATE
              </p>
            </div>
          )}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative h-4 w-4">
              <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-red-500/80" />
              <div className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-red-500/80" />
            </div>
          </div>
        </>
      )}

      {(isGameOver || isVictory) && !isDeathScareActive && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <h2
              className={`mb-4 text-5xl font-bold ${isVictory ? "text-green-500" : "text-red-600"}`}
            >
              {isVictory ? "VICTORY!" : "YOU DIED"}
            </h2>
            <p className="mb-6 text-gray-300">
              {isVictory
                ? `All ${TOTAL_WAVES} waves cleared. Kills: ${kills}`
                : `You fell on wave ${currentWave}. Kills: ${kills}`}
            </p>
            <button
              type="button"
              onClick={restart}
              className="rounded border-2 border-red-600 bg-red-900/50 px-6 py-2 font-bold tracking-wider text-red-300 transition hover:bg-red-800/70"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
