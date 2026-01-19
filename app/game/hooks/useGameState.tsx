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
  const initializedRef = useRef(false);

  // Spawn initial 5 enemies on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const initialEnemies: Enemy[] = [];
      
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const distance = 20;
        initialEnemies.push({
          id: `enemy-${i}`,
          spawnPosition: [
            Math.cos(angle) * distance,
            2,
            Math.sin(angle) * distance,
          ],
        });
      }
      
      setEnemies(initialEnemies);
      enemyCounterRef.current = 5;
    }
  }, []);

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
