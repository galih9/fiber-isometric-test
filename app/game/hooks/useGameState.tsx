import { useState, useCallback, useRef, useEffect } from "react";
import { GAME_CONFIG } from "../constants/gameConfig";

export interface Enemy {
  id: string;
  spawnPosition: [number, number, number];
}

export function useGameState() {
  const [hp, setHp] = useState<number>(GAME_CONFIG.playerMaxHP);
  const [isGameOver, setIsGameOver] = useState(false);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemiesEnabled, setEnemiesEnabled] = useState(true);
  const lastDamageTime = useRef(0);
  const enemyCounterRef = useRef(0);
  const lastEnemySpawnTime = useRef(0);
  const initializedRef = useRef(false);



  const takeDamage = useCallback((amount: number) => {
    const now = Date.now();

    // Check cooldown
    if (now - lastDamageTime.current < GAME_CONFIG.damageCooldown) {
      return;
    }

    lastDamageTime.current = now;

    setHp((currentHp) => {
      const newHp = Math.max(0, currentHp - amount);

      if (newHp === 0) {
        setIsGameOver(true);
      }

      return newHp;
    });
  }, []);

  const spawnEnemy = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = GAME_CONFIG.enemySpawnDistance;
    const spawnPos: [number, number, number] = [
      Math.cos(angle) * distance,
      2,
      Math.sin(angle) * distance,
    ];

    const newEnemy: Enemy = {
      id: `enemy-${enemyCounterRef.current++}`,
      spawnPosition: spawnPos,
    };

    setEnemies((prev) => [...prev, newEnemy]);
  }, []);

  // Spawn enemy every 15 seconds
  useEffect(() => {
    if (!enemiesEnabled) return;

    const intervalId = setInterval(() => {
      spawnEnemy();
    }, GAME_CONFIG.enemySpawnInterval);

    return () => clearInterval(intervalId);
  }, [enemiesEnabled, spawnEnemy]);

  const removeEnemy = useCallback((id: string) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEnemySpawning = useCallback(() => {
    // Disabled - using static 5 enemies for testing
  }, []);

  const toggleEnemies = useCallback(() => {
    setEnemiesEnabled((prev) => !prev);
  }, []);

  const restartGame = useCallback(() => {
    setHp(GAME_CONFIG.playerMaxHP);
    setIsGameOver(false);
    setEnemies([]);
    setEnemiesEnabled(true);
    lastDamageTime.current = 0;
    lastEnemySpawnTime.current = 0;
    enemyCounterRef.current = 0;
  }, []);

  return {
    hp,
    isGameOver,
    enemies,
    enemiesEnabled,
    takeDamage,
    spawnEnemy,
    removeEnemy,
    updateEnemySpawning,
    toggleEnemies,
    restartGame,
  };
}
