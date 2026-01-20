import { useState, useCallback, useRef, useEffect } from "react";
import {
  GAME_CONFIG,
  START_POSITIONS,
  TRACK_WAYPOINTS,
} from "../constants/gameConfig";
import * as THREE from "three";

export type RaceState = "waiting" | "countdown" | "racing" | "finished";

export interface Enemy {
  id: string;
  spawnPosition: [number, number, number];
}

export function useGameState() {
  const [currentLap, setCurrentLap] = useState(1); // Start at lap 1
  const [raceState, setRaceState] = useState<RaceState>("waiting");
  const [countdown, setCountdown] = useState(3);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const initializedRef = useRef(false);

  // Race State
  const nextCheckpointIndexRef = useRef(0);
  const lapsCompletedRef = useRef(0);

  // Initialize Racers once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Create enemies based on Grid positions (skipping index 0 which is player)
    const racers: Enemy[] = [];
    for (let i = 1; i < START_POSITIONS.length; i++) {
      racers.push({
        id: `racer-${i}`,
        spawnPosition: START_POSITIONS[i],
      });
    }
    setEnemies(racers);
  }, []);

  const startRace = useCallback(() => {
    if (raceState !== "waiting") return;
    setRaceState("countdown");
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else if (count === 0) {
        setCountdown(0); // GO!
        setRaceState("racing");
      } else {
        clearInterval(interval);
      }
    }, 1000);
  }, [raceState]);

  const finishRace = useCallback(() => {
    setRaceState("finished");
  }, []);

  const checkCheckpoint = useCallback(
    (position: THREE.Vector3) => {
      if (raceState !== "racing") return;

      const waypoints = TRACK_WAYPOINTS;
      const targetIndex = nextCheckpointIndexRef.current;
      const targetPosVal = waypoints[targetIndex];
      const targetPos = new THREE.Vector3(
        targetPosVal[0],
        targetPosVal[1],
        targetPosVal[2],
      );

      // Check distance to target checkpoint
      // Using a larger radius for checkpoints to ensure player catches them
      if (position.distanceTo(targetPos) < GAME_CONFIG.checkpointRadius) {
        nextCheckpointIndexRef.current = (targetIndex + 1) % waypoints.length;

        // Check for Lap Completion
        // If we pass the last waypoint (index went from Length-1 to 0)
        if (targetIndex === waypoints.length - 1) {
          setCurrentLap((l) => {
            const next = l + 1;
            if (next > GAME_CONFIG.totalLaps) {
              finishRace();
              return l; // Keep at max/finished
            }
            return next;
          });
        }
      }
    },
    [raceState, finishRace],
  );

  const restartRace = useCallback(() => {
    setCurrentLap(1);
    setRaceState("waiting");
    nextCheckpointIndexRef.current = 0;
    lapsCompletedRef.current = 0;
    // Note: Caller needs to call startRace again
  }, []);

  return {
    currentLap,
    totalLaps: GAME_CONFIG.totalLaps,
    raceState,
    countdown,
    enemies,
    startRace,
    finishRace,
    restartRace,
    checkCheckpoint,
  };
}
