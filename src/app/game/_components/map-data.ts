import { z } from "zod";

/** Grid cell types for the level map. */
export const CellType = {
  EMPTY: 0,
  WALL: 1,
  ENEMY_SPAWN: 2,
  PLAYER_SPAWN: 3,
} as const;

export type CellType = (typeof CellType)[keyof typeof CellType];

/** Size of each map tile in world units. */
export const TILE_SIZE = 4;

/** Height of wall geometry. */
export const WALL_HEIGHT = 3;

/** Player movement speed in units per second. */
export const MOVE_SPEED = 8;

/** Player collision radius in world units. */
export const PLAYER_RADIUS = 0.6;

/** Maximum raycast distance for shooting. */
export const SHOOT_RANGE = 50;

/** Damage dealt per shot. */
export const SHOT_DAMAGE = 34;

/** Enemy movement speed toward the player. */
export const ENEMY_SPEED = 2.5;

/** Damage dealt to the player on enemy contact. */
export const ENEMY_DAMAGE = 10;

/** Cooldown between enemy damage ticks in milliseconds. */
export const ENEMY_DAMAGE_COOLDOWN = 1000;

/** Cooldown between shots in milliseconds. */
export const FIRE_COOLDOWN = 250;

export const enemySchema = z.object({
  id: z.string(),
  x: z.number(),
  z: z.number(),
  health: z.number(),
  maxHealth: z.number(),
  speed: z.number(),
  damage: z.number(),
});

export type Enemy = z.infer<typeof enemySchema>;

/** Small maze — compact 15×15 layout. */
export const MAP_SMALL: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

/** Medium maze — default 20×20 layout. */
export const MAP_MEDIUM: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

/** Large maze — expanded 24×24 layout with extra wings. */
export const MAP_LARGE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

/** @deprecated Use {@link getLevelMap} instead. */
export const LEVEL_MAP = MAP_MEDIUM;

export type MapSizePreset = "small" | "medium" | "large";

/**
 * Returns the level grid for a map size preset.
 *
 * @param mapSize - small, medium, or large maze preset.
 */
export function getLevelMap(mapSize: MapSizePreset): number[][] {
  switch (mapSize) {
    case "small":
      return MAP_SMALL;
    case "large":
      return MAP_LARGE;
    default:
      return MAP_MEDIUM;
  }
}

export type SpawnPoints = {
  player: { x: number; z: number };
  enemies: { x: number; z: number }[];
};

/**
 * Parses spawn locations from the level map grid.
 *
 * @param map - 2D grid of cell type values.
 * @returns Player and enemy spawn positions in world coordinates.
 */
export function parseSpawnPoints(map: number[][]): SpawnPoints {
  const enemies: { x: number; z: number }[] = [];
  let player = { x: TILE_SIZE * 1.5, z: TILE_SIZE * 1.5 };

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < (map[row]?.length ?? 0); col++) {
      const cell = map[row]?.[col];
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const z = row * TILE_SIZE + TILE_SIZE / 2;

      if (cell === CellType.PLAYER_SPAWN) {
        player = { x, z };
      } else if (cell === CellType.ENEMY_SPAWN) {
        enemies.push({ x, z });
      }
    }
  }

  return { player, enemies };
}

/**
 * Returns map width and depth in world units.
 *
 * @param map - 2D level grid.
 */
export function getMapDimensions(map: number[][]): { width: number; depth: number } {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;
  return { width: cols * TILE_SIZE, depth: rows * TILE_SIZE };
}

/**
 * Checks whether a circular player body can occupy a world position.
 *
 * @param x - World X coordinate.
 * @param z - World Z coordinate.
 * @param map - Level collision grid.
 * @param radius - Collision radius of the moving body.
 */
export function isWalkable(
  x: number,
  z: number,
  map: number[][],
  radius = PLAYER_RADIUS,
): boolean {
  const corners = [
    { x: x - radius, z: z - radius },
    { x: x + radius, z: z - radius },
    { x: x - radius, z: z + radius },
    { x: x + radius, z: z + radius },
  ];

  for (const corner of corners) {
    const col = Math.floor(corner.x / TILE_SIZE);
    const row = Math.floor(corner.z / TILE_SIZE);

    if (row < 0 || col < 0 || row >= map.length) return false;
    const rowData = map[row];
    if (!rowData || col >= rowData.length) return false;

    if (rowData[col] === CellType.WALL) return false;
  }

  return true;
}

type WaveEnemyConfig = {
  wave: number;
  enemyCount: number;
  enemyHealth: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
};

/**
 * Creates enemy entities for a wave using map spawn points and wave scaling.
 *
 * @param spawns - World positions where enemies can appear.
 * @param config - Wave difficulty settings.
 */
export function createWaveEnemies(
  spawns: { x: number; z: number }[],
  config: WaveEnemyConfig,
): Enemy[] {
  const positions = spawns.slice(0, config.enemyCount);
  const extraCount = config.enemyCount - positions.length;

  for (let index = 0; index < extraCount; index++) {
    const reuse = spawns[index % spawns.length];
    if (reuse) {
      positions.push({
        x: reuse.x + (index % 2 === 0 ? 1.5 : -1.5),
        z: reuse.z + (index % 2 === 0 ? -1.5 : 1.5),
      });
    }
  }

  return positions.map((spawn, index) => ({
    id: `wave-${config.wave}-enemy-${index}`,
    x: spawn.x,
    z: spawn.z,
    health: config.enemyHealth,
    maxHealth: config.enemyHealth,
    speed: ENEMY_SPEED * config.enemySpeedMultiplier,
    damage: ENEMY_DAMAGE * config.enemyDamageMultiplier,
  }));
}

/**
 * Finds random walkable floor tiles suitable for pickup placement.
 *
 * @param map - Level collision grid.
 * @param count - Number of positions to return.
 * @param avoid - Positions to keep away from (player/enemy spawns).
 */
export function getRandomPickupPositions(
  map: number[][],
  count: number,
  avoid: { x: number; z: number }[] = [],
): { x: number; z: number }[] {
  const candidates: { x: number; z: number }[] = [];

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < (map[row]?.length ?? 0); col++) {
      const cell = map[row]?.[col];
      if (cell !== CellType.EMPTY) continue;

      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const z = row * TILE_SIZE + TILE_SIZE / 2;

      const tooClose = avoid.some(
        (point) => Math.hypot(point.x - x, point.z - z) < TILE_SIZE * 1.5,
      );
      if (tooClose) continue;

      candidates.push({ x, z });
    }
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
