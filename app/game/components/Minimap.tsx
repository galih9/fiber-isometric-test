import * as THREE from "three";
import { GAME_CONFIG } from "../constants/gameConfig";
import type { Enemy } from "../hooks/useGameState";

interface MinimapProps {
  playerPosition: THREE.Vector3 | null;
  enemies: Enemy[];
  enemyPositions: Map<string, THREE.Vector3>;
}

export function Minimap({
  playerPosition,
  enemies,
  enemyPositions,
}: MinimapProps) {
  const mapSize = 150; // Size of minimap in pixels
  const mapScale = mapSize / GAME_CONFIG.mapSize; // Pixels per unit
  const centerX = mapSize / 2;
  const centerY = mapSize / 2;

  // Convert world position to minimap position
  const worldToMinimap = (pos: THREE.Vector3) => {
    const x = centerX + pos.x * mapScale;
    const y = centerY - pos.z * mapScale; // Flip Z for proper orientation
    return { x, y };
  };

  return (
    <div className="absolute bottom-4 right-4 bg-slate-800 border-2 border-slate-600 rounded p-2">
      <div className="text-xs text-slate-300 mb-1 font-mono">Minimap</div>
      <svg
        width={mapSize}
        height={mapSize}
        className="bg-slate-900 border border-slate-600"
      >
        {/* Grid lines for reference */}
        <line
          x1={centerX}
          y1="0"
          x2={centerX}
          y2={mapSize}
          stroke="#475569"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1={centerY}
          x2={mapSize}
          y2={centerY}
          stroke="#475569"
          strokeWidth="0.5"
        />

        {/* Map boundaries */}
        <rect
          x="2"
          y="2"
          width={mapSize - 4}
          height={mapSize - 4}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
        />

        {/* Enemies */}
        {enemies.map((enemy) => {
          const enemyPos = enemyPositions.get(enemy.id);
          if (!enemyPos) return null;

          const minimapPos = worldToMinimap(enemyPos);
          return (
            <circle
              key={enemy.id}
              cx={minimapPos.x}
              cy={minimapPos.y}
              r="4"
              fill="#ea580c"
              opacity="0.8"
            />
          );
        })}

        {/* Player */}
        {playerPosition && (() => {
          const minimapPos = worldToMinimap(playerPosition);
          return (
            <circle
              cx={minimapPos.x}
              cy={minimapPos.y}
              r="5"
              fill="#60a5fa"
              opacity="0.9"
            />
          );
        })()}
      </svg>
      <div className="text-xs text-slate-400 mt-1 font-mono">
        <div>Blue = Player</div>
        <div>Orange = Enemy</div>
      </div>
    </div>
  );
}
