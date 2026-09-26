"use client";

import {
  GORILLA_MODE_OPTIONS,
  type GorillaMode,
} from "~/app/gorilla-tag/_components/gorilla-modes";

type ModeSelectProps = {
  onSelect: (mode: GorillaMode) => void;
};

/**
 * Full-screen mode picker shown before a round starts.
 *
 * @param onSelect - Starts a round in the chosen mode.
 */
export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/45 px-4 text-white">
      <h1 className="mb-3 text-5xl font-black tracking-widest text-amber-300">GORILLA TAG</h1>
      <p className="mb-8 text-lg text-white/90">Move your mouse. Slam the ground. Go up.</p>
      <div className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row">
        {GORILLA_MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className="flex-1 rounded-2xl border-2 border-amber-400/70 bg-black/40 px-5 py-6 text-left transition hover:border-amber-300 hover:bg-amber-500/15"
          >
            <span className="mb-2 block text-2xl font-black tracking-widest text-amber-300">
              {option.title}
            </span>
            <span className="text-sm text-white/85">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
