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

export interface RacerProgress {
  id: string;
  lap: number;
  nextWaypointIndex: number;
  distanceToNext: number;
}

export function useGameState() {
  const [currentLap, setCurrentLap] = useState(1); // Start at lap 1
  const [raceState, setRaceState] = useState<RaceState>("waiting");
  const [countdown, setCountdown] = useState(3);
  const [enemies, setEnemies] = useState<Enemy[]>([]);

  const [racerProgress, setRacerProgress] = useState<
    Map<string, RacerProgress>
  >(new Map());
  // Derived state for position
  const [playerPositionRank, setPlayerPositionRank] = useState(1);

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
    const initialProgress = new Map<string, RacerProgress>();

    // Add Player to progress tracking
    initialProgress.set("player", {
      id: "player",
      lap: 1,
      nextWaypointIndex: 0,
      distanceToNext: 0,
    });

    for (let i = 1; i < START_POSITIONS.length; i++) {
      const id = `racer-${i}`;
      racers.push({
        id,
        spawnPosition: START_POSITIONS[i],
      });
      initialProgress.set(id, {
        id,
        lap: 1,
        nextWaypointIndex: 0,
        distanceToNext: 0,
      });
    }
    setEnemies(racers);
    setRacerProgress(initialProgress);
  }, []);

  const updateRacerProgress = useCallback((progress: RacerProgress) => {
    setRacerProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(progress.id, progress);
      return newMap;
    });
  }, []);

  // Calculate Positions
  useEffect(() => {
    // Sort racers
    const racers = Array.from(racerProgress.values());
    racers.sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.nextWaypointIndex !== b.nextWaypointIndex)
        return b.nextWaypointIndex - a.nextWaypointIndex;
      return a.distanceToNext - b.distanceToNext; // Smaller distance is better
    });

    const playerRank = racers.findIndex((r) => r.id === "player") + 1;
    setPlayerPositionRank(playerRank > 0 ? playerRank : 1);
  }, [racerProgress]);

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

      const distance = position.distanceTo(targetPos);

      // Update Player Progress
      updateRacerProgress({
        id: "player",
        lap: currentLap,
        nextWaypointIndex: targetIndex,
        distanceToNext: distance,
      });

      // Check distance to target checkpoint
      if (distance < GAME_CONFIG.checkpointRadius) {
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
    [raceState, finishRace, currentLap, updateRacerProgress],
  );

  const restartRace = useCallback(() => {
    setCurrentLap(1);
    setRaceState("waiting");
    nextCheckpointIndexRef.current = 0;
    lapsCompletedRef.current = 0;

    // Reset progress
    setRacerProgress((prev) => {
      const newMap = new Map();
      prev.forEach((val, key) => {
        newMap.set(key, {
          ...val,
          lap: 1,
          nextWaypointIndex: 0,
          distanceToNext: 0,
        });
      });
      return newMap;
    });
  }, []);

  return {
    currentLap,
    totalLaps: GAME_CONFIG.totalLaps,
    raceState,
    countdown,
    enemies,
    playerPositionRank,
    startRace,
    finishRace,
    restartRace,
    checkCheckpoint,
    updateRacerProgress,
  };
}
