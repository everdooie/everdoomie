import { z } from "zod";

import {
  getPickupItem,
  type PickupItemId,
} from "~/app/game/_components/pickup-data";
import { FIRE_COOLDOWN, MOVE_SPEED, SHOT_DAMAGE } from "~/app/game/_components/map-data";

export const activeEffectSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  label: z.string(),
  icon: z.string(),
  kind: z.enum(["buff", "debuff", "utility"]),
  expiresAt: z.number(),
});

export type ActiveEffect = z.infer<typeof activeEffectSchema>;

export type PlayerCombatStats = {
  shotDamage: number;
  fireCooldownMs: number;
  moveSpeed: number;
  hasExplosiveRounds: boolean;
  explosiveSplashRadius: number;
  explosiveSplashMultiplier: number;
  soulHarvestHeal: number;
  dotDamagePerSecond: number;
};

/** Radius in world units for explosive round splash damage. */
export const EXPLOSIVE_SPLASH_RADIUS = 4;

/** Splash damage as a fraction of direct shot damage. */
export const EXPLOSIVE_SPLASH_MULTIPLIER = 0.55;

/** Health restored per kill while Soul Harvest is active. */
export const SOUL_HARVEST_HEAL = 15;

/** Damage per second from Blood Curse. */
export const BLOOD_CURSE_DPS = 3;

/**
 * Creates a timed active effect from a pickup item.
 *
 * @param itemId - Source pickup item.
 * @param now - Current timestamp in milliseconds.
 */
export function createTimedEffect(itemId: PickupItemId, now: number): ActiveEffect {
  const item = getPickupItem(itemId);
  return {
    id: `${itemId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
    itemId,
    label: item.label,
    icon: item.icon,
    kind: item.kind,
    expiresAt: now + (item.durationMs ?? 0),
  };
}

/**
 * Removes expired timed effects from the active list.
 *
 * @param effects - Current active effects.
 * @param now - Current timestamp in milliseconds.
 */
export function pruneExpiredEffects(
  effects: ActiveEffect[],
  now: number,
): ActiveEffect[] {
  return effects.filter((effect) => effect.expiresAt > now);
}

/**
 * Computes player combat stats from base values and active timed effects.
 *
 * @param effects - Active timed buffs and debuffs.
 */
export function computePlayerCombatStats(effects: ActiveEffect[]): PlayerCombatStats {
  let damageMultiplier = 1;
  let fireRateMultiplier = 1;
  let moveSpeedMultiplier = 1;
  let hasExplosiveRounds = false;
  let soulHarvestHeal = 0;
  let dotDamagePerSecond = 0;

  for (const effect of effects) {
    switch (effect.itemId as PickupItemId) {
      case "rapid-fire":
        fireRateMultiplier *= 2;
        break;
      case "berserk":
        damageMultiplier *= 2;
        break;
      case "adrenaline":
        moveSpeedMultiplier *= 1.6;
        break;
      case "soul-harvest":
        soulHarvestHeal = SOUL_HARVEST_HEAL;
        break;
      case "explosive-rounds":
        hasExplosiveRounds = true;
        break;
      case "lead-boots":
        moveSpeedMultiplier *= 0.55;
        break;
      case "weapon-jam":
        fireRateMultiplier *= 0.5;
        break;
      case "blood-curse":
        dotDamagePerSecond += BLOOD_CURSE_DPS;
        break;
      default:
        break;
    }
  }

  return {
    shotDamage: Math.round(SHOT_DAMAGE * damageMultiplier),
    fireCooldownMs: FIRE_COOLDOWN / fireRateMultiplier,
    moveSpeed: MOVE_SPEED * moveSpeedMultiplier,
    hasExplosiveRounds,
    explosiveSplashRadius: EXPLOSIVE_SPLASH_RADIUS,
    explosiveSplashMultiplier: EXPLOSIVE_SPLASH_MULTIPLIER,
    soulHarvestHeal,
    dotDamagePerSecond,
  };
}

/**
 * Returns remaining seconds for HUD timers.
 *
 * @param expiresAt - Effect expiry timestamp.
 * @param now - Current timestamp in milliseconds.
 */
export function getEffectSecondsRemaining(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}
