import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { RunnerCar } from "./components/RunnerCar";
import { Road } from "./components/Road";
import { ObstacleManager } from "./components/ObstacleManager";

export const RunnerApp = () => {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "KeyW"] },
        { name: "backward", keys: ["ArrowDown", "KeyS"] },
        { name: "left", keys: ["ArrowLeft", "KeyA"] },
        { name: "right", keys: ["ArrowRight", "KeyD"] },
      ]}
    >
      <div style={{ width: "100vw", height: "100vh", background: "#87ceeb" }}>
        <Canvas shadows camera={{ position: [0, 10, 20], fov: 45 }}>
          <Sky sunPosition={[100, 20, 100]} />

          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <Suspense fallback={null}>
            <Physics gravity={[0, -30, 0]}>
              {gameStarted && (
                <>
                  <RunnerCar />
                  <Road />
                  <ObstacleManager />
                </>
              )}
            </Physics>
          </Suspense>
        </Canvas>

        {!gameStarted && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontFamily: "sans-serif",
              background: "rgba(0,0,0,0.4)",
              zIndex: 10,
            }}
          >
            <h1 style={{ fontSize: "4rem", margin: 0, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
              CHEESE RUNNER
            </h1>
            <p style={{ fontSize: "1.5rem", margin: "1rem 0 2rem 0" }}>
              Stay on the road!
            </p>
            <button
              onClick={() => setGameStarted(true)}
              style={{
                padding: "1rem 3rem",
                fontSize: "1.5rem",
                cursor: "pointer",
                background: "#3d2b1f",
                border: "none",
                borderRadius: "4px",
                color: "white",
                fontWeight: "bold"
              }}
            >
              START
            </button>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
};
