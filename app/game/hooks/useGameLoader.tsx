import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { GAME_CONFIG } from "../constants/gameConfig";

export function useGameLoader() {
  const { active, progress } = useProgress();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Force wait for minimum duration
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, GAME_CONFIG.loaderMinDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If minimum time passed AND no loading (assets done), show game
    if (minTimeElapsed && !active) {
      setShowGame(true);
    }
  }, [minTimeElapsed, active]);

  return { showGame, active, progress };
}
