import { z } from "zod";

/** How close the player must be to collect a pickup. */
export const PICKUP_RADIUS = 1.2;

/** Ammo granted by the emergency out-of-ammo crate drop. */
export const EMERGENCY_AMMO_AMOUNT = 22;

/** Ammo granted by wave ammo-cache pickups. */
export const AMMO_CACHE_AMOUNT = 25;

export const pickupItemIdSchema = z.enum([
  "rapid-fire",
  "berserk",
  "medkit",
  "ammo-cache",
  "adrenaline",
  "soul-harvest",
  "explosive-rounds",
  "lead-boots",
  "weapon-jam",
  "blood-curse",
  "ammo-leak",
  "ammo-crate",
]);

export type PickupItemId = z.infer<typeof pickupItemIdSchema>;

export const pickupKindSchema = z.enum(["buff", "debuff", "utility"]);

export type PickupKind = z.infer<typeof pickupKindSchema>;

export const pickupShapeSchema = z.enum([
  "octahedron",
  "box",
  "torus",
  "sphere",
  "crate",
]);

export type PickupShape = z.infer<typeof pickupShapeSchema>;

export const pickupSchema = z.object({
  id: z.string(),
  x: z.number(),
  z: z.number(),
  itemId: pickupItemIdSchema,
});

export type Pickup = z.infer<typeof pickupSchema>;

export const pickupItemSchema = z.object({
  id: pickupItemIdSchema,
  kind: pickupKindSchema,
  label: z.string(),
  collectMessage: z.string(),
  icon: z.string(),
  color: z.string(),
  emissive: z.string(),
  shape: pickupShapeSchema,
  durationMs: z.number().nullable(),
  minWave: z.number().int().min(1),
  weight: z.number().positive(),
});

export type PickupItem = z.infer<typeof pickupItemSchema>;

/** Full catalog of collectible items and their gameplay effects. */
export const PICKUP_ITEMS: Record<PickupItemId, PickupItem> = {
  "rapid-fire": {
    id: "rapid-fire",
    kind: "buff",
    label: "Rapid Fire",
    collectMessage: "Rapid Fire! 2× fire rate for 8s",
    icon: "⚡",
    color: "#38bdf8",
    emissive: "#7dd3fc",
    shape: "octahedron",
    durationMs: 8000,
    minWave: 1,
    weight: 1.2,
  },
  berserk: {
    id: "berserk",
    kind: "buff",
    label: "Berserk",
    collectMessage: "Berserk! 2× damage for 8s",
    icon: "💀",
    color: "#ef4444",
    emissive: "#fca5a5",
    shape: "octahedron",
    durationMs: 8000,
    minWave: 3,
    weight: 0.7,
  },
  medkit: {
    id: "medkit",
    kind: "buff",
    label: "Medkit",
    collectMessage: "Medkit! +35 health",
    icon: "✚",
    color: "#22c55e",
    emissive: "#86efac",
    shape: "box",
    durationMs: null,
    minWave: 1,
    weight: 1.4,
  },
  "ammo-cache": {
    id: "ammo-cache",
    kind: "buff",
    label: "Ammo Cache",
    collectMessage: "Ammo Cache! +25 rounds",
    icon: "▣",
    color: "#eab308",
    emissive: "#fde047",
    shape: "crate",
    durationMs: null,
    minWave: 1,
    weight: 1.1,
  },
  adrenaline: {
    id: "adrenaline",
    kind: "buff",
    label: "Adrenaline",
    collectMessage: "Adrenaline! 1.6× speed for 6s",
    icon: "»",
    color: "#f97316",
    emissive: "#fdba74",
    shape: "sphere",
    durationMs: 6000,
    minWave: 2,
    weight: 1,
  },
  "soul-harvest": {
    id: "soul-harvest",
    kind: "buff",
    label: "Soul Harvest",
    collectMessage: "Soul Harvest! +15 HP per kill for 10s",
    icon: "☽",
    color: "#a855f7",
    emissive: "#d8b4fe",
    shape: "torus",
    durationMs: 10000,
    minWave: 4,
    weight: 0.6,
  },
  "explosive-rounds": {
    id: "explosive-rounds",
    kind: "buff",
    label: "Explosive Rounds",
    collectMessage: "Explosive Rounds! Splash damage for 8s",
    icon: "✸",
    color: "#fb923c",
    emissive: "#fed7aa",
    shape: "octahedron",
    durationMs: 8000,
    minWave: 3,
    weight: 0.75,
  },
  "lead-boots": {
    id: "lead-boots",
    kind: "debuff",
    label: "Lead Boots",
    collectMessage: "Lead Boots! Movement slowed for 8s",
    icon: "▼",
    color: "#64748b",
    emissive: "#94a3b8",
    shape: "torus",
    durationMs: 8000,
    minWave: 1,
    weight: 1.2,
  },
  "weapon-jam": {
    id: "weapon-jam",
    kind: "debuff",
    label: "Weapon Jam",
    collectMessage: "Weapon Jam! Fire rate halved for 8s",
    icon: "✕",
    color: "#78716c",
    emissive: "#a8a29e",
    shape: "box",
    durationMs: 8000,
    minWave: 1,
    weight: 1.1,
  },
  "blood-curse": {
    id: "blood-curse",
    kind: "debuff",
    label: "Blood Curse",
    collectMessage: "Blood Curse! Bleeding for 8s",
    icon: "♥",
    color: "#991b1b",
    emissive: "#f87171",
    shape: "sphere",
    durationMs: 8000,
    minWave: 3,
    weight: 0.85,
  },
  "ammo-leak": {
    id: "ammo-leak",
    kind: "debuff",
    label: "Ammo Leak",
    collectMessage: "Ammo Leak! Lost 12 rounds",
    icon: "▾",
    color: "#713f12",
    emissive: "#ca8a04",
    shape: "crate",
    durationMs: null,
    minWave: 2,
    weight: 0.9,
  },
  "ammo-crate": {
    id: "ammo-crate",
    kind: "utility",
    label: "Emergency Ammo",
    collectMessage: "Emergency resupply! +22 rounds",
    icon: "▣",
    color: "#facc15",
    emissive: "#fef08a",
    shape: "crate",
    durationMs: null,
    minWave: 1,
    weight: 0,
  },
};

/** Wave-spawnable items (excludes emergency ammo crate). */
export const WAVE_PICKUP_IDS = (
  Object.keys(PICKUP_ITEMS) as PickupItemId[]
).filter((id) => id !== "ammo-crate");

/**
 * Returns item metadata for a pickup id.
 *
 * @param itemId - Pickup identifier.
 */
export function getPickupItem(itemId: PickupItemId): PickupItem {
  return PICKUP_ITEMS[itemId];
}

/**
 * Creates a pickup entity at a world position.
 *
 * @param id - Unique pickup instance id.
 * @param itemId - Item type to spawn.
 * @param position - World coordinates.
 */
export function createPickup(
  id: string,
  itemId: PickupItemId,
  position: { x: number; z: number },
): Pickup {
  return { id, x: position.x, z: position.z, itemId };
}

/**
 * Rolls a wave pickup, weighting debuffs higher on later waves and gating rare items.
 *
 * @param wave - Current wave number.
 */
export function rollWavePickupItem(wave: number): PickupItemId {
  const debuffWeight = Math.min(0.58, 0.28 + wave * 0.06);
  const roll = Math.random();
  const pool = WAVE_PICKUP_IDS.filter((id) => PICKUP_ITEMS[id].minWave <= wave);
  const kindPool =
    roll < debuffWeight
      ? pool.filter((id) => PICKUP_ITEMS[id].kind === "debuff")
      : pool.filter((id) => PICKUP_ITEMS[id].kind === "buff");

  const candidates = kindPool.length > 0 ? kindPool : pool;
  const totalWeight = candidates.reduce(
    (sum, id) => sum + PICKUP_ITEMS[id].weight,
    0,
  );
  let threshold = Math.random() * totalWeight;

  for (const id of candidates) {
    threshold -= PICKUP_ITEMS[id].weight;
    if (threshold <= 0) return id;
  }

  return candidates[candidates.length - 1] ?? "medkit";
}
