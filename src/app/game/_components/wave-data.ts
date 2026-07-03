import { z } from "zod";

/** Total number of waves before victory. */
export const TOTAL_WAVES = 5;

/** Delay in milliseconds between clearing a wave and starting the next. */
export const WAVE_INTERMISSION_MS = 3000;

export const waveConfigSchema = z.object({
  wave: z.number().int().min(1),
  enemyCount: z.number().int().min(1),
  enemyHealth: z.number().positive(),
  enemySpeedMultiplier: z.number().positive(),
  enemyDamageMultiplier: z.number().positive(),
  pickupCount: z.number().int().min(0),
});

export type WaveConfig = z.infer<typeof waveConfigSchema>;

/**
 * Five waves with escalating enemy count, health, speed, and contact damage.
 *
 * Wave 1 is a warm-up; wave 5 is the hardest with all spawn points active.
 */
export const WAVES: WaveConfig[] = [
  {
    wave: 1,
    enemyCount: 2,
    enemyHealth: 80,
    enemySpeedMultiplier: 1,
    enemyDamageMultiplier: 1,
    pickupCount: 1,
  },
  {
    wave: 2,
    enemyCount: 3,
    enemyHealth: 110,
    enemySpeedMultiplier: 1.15,
    enemyDamageMultiplier: 1.15,
    pickupCount: 2,
  },
  {
    wave: 3,
    enemyCount: 4,
    enemyHealth: 140,
    enemySpeedMultiplier: 1.3,
    enemyDamageMultiplier: 1.3,
    pickupCount: 2,
  },
  {
    wave: 4,
    enemyCount: 4,
    enemyHealth: 175,
    enemySpeedMultiplier: 1.45,
    enemyDamageMultiplier: 1.45,
    pickupCount: 2,
  },
  {
    wave: 5,
    enemyCount: 5,
    enemyHealth: 220,
    enemySpeedMultiplier: 1.65,
    enemyDamageMultiplier: 1.65,
    pickupCount: 3,
  },
];

/**
 * Returns the configuration for a given wave number.
 *
 * @param wave - 1-based wave index.
 */
export function getWaveConfig(wave: number): WaveConfig {
  const config = WAVES.find((entry) => entry.wave === wave);
  if (!config) {
    return WAVES[WAVES.length - 1]!;
  }
  return config;
}
