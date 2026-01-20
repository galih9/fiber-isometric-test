import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { DustSystemHandle } from "../DustSystem";
import type { TrailSystemHandle } from "../TrailSystem";
import type { Enemy } from "../hooks/useGameState";
import { EnemyUnit } from "./EnemyUnit";
import { GAME_CONFIG } from "../constants/gameConfig";

interface EnemyGroupProps {
  enemies: Enemy[];
  playerPositionRef: React.RefObject<THREE.Vector3 | null>;
  dustRef: React.RefObject<DustSystemHandle | null>;
  trailRef: React.RefObject<TrailSystemHandle | null>;
  onEnemyRemove: (id: string) => void;
  onPositionsUpdate?: (positions: Map<string, THREE.Vector3>) => void;
}

export function EnemyGroup({
  enemies,
  playerPositionRef,
  dustRef,
  trailRef,
  onEnemyRemove,
  onPositionsUpdate,
}: EnemyGroupProps) {
  const enemyPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  useFrame(() => {
    // Check for enemies that are too far away and should despawn
    enemies.forEach((enemy) => {
      const pos = enemyPositionsRef.current.get(enemy.id);
      if (pos) {
        const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (distance > GAME_CONFIG.enemyDespawnDistance) {
          onEnemyRemove(enemy.id);
          enemyPositionsRef.current.delete(enemy.id);
        }
      }
    });

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
          playerPositionRef={playerPositionRef}
          dustRef={dustRef}
          trailRef={trailRef}
          onPositionUpdate={(pos) =>
            enemyPositionsRef.current.set(enemy.id, pos)
          }
          onDeath={onEnemyRemove}
        />
      ))}
    </>
  );
}
