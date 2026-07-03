"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  computeCameraFar,
  computeFog,
  computeLighting,
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type ComputedFog,
  type ComputedLighting,
  type GameSettings,
  type MapSize,
  type Platform,
} from "~/app/game/_components/game-settings";
import { getLevelMap } from "~/app/game/_components/map-data";

type GameSettingsContextValue = {
  settings: GameSettings;
  lighting: ComputedLighting;
  fog: ComputedFog;
  cameraFar: number;
  levelMap: number[][];
  isSettingsOpen: boolean;
  isPaused: boolean;
  mapSizeDirty: boolean;
  updateSettings: (partial: Partial<GameSettings>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  resumeGame: () => void;
  requestMapRestart: () => void;
  mapRestartKey: number;
  hasSelectedPlatform: boolean;
  selectPlatform: (platform: Platform) => void;
};

const GameSettingsContext = createContext<GameSettingsContextValue | null>(null);

type GameSettingsProviderProps = {
  children: ReactNode;
};

/**
 * Provides persisted game settings, pause state, and Escape-key settings menu.
 */
export function GameSettingsProvider({ children }: GameSettingsProviderProps) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mapRestartKey, setMapRestartKey] = useState(0);
  const [sessionMapSize, setSessionMapSize] = useState<MapSize>("medium");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadGameSettings();
    setSettings(loaded);
    setSessionMapSize(loaded.mapSize);
    setHydrated(true);
  }, []);

  const levelMap = useMemo(() => getLevelMap(settings.mapSize), [settings.mapSize]);
  const lighting = useMemo(() => computeLighting(settings), [settings]);
  const fog = useMemo(() => computeFog(settings), [settings]);
  const cameraFar = useMemo(() => computeCameraFar(settings.mapSize), [settings.mapSize]);
  const mapSizeDirty = settings.mapSize !== sessionMapSize;
  const hasSelectedPlatform = settings.platform !== undefined;

  /**
   * Merges partial setting changes and persists them to localStorage.
   */
  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.platform === "android" && document.pointerLockElement) {
        document.exitPointerLock();
      }
      saveGameSettings(next);
      return next;
    });
  }, []);

  /**
   * Persists the chosen control platform and saves settings.
   */
  const selectPlatform = useCallback((platform: Platform) => {
    setSettings((prev) => {
      const next = { ...prev, platform };
      saveGameSettings(next);
      return next;
    });
  }, []);

  /**
   * Opens the settings overlay and releases pointer lock.
   */
  const openSettings = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setIsSettingsOpen(true);
  }, []);

  /**
   * Closes the settings overlay without restarting the map.
   */
  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  /**
   * Closes settings and restarts the run if the map size changed.
   */
  const resumeGame = useCallback(() => {
    if (mapSizeDirty) {
      setSessionMapSize(settings.mapSize);
      setMapRestartKey((key) => key + 1);
    }
    setIsSettingsOpen(false);
  }, [mapSizeDirty, settings.mapSize]);

  /**
   * Forces a map restart after changing map size from settings.
   */
  const requestMapRestart = useCallback(() => {
    setSessionMapSize(settings.mapSize);
    setMapRestartKey((key) => key + 1);
    setIsSettingsOpen(false);
  }, [settings.mapSize]);

  useEffect(() => {
    if (!hydrated) return;

    /**
     * Toggles the settings menu when Escape is pressed during gameplay.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return;
      event.preventDefault();

      if (isSettingsOpen) {
        resumeGame();
      } else {
        openSettings();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hydrated, isSettingsOpen, openSettings, resumeGame]);

  const value = useMemo(
    () => ({
      settings,
      lighting,
      fog,
      cameraFar,
      levelMap,
      isSettingsOpen,
      isPaused: isSettingsOpen,
      mapSizeDirty,
      updateSettings,
      openSettings,
      closeSettings,
      resumeGame,
      requestMapRestart,
      mapRestartKey,
      hasSelectedPlatform,
      selectPlatform,
    }),
    [
      settings,
      lighting,
      fog,
      cameraFar,
      levelMap,
      isSettingsOpen,
      mapSizeDirty,
      updateSettings,
      openSettings,
      closeSettings,
      resumeGame,
      requestMapRestart,
      mapRestartKey,
      hasSelectedPlatform,
      selectPlatform,
    ],
  );

  if (!hydrated) return null;

  return (
    <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>
  );
}

/**
 * Reads persisted game settings and pause/menu state.
 *
 * @throws When used outside of {@link GameSettingsProvider}.
 */
export function useGameSettings(): GameSettingsContextValue {
  const context = useContext(GameSettingsContext);
  if (!context) {
    throw new Error("useGameSettings must be used within GameSettingsProvider");
  }
  return context;
}
