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
  checkpointsPassed: number;
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
      checkpointsPassed: 0,
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
        checkpointsPassed: 0,
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
      // Primary sort: Checkpoints passed (descending)
      if (a.checkpointsPassed !== b.checkpointsPassed) {
        return b.checkpointsPassed - a.checkpointsPassed;
      }
      // Secondary sort: Distance to next checkpoint (ascending)
      return a.distanceToNext - b.distanceToNext;
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

      // Check distance to target checkpoint
      let newCheckpointsPassed =
        nextCheckpointIndexRef.current +
        lapsCompletedRef.current * waypoints.length;

      if (distance < GAME_CONFIG.checkpointRadius) {
        // Waypoint reached!
        const currentWaypointIdx = nextCheckpointIndexRef.current;
        const nextWaypointIdx = (currentWaypointIdx + 1) % waypoints.length;

        nextCheckpointIndexRef.current = nextWaypointIdx;

        // If we just passed the last waypoint (completed a loop logic)
        // But specifically, we want to track total checkpoints passed.
        // Wait, simpler logic:
        // We know we are targeting 'targetIndex'. If we reach it, we increment our total count.
        // But we need to be careful about state updates.

        // Actually, let's track total checkpoints passed in a Ref for the player too,
        // similar to how we might do it for enemies, to ensure consistency.
        // But here we can just calculate it.

        // If we passed waypoint [0], that means we completed 1 full loop (if we started at 0).
        // Let's rely on simple increment.

        // However, `lapsCompletedRef` logic needs to be robust.
        if (currentWaypointIdx === waypoints.length - 1) {
          lapsCompletedRef.current += 1;
        }

        // Recalculate based on new state
        newCheckpointsPassed =
          nextCheckpointIndexRef.current +
          lapsCompletedRef.current * waypoints.length;

        // Calculate Lap
        // Lap 1: 0 checkpoints ... (Length-1) checkpoints.
        // Lap 2: Length checkpoints ...
        // Formula: Math.floor(checkpointsPassed / Length) + 1
        // EXCEPT: Start->WP0 is checkpointsPassed=1.
        // If we follow the plan: "Math.floor((checkpointsPassed - 1) / totalWaypoints) + 1"
        // WP0 reached -> counts as 1. 1-1 / L = 0 -> Lap 1.
        // WP(L-1) reached -> counts as L. L-1 / L = 0 -> Lap 1.
        // WP0 next time (Lap 2) -> counts as L+1. L / L = 1 -> Lap 2.
        // This matches the plan!

        const newLap =
          Math.floor((newCheckpointsPassed - 1) / waypoints.length) + 1;

        if (newLap !== currentLap) {
          setCurrentLap((l) => {
            if (newLap > GAME_CONFIG.totalLaps) {
              finishRace();
              return l;
            }
            return newLap;
          });
        }
      }

      // Update Player Progress
      updateRacerProgress({
        id: "player",
        lap: currentLap, // Use state, or derived? Best to use the derived one for consistency in this frame
        checkpointsPassed: newCheckpointsPassed, // Note: this is an approximation if we didn't just cross.
        // Actually, if we didn't cross, `newCheckpointsPassed` is correct (current target index + laps * length is actually "next target").
        // Wait, "checkpoints passed" means how many we have *already* cleared.
        // If I am aiming for WP0, I have passed 0.
        // If I am aiming for WP1, I have passed 1 (WP0).
        // So `checkpointsPassed` should be: `lapsCompletedRef.current * length + nextCheckpointIndexRef.current`
        // YES.

        nextWaypointIndex: nextCheckpointIndexRef.current,
        distanceToNext: distance,
      });
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
          checkpointsPassed: 0,
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
    racerProgress,
  };
}
