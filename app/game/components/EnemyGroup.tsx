import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { DustSystemHandle } from "../DustSystem";
import type { Enemy } from "../hooks/useGameState";
import { EnemyUnit } from "./EnemyUnit";

interface EnemyGroupProps {
  enemies: Enemy[];
  dustRef: React.RefObject<DustSystemHandle | null>;
  onPositionsUpdate?: (positions: Map<string, THREE.Vector3>) => void;
  onProgressUpdate?: (progress: {
    id: string;
    lap: number;
    checkpointsPassed: number;
    nextWaypointIndex: number;
    distanceToNext: number;
  }) => void;
  isRacing: boolean;
}

export function EnemyGroup({
  enemies,
  dustRef,
  onPositionsUpdate,
  onProgressUpdate,
  isRacing,
}: EnemyGroupProps) {
  const enemyPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  useFrame(() => {
    // Update parent with current positions
    if (onPositionsUpdate) {
      onPositionsUpdate(new Map(enemyPositionsRef.current));
    }
  });

  return (
    <>
      {enemies.map((enemy) => (
        <EnemyUnit
          key={enemy.id}
          id={enemy.id}
          spawnPosition={enemy.spawnPosition}
          dustRef={dustRef}
          onPositionUpdate={(pos) =>
            enemyPositionsRef.current.set(enemy.id, pos)
          }
          onProgressUpdate={onProgressUpdate}
          isRacing={isRacing}
        />
      ))}
    </>
  );
}
