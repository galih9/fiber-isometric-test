import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, Environment, Sky } from "@react-three/drei";
import { useRef, Suspense } from "react";
import { Physics } from "@react-three/rapier";
import type { DustSystemHandle } from "./DustSystem";
import { DustSystem } from "./DustSystem";
import { Car } from "./components/Car";
import { Ground } from "./components/Ground";
import { Wall } from "./components/Wall";
import { Obstacle } from "./components/Obstacle";
import { LoadingScreen } from "./components/LoadingScreen";
import { useGameLoader } from "./hooks/useGameLoader";
import { GAME_CONFIG, OBSTACLE_POSITIONS } from "./constants/gameConfig";

export function App() {
  const halfSize = GAME_CONFIG.mapSize / 2;
  const dustRef = useRef<DustSystemHandle>(null);
  const { showGame, active, progress } = useGameLoader();

  return (
    <div className="h-screen w-screen bg-slate-900 relative">
      {/* Loading Screen */}
      {!showGame && <LoadingScreen active={active} progress={progress} />}

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
            <Car dustRef={dustRef} />
            <DustSystem ref={dustRef} />
            <Ground />

            {/* Boundaries */}
            <Wall
              position={[0, GAME_CONFIG.wallHeight / 2, -halfSize]}
              args={[
                GAME_CONFIG.mapSize,
                GAME_CONFIG.wallHeight,
                GAME_CONFIG.wallThickness,
              ]}
            />
            <Wall
              position={[0, GAME_CONFIG.wallHeight / 2, halfSize]}
              args={[
                GAME_CONFIG.mapSize,
                GAME_CONFIG.wallHeight,
                GAME_CONFIG.wallThickness,
              ]}
            />
            <Wall
              position={[-halfSize, GAME_CONFIG.wallHeight / 2, 0]}
              args={[
                GAME_CONFIG.wallThickness,
                GAME_CONFIG.wallHeight,
                GAME_CONFIG.mapSize,
              ]}
            />
            <Wall
              position={[halfSize, GAME_CONFIG.wallHeight / 2, 0]}
              args={[
                GAME_CONFIG.wallThickness,
                GAME_CONFIG.wallHeight,
                GAME_CONFIG.mapSize,
              ]}
            />

            {/* Obstacles */}
            {OBSTACLE_POSITIONS.map((position, index) => (
              <Obstacle key={index} position={position} />
            ))}
          </Physics>
        </Suspense>
      </Canvas>

      {/* Game UI */}
      <div
        className={`absolute top-4 left-4 text-white font-mono pointer-events-none select-none z-10 transition-opacity duration-1000 ${showGame ? "opacity-100" : "opacity-0"}`}
      >
        <h1 className="text-xl font-bold">Racer Physics</h1>
        <p>WASD / Arrows to Drive</p>
        <p>Push the bricks!</p>
      </div>
    </div>
  );
}
