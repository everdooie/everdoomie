"use client";

import {
  getMapSizeLabel,
  type GameSettings,
  type MapSize,
} from "~/app/game/_components/game-settings";
import { useGameSettings } from "~/app/game/_components/game-settings-provider";

type SettingsSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

/**
 * Renders a labeled range slider for a numeric setting.
 */
function SettingsSlider({ label, value, onChange }: SettingsSliderProps) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className="font-bold text-orange-300 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0.5}
        max={1.5}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-red-500"
      />
    </label>
  );
}

type SettingsMenuProps = {
  settings: GameSettings;
  mapSizeDirty: boolean;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onResume: () => void;
  onApplyMap: () => void;
};

/**
 * Pause/settings overlay toggled with Escape during gameplay.
 */
export function SettingsMenu({
  settings,
  mapSizeDirty,
  onUpdate,
  onResume,
  onApplyMap,
}: SettingsMenuProps) {
  const mapSizes: MapSize[] = ["small", "medium", "large"];

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded border border-red-900/60 bg-[#120a08]/95 p-6 shadow-2xl shadow-red-950/40">
        <h2 className="mb-1 text-2xl font-bold tracking-widest text-red-500">SETTINGS</h2>
        <p className="mb-6 text-xs text-gray-500">Escape to resume · Changes save automatically</p>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs tracking-wider text-gray-400 uppercase">Map Size</p>
            <div className="grid grid-cols-3 gap-2">
              {mapSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdate({ mapSize: size })}
                  className={`rounded border px-2 py-2 text-xs font-bold transition ${
                    settings.mapSize === size
                      ? "border-red-500 bg-red-950/60 text-red-200"
                      : "border-gray-700 bg-black/40 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {getMapSizeLabel(size)}
                </button>
              ))}
            </div>
            {mapSizeDirty && (
              <p className="mt-2 text-xs text-yellow-400">
                Map size changed — apply restart to load the new maze.
              </p>
            )}
          </div>

          <SettingsSlider
            label="Master Brightness"
            value={settings.masterBrightness}
            onChange={(value) => onUpdate({ masterBrightness: value })}
          />
          <SettingsSlider
            label="Ambient Light"
            value={settings.ambientBrightness}
            onChange={(value) => onUpdate({ ambientBrightness: value })}
          />
          <SettingsSlider
            label="Wall Torches"
            value={settings.torchBrightness}
            onChange={(value) => onUpdate({ torchBrightness: value })}
          />
          <SettingsSlider
            label="Enemy Glow"
            value={settings.enemyGlow}
            onChange={(value) => onUpdate({ enemyGlow: value })}
          />
          <SettingsSlider
            label="Fog Distance"
            value={settings.fogDistance}
            onChange={(value) => onUpdate({ fogDistance: value })}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 rounded border border-gray-600 bg-black/50 px-4 py-2 text-sm font-bold tracking-wider text-gray-200 transition hover:bg-gray-900"
          >
            RESUME
          </button>
          {mapSizeDirty && (
            <button
              type="button"
              onClick={onApplyMap}
              className="flex-1 rounded border border-red-600 bg-red-900/50 px-4 py-2 text-sm font-bold tracking-wider text-red-200 transition hover:bg-red-800/60"
            >
              APPLY MAP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Settings overlay wired to the game settings context.
 */
export function SettingsMenuOverlay() {
  const {
    settings,
    isSettingsOpen,
    mapSizeDirty,
    updateSettings,
    resumeGame,
    requestMapRestart,
  } = useGameSettings();

  if (!isSettingsOpen) return null;

  return (
    <SettingsMenu
      settings={settings}
      mapSizeDirty={mapSizeDirty}
      onUpdate={updateSettings}
      onResume={resumeGame}
      onApplyMap={requestMapRestart}
    />
  );
}
