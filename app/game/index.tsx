import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, Environment, Sky } from "@react-three/drei";
import { useRef, Suspense, useEffect, useState } from "react";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import type { DustSystemHandle } from "./DustSystem";
import { DustSystem } from "./DustSystem";
import { Car } from "./components/Car";
import { Ground } from "./components/Ground";
import { Track } from "./components/Track";
import { EnemyGroup } from "./components/EnemyGroup";
import { Minimap } from "./components/Minimap";
import { LoadingScreen } from "./components/LoadingScreen";
import { useGameLoader } from "./hooks/useGameLoader";
import { useGameState } from "./hooks/useGameState";
import { GAME_CONFIG, START_POSITIONS } from "./constants/gameConfig";

export function App() {
  const halfSize = GAME_CONFIG.mapSize / 2;
  const dustRef = useRef<DustSystemHandle>(null);
  const playerPositionRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...START_POSITIONS[0]),
  );
  const enemyPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const [enemyPositions, setEnemyPositions] = useState<
    Map<string, THREE.Vector3>
  >(new Map());
  const { showGame, active, progress } = useGameLoader();
  const {
    currentLap,
    totalLaps,
    raceState,
    countdown,
    enemies,
    startRace,
    restartRace,
    checkCheckpoint,
  } = useGameState();

  const isRacing = raceState === "racing";

  // Start Race when Game is shown
  const handleStart = () => {
    startRace();
  };

  // Check checkpoints
  useEffect(() => {
    if (isRacing && playerPositionRef.current) {
      const interval = setInterval(() => {
        checkCheckpoint(playerPositionRef.current);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRacing, checkCheckpoint]);

  // Update minimap positions from enemy group
  useEffect(() => {
    setEnemyPositions(new Map(enemyPositionsRef.current));
  }, [enemies.length]);

  const handleRestart = () => {
    restartRace();
    // Reset player position
    if (playerPositionRef.current) {
      playerPositionRef.current.set(...START_POSITIONS[0]);
    }
    // Note: startRace will correct itself via the effect above or we can manually trigger if needed
    // But since restartRace sets state to 'waiting', the effect [showGame, raceState] will fire again
  };

  return (
    <div className="h-screen w-screen bg-slate-900 relative">
      {/* Loading Screen */}
      {!showGame && <LoadingScreen active={active} progress={progress} />}

      {/* Start Game Overlay */}
      {showGame && raceState === "waiting" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-6xl font-black text-white mb-8 italic tracking-tighter">
              READY TO RACE?
            </h1>
            <button
              onClick={handleStart}
              className="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-2xl font-bold rounded-lg transform transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.5)] pointer-events-auto"
            >
              START ENGINE
            </button>
          </div>
        </div>
      )}

      {/* Countdown UI */}
      {raceState === "countdown" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-9xl font-black text-white drop-shadow-[0_0_10px_rgba(0,0,0,1)] animate-pulse">
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      )}

      {/* Race Finished Screen */}
      {raceState === "finished" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Race Finished!</h2>
            <button
              onClick={handleRestart}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xl pointer-events-auto"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <Canvas shadows>
        <OrthographicCamera
          makeDefault
          position={[
            GAME_CONFIG.cameraOffset.x,
            GAME_CONFIG.cameraOffset.y,
            GAME_CONFIG.cameraOffset.z,
          ]}
          zoom={GAME_CONFIG.cameraZoom}
          near={GAME_CONFIG.cameraNear}
          far={GAME_CONFIG.cameraFar}
        />

        {/* Lighting */}
        <ambientLight intensity={2.0} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={3.0}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />

        {/* Environment and Sky */}
        <Environment preset="sunset" />
        <Sky sunPosition={[100, 20, 100]} />

        <Suspense fallback={null}>
          <Physics gravity={GAME_CONFIG.gravity}>
            <Car
              dustRef={dustRef}
              onCollision={() => {}} // No more damage on collision
              positionRef={playerPositionRef}
              isDisabled={!isRacing}
            />

            <EnemyGroup
              enemies={enemies}
              dustRef={dustRef}
              onPositionsUpdate={(positions) => {
                enemyPositionsRef.current = positions;
                setEnemyPositions(new Map(positions));
              }}
              isRacing={isRacing}
            />

            <DustSystem ref={dustRef} />
            <Ground />

            <Track />
          </Physics>
        </Suspense>
      </Canvas>

      {/* Game UI */}
      <div
        className={`absolute top-4 left-4 text-white font-mono pointer-events-none select-none z-10 transition-opacity duration-1000 ${showGame ? "opacity-100" : "opacity-0"}`}
      >
        <h1 className="text-xl font-bold">Racer</h1>
        <p>
          Laps: {currentLap} / {totalLaps}
        </p>
        <p>Position: 1st</p>
      </div>

      {/* Minimap */}
      <div
        className={`pointer-events-none select-none z-10 transition-opacity duration-1000 ${showGame ? "opacity-100" : "opacity-0"}`}
      >
        <Minimap
          playerPosition={playerPositionRef.current}
          enemies={enemies}
          enemyPositions={enemyPositions}
        />
      </div>
    </div>
  );
}
