import { z } from "zod";

/** localStorage key for persisted game settings. */
export const GAME_SETTINGS_STORAGE_KEY = "everdoomie-game-settings";

export const mapSizeSchema = z.enum(["small", "medium", "large"]);

export type MapSize = z.infer<typeof mapSizeSchema>;

export const platformSchema = z.enum(["computer", "mobile"]);

export type Platform = z.infer<typeof platformSchema>;

export const gameSettingsSchema = z.object({
  mapSize: mapSizeSchema,
  masterBrightness: z.number().min(0.5).max(1.5),
  ambientBrightness: z.number().min(0.5).max(1.5),
  torchBrightness: z.number().min(0.5).max(1.5),
  enemyGlow: z.number().min(0.5).max(1.5),
  fogDistance: z.number().min(0.5).max(1.5),
  platform: platformSchema.optional(),
});

/**
 * Migrates legacy persisted platform ids (e.g. `"android"` → `"mobile"`).
 *
 * @param raw - Parsed localStorage JSON before schema validation.
 */
export function migratePersistedSettings(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return raw;
  }

  const record = { ...(raw as Record<string, unknown>) };
  if (record.platform === "android") {
    record.platform = "mobile";
  }
  return record;
}

export type GameSettings = z.infer<typeof gameSettingsSchema>;

/** Default settings used on first launch. */
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  mapSize: "medium",
  masterBrightness: 1,
  ambientBrightness: 1,
  torchBrightness: 1,
  enemyGlow: 1,
  fogDistance: 1,
};

export type ComputedLighting = {
  ambient: number;
  hemisphere: number;
  directional: number;
  torchIntensity: number;
  torchDistance: number;
  enemyLightIntensity: number;
  enemyLightDistance: number;
  enemyEmissiveMin: number;
  enemyEmissiveMax: number;
};

export type ComputedFog = {
  near: number;
  far: number;
};

/** Base lighting values before user multipliers are applied. */
export const BASE_LIGHTING = {
  ambient: 0.34,
  hemisphere: 0.2,
  directional: 0.5,
  torchIntensity: 4.2,
  torchDistance: 10,
  enemyLightIntensity: 1.1,
  enemyLightDistance: 4.2,
  enemyEmissiveMin: 0.14,
  enemyEmissiveMax: 0.4,
  fogNear: 14,
  fogFar: 58,
  cameraFar: 120,
} as const;

/**
 * Loads persisted settings from localStorage, falling back to defaults.
 *
 * Migrates legacy `"android"` platform values to `"mobile"` so existing
 * installs keep touch controls without re-picking a platform.
 */
export function loadGameSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_GAME_SETTINGS;

  try {
    const raw = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_GAME_SETTINGS;

    const parsedUnknown: unknown = JSON.parse(raw);
    const needsPlatformMigration =
      typeof parsedUnknown === "object" &&
      parsedUnknown !== null &&
      "platform" in parsedUnknown &&
      (parsedUnknown as { platform?: unknown }).platform === "android";

    const settings = gameSettingsSchema.parse(migratePersistedSettings(parsedUnknown));

    if (needsPlatformMigration) {
      saveGameSettings(settings);
    }

    return settings;
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

/**
 * Persists settings to localStorage.
 *
 * @param settings - Validated settings object to save.
 */
export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Derives live scene lighting from user settings multipliers.
 *
 * @param settings - Current game settings.
 */
export function computeLighting(settings: GameSettings): ComputedLighting {
  const master = settings.masterBrightness;

  return {
    ambient: BASE_LIGHTING.ambient * settings.ambientBrightness * master,
    hemisphere: BASE_LIGHTING.hemisphere * settings.ambientBrightness * master,
    directional: BASE_LIGHTING.directional * settings.masterBrightness,
    torchIntensity: BASE_LIGHTING.torchIntensity * settings.torchBrightness * master,
    torchDistance: BASE_LIGHTING.torchDistance * (0.85 + settings.torchBrightness * 0.15),
    enemyLightIntensity:
      BASE_LIGHTING.enemyLightIntensity * settings.enemyGlow * master,
    enemyLightDistance:
      BASE_LIGHTING.enemyLightDistance * (0.85 + settings.enemyGlow * 0.15),
    enemyEmissiveMin: BASE_LIGHTING.enemyEmissiveMin * settings.enemyGlow * master,
    enemyEmissiveMax: BASE_LIGHTING.enemyEmissiveMax * settings.enemyGlow * master,
  };
}

/**
 * Derives fog distances from user settings.
 *
 * @param settings - Current game settings.
 */
export function computeFog(settings: GameSettings): ComputedFog {
  return {
    near: BASE_LIGHTING.fogNear * settings.fogDistance,
    far: BASE_LIGHTING.fogFar * settings.fogDistance,
  };
}

/**
 * Returns camera far plane distance scaled to map size.
 *
 * @param mapSize - Selected map preset.
 */
export function computeCameraFar(mapSize: MapSize): number {
  const scale = mapSize === "small" ? 0.85 : mapSize === "large" ? 1.25 : 1;
  return BASE_LIGHTING.cameraFar * scale;
}

/**
 * Human-readable label for a map size preset.
 *
 * @param mapSize - Map preset id.
 */
export function getMapSizeLabel(mapSize: MapSize): string {
  switch (mapSize) {
    case "small":
      return "Small (15×15)";
    case "large":
      return "Large (24×24)";
    default:
      return "Medium (20×20)";
  }
}

/**
 * Human-readable label for a control platform.
 *
 * @param platform - Selected platform id.
 */
export function getPlatformLabel(platform: Platform): string {
  return platform === "mobile" ? "Mobile touch" : "Computer";
}
