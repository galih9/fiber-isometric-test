import { useState, useCallback, useRef } from "react";
import { GAME_CONFIG } from "../constants/gameConfig";

export function useGameState() {
  const [hp, setHp] = useState<number>(GAME_CONFIG.playerMaxHP);
  const [isGameOver, setIsGameOver] = useState(false);
  const lastDamageTime = useRef(0);

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

  const restartGame = useCallback(() => {
    setHp(GAME_CONFIG.playerMaxHP);
    setIsGameOver(false);
    lastDamageTime.current = 0;
  }, []);

  return {
    hp,
    isGameOver,
    takeDamage,
    restartGame,
  };
}
