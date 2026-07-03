"use client";

import { getPlatformLabel, type Platform } from "~/app/game/_components/game-settings";

type PlatformSelectScreenProps = {
  onSelect: (platform: Platform) => void;
};

type PlatformOptionProps = {
  platform: Platform;
  title: string;
  description: string;
  onSelect: (platform: Platform) => void;
};

/**
 * Renders a single platform choice card on the entry screen.
 */
function PlatformOption({ platform, title, description, onSelect }: PlatformOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(platform)}
      className="group flex min-h-[120px] flex-col items-start rounded border border-red-900/50 bg-black/50 px-5 py-4 text-left transition hover:border-red-500 hover:bg-red-950/40"
    >
      <span className="mb-1 text-lg font-bold tracking-wider text-red-400 group-hover:text-red-300">
        {title}
      </span>
      <span className="text-sm text-gray-400">{description}</span>
      <span className="mt-3 text-[10px] tracking-widest text-gray-600 uppercase">
        {getPlatformLabel(platform)}
      </span>
    </button>
  );
}

/**
 * Full-screen platform picker shown before the first gameplay session.
 */
export function PlatformSelectScreen({ onSelect }: PlatformSelectScreenProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black font-mono text-white">
      <div className="w-full max-w-lg px-6">
        <h1 className="mb-2 text-center text-4xl font-bold tracking-widest text-red-500">
          EVERDOOM
        </h1>
        <p className="mb-8 text-center text-sm text-gray-400">
          Choose your control scheme. You can change this later in settings.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlatformOption
            platform="computer"
            title="Computer"
            description="WASD movement, mouse look, click to shoot, pointer lock."
            onSelect={onSelect}
          />
          <PlatformOption
            platform="android"
            title="Android"
            description="Touch joystick, drag to look, on-screen fire button."
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
