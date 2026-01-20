import { useState, useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { GAME_CONFIG } from "../constants/gameConfig";

export function useGameLoader() {
  const { active, progress } = useProgress();
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Determine if fully loaded
    // active becomes false when all assets are loaded.
    // progress becomes 100.
    // We add a small delay to ensure smooth transition
    if (!active && progress === 100) {
      const timer = setTimeout(() => {
        setShowGame(true);
      }, 500); // Small 500ms buffer
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  return { showGame, active, progress };
}
