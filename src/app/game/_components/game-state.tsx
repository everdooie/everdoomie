"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useGameSettings } from "~/app/game/_components/game-settings-provider";
import {
  AMMO_CACHE_AMOUNT,
  createPickup,
  EMERGENCY_AMMO_AMOUNT,
  getPickupItem,
  rollWavePickupItem,
  type Pickup,
} from "~/app/game/_components/pickup-data";
import {
  createWaveEnemies,
  getRandomPickupPositions,
  parseSpawnPoints,
  type Enemy,
} from "~/app/game/_components/map-data";
import {
  computePlayerCombatStats,
  createTimedEffect,
  pruneExpiredEffects,
  type ActiveEffect,
  type PlayerCombatStats,
} from "~/app/game/_components/status-effects";
import {
  getWaveConfig,
  TOTAL_WAVES,
  WAVE_INTERMISSION_MS,
} from "~/app/game/_components/wave-data";

export type WavePhase = "active" | "intermission" | "complete";

type GameStateContextValue = {
  health: number;
  ammo: number;
  kills: number;
  enemies: Enemy[];
  pickups: Pickup[];
  activeEffects: ActiveEffect[];
  combatStats: PlayerCombatStats;
  currentWave: number;
  wavePhase: WavePhase;
  waveMessage: string | null;
  pickupMessage: string | null;
  isLocked: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  sessionId: number;
  playerPositionRef: React.RefObject<{ x: number; z: number }>;
  setIsLocked: (locked: boolean) => void;
  damageEnemy: (id: string, damage: number) => void;
  damagePlayer: (amount: number) => void;
  consumeAmmo: () => boolean;
  collectPickup: (id: string) => void;
  restart: () => void;
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

const INITIAL_HEALTH = 100;
const INITIAL_AMMO = 50;
const AMMO_REFILL_PER_WAVE = 15;
const MEDKIT_HEAL = 35;
const AMMO_LEAK_PENALTY = 12;

type GameStateProviderProps = {
  children: ReactNode;
  levelMap: number[][];
};

/**
 * Builds wave pickup entities at random floor tiles.
 *
 * @param wave - Current wave number.
 * @param levelMap - Active level grid for pickup placement.
 * @param avoid - Positions to avoid when placing pickups.
 */
function createWavePickups(
  wave: number,
  levelMap: number[][],
  avoid: { x: number; z: number }[],
): Pickup[] {
  const config = getWaveConfig(wave);
  const positions = getRandomPickupPositions(levelMap, config.pickupCount, avoid);

  return positions.map((position, index) => {
    const itemId = rollWavePickupItem(wave);
    return createPickup(`wave-${wave}-pickup-${index}`, itemId, position);
  });
}

/**
 * Provides shared game state for the Doom clone (health, waves, enemies, pickups).
 *
 * Wrap the Canvas and HUD with this provider so gameplay systems can read and
 * mutate the same state.
 */
export function GameStateProvider({ children, levelMap }: GameStateProviderProps) {
  const { isPaused } = useGameSettings();
  const spawns = useMemo(() => parseSpawnPoints(levelMap), [levelMap]);
  const playerPositionRef = useRef({ x: spawns.player.x, z: spawns.player.z });
  const intermissionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emergencyAmmoPendingRef = useRef(false);
  const dotAccumulatorRef = useRef(0);
  const combatStatsRef = useRef(computePlayerCombatStats([]));

  const [health, setHealth] = useState(INITIAL_HEALTH);
  const [ammo, setAmmo] = useState(INITIAL_AMMO);
  const [kills, setKills] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);
  const [wavePhase, setWavePhase] = useState<WavePhase>("active");
  const [waveMessage, setWaveMessage] = useState<string | null>(null);
  const [pickupMessage, setPickupMessage] = useState<string | null>(null);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>(() =>
    createWaveEnemies(spawns.enemies, getWaveConfig(1)),
  );
  const [pickups, setPickups] = useState<Pickup[]>(() =>
    createWavePickups(1, levelMap, [spawns.player, ...spawns.enemies]),
  );
  const [isLocked, setIsLocked] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [sessionId, setSessionId] = useState(0);

  const combatStats = useMemo(
    () => computePlayerCombatStats(activeEffects),
    [activeEffects],
  );

  combatStatsRef.current = combatStats;

  /**
   * Spawns a single emergency ammo crate when the player is out of ammo.
   */
  const spawnEmergencyAmmoCrate = useCallback(() => {
    if (emergencyAmmoPendingRef.current) return;

    setPickups((prev) => {
      if (prev.some((pickup) => pickup.itemId === "ammo-crate")) {
        emergencyAmmoPendingRef.current = true;
        return prev;
      }

      const avoid = [
        spawns.player,
        playerPositionRef.current,
        ...enemies.map((enemy) => ({ x: enemy.x, z: enemy.z })),
        ...prev.map((pickup) => ({ x: pickup.x, z: pickup.z })),
      ];
      const [position] = getRandomPickupPositions(levelMap, 1, avoid);
      if (!position) return prev;

      emergencyAmmoPendingRef.current = true;
      setPickupMessage("Out of ammo! Emergency resupply dropped nearby.");
      return [
        ...prev,
        createPickup(`emergency-ammo-${Date.now()}`, "ammo-crate", position),
      ];
    });
  }, [enemies, levelMap, spawns.player]);

  /**
   * Applies instant and timed effects from a collected pickup item.
   */
  const applyPickupItem = useCallback((itemId: Pickup["itemId"]) => {
    const item = getPickupItem(itemId);
    setPickupMessage(item.collectMessage);

    switch (itemId) {
      case "medkit":
        setHealth((prev) => Math.min(INITIAL_HEALTH, prev + MEDKIT_HEAL));
        break;
      case "ammo-cache":
        setAmmo((prev) => prev + AMMO_CACHE_AMOUNT);
        break;
      case "ammo-crate":
        setAmmo((prev) => prev + EMERGENCY_AMMO_AMOUNT);
        emergencyAmmoPendingRef.current = false;
        break;
      case "ammo-leak":
        setAmmo((prev) => Math.max(0, prev - AMMO_LEAK_PENALTY));
        break;
      default:
        if (item.durationMs) {
          const now = performance.now();
          setActiveEffects((prev) => [
            ...prev.filter((effect) => effect.itemId !== itemId),
            createTimedEffect(itemId, now),
          ]);
        }
        break;
    }
  }, []);

  /**
   * Starts the next wave after an intermission delay.
   */
  const startWave = useCallback(
    (wave: number) => {
      const config = getWaveConfig(wave);
      setCurrentWave(wave);
      setWavePhase("active");
      setWaveMessage(`Wave ${wave} — Fight!`);
      setEnemies(createWaveEnemies(spawns.enemies, config));
      setPickups(
        createWavePickups(wave, levelMap, [
          spawns.player,
          playerPositionRef.current,
          ...spawns.enemies,
        ]),
      );
      setAmmo((prev) => prev + AMMO_REFILL_PER_WAVE);
      emergencyAmmoPendingRef.current = false;

      if (intermissionTimerRef.current) {
        clearTimeout(intermissionTimerRef.current);
        intermissionTimerRef.current = null;
      }
    },
    [levelMap, spawns.enemies, spawns.player],
  );

  /**
   * Handles clearing all enemies in the current wave.
   */
  const handleWaveCleared = useCallback(
    (clearedWave: number) => {
      if (clearedWave >= TOTAL_WAVES) {
        setWavePhase("complete");
        setWaveMessage("All waves cleared!");
        setIsVictory(true);
        return;
      }

      setWavePhase("intermission");
      setWaveMessage(`Wave ${clearedWave} cleared! Next wave incoming...`);

      intermissionTimerRef.current = setTimeout(() => {
        startWave(clearedWave + 1);
      }, WAVE_INTERMISSION_MS);
    },
    [startWave],
  );

  const damageEnemy = useCallback(
    (id: string, damage: number) => {
      setEnemies((prev) => {
        const next = prev
          .map((enemy) =>
            enemy.id === id ? { ...enemy, health: enemy.health - damage } : enemy,
          )
          .filter((enemy) => enemy.health > 0);

        const killed = prev.length - next.length;
        if (killed > 0) {
          setKills((k) => k + killed);
          const soulHeal = combatStatsRef.current.soulHarvestHeal;
          if (soulHeal > 0) {
            setHealth((hp) => Math.min(INITIAL_HEALTH, hp + soulHeal * killed));
          }
        }

        if (next.length === 0 && prev.length > 0) {
          handleWaveCleared(currentWave);
        }

        return next;
      });
    },
    [currentWave, handleWaveCleared],
  );

  const damagePlayer = useCallback((amount: number) => {
    setHealth((prev) => {
      const next = Math.max(0, prev - amount);
      if (next <= 0) {
        setIsGameOver(true);
      }
      return next;
    });
  }, []);

  const consumeAmmo = useCallback(() => {
    let consumed = false;
    setAmmo((prev) => {
      if (prev <= 0) return prev;
      consumed = true;
      return prev - 1;
    });
    return consumed;
  }, []);

  const collectPickup = useCallback(
    (id: string) => {
      setPickups((prev) => {
        const pickup = prev.find((item) => item.id === id);
        if (!pickup) return prev;

        applyPickupItem(pickup.itemId);
        return prev.filter((item) => item.id !== id);
      });
    },
    [applyPickupItem],
  );

  const restart = useCallback(() => {
    if (intermissionTimerRef.current) {
      clearTimeout(intermissionTimerRef.current);
      intermissionTimerRef.current = null;
    }

    emergencyAmmoPendingRef.current = false;
    dotAccumulatorRef.current = 0;
    setHealth(INITIAL_HEALTH);
    setAmmo(INITIAL_AMMO);
    setKills(0);
    setCurrentWave(1);
    setWavePhase("active");
    setWaveMessage("Wave 1 — Fight!");
    setPickupMessage(null);
    setActiveEffects([]);
    setEnemies(createWaveEnemies(spawns.enemies, getWaveConfig(1)));
    setPickups(createWavePickups(1, levelMap, [spawns.player, ...spawns.enemies]));
    setIsGameOver(false);
    setIsVictory(false);
    setSessionId((id) => id + 1);
    playerPositionRef.current = { x: spawns.player.x, z: spawns.player.z };
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [levelMap, spawns.enemies, spawns.player]);

  useEffect(() => {
    return () => {
      if (intermissionTimerRef.current) {
        clearTimeout(intermissionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pickupMessage) return;

    const timer = setTimeout(() => setPickupMessage(null), 2800);
    return () => clearTimeout(timer);
  }, [pickupMessage]);

  useEffect(() => {
    if (isGameOver || isVictory || isPaused) return;

    const interval = setInterval(() => {
      const now = performance.now();
      setActiveEffects((prev) => {
        const next = pruneExpiredEffects(prev, now);
        return next.length === prev.length ? prev : next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused, isVictory]);

  useEffect(() => {
    if (isGameOver || isVictory || isPaused || combatStats.dotDamagePerSecond <= 0) {
      dotAccumulatorRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      damagePlayer(combatStats.dotDamagePerSecond * 0.25);
    }, 250);

    return () => clearInterval(interval);
  }, [combatStats.dotDamagePerSecond, damagePlayer, isGameOver, isPaused, isVictory]);

  useEffect(() => {
    if (ammo > 0) {
      emergencyAmmoPendingRef.current = false;
    }
  }, [ammo]);

  useEffect(() => {
    if (
      ammo > 0 ||
      isGameOver ||
      isVictory ||
      isPaused ||
      wavePhase !== "active" ||
      emergencyAmmoPendingRef.current
    ) {
      return;
    }

    spawnEmergencyAmmoCrate();
  }, [ammo, isGameOver, isPaused, isVictory, spawnEmergencyAmmoCrate, wavePhase]);

  const value = useMemo(
    () => ({
      health,
      ammo,
      kills,
      enemies,
      pickups,
      activeEffects,
      combatStats,
      currentWave,
      wavePhase,
      waveMessage,
      pickupMessage,
      isLocked,
      isGameOver,
      isVictory,
      sessionId,
      playerPositionRef,
      setIsLocked,
      damageEnemy,
      damagePlayer,
      consumeAmmo,
      collectPickup,
      restart,
    }),
    [
      health,
      ammo,
      kills,
      enemies,
      pickups,
      activeEffects,
      combatStats,
      currentWave,
      wavePhase,
      waveMessage,
      pickupMessage,
      isLocked,
      isGameOver,
      isVictory,
      sessionId,
      damageEnemy,
      damagePlayer,
      consumeAmmo,
      collectPickup,
      restart,
    ],
  );

  return (
    <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
  );
}

/**
 * Reads the active game state context.
 *
 * @throws When used outside of {@link GameStateProvider}.
 */
export function useGameState(): GameStateContextValue {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within GameStateProvider");
  }
  return context;
}
