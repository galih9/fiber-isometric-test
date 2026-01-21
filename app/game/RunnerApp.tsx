import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, Stars, KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { RunnerCar } from "./components/RunnerCar";
import { Log } from "./components/Log";
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
        { name: "jump", keys: ["Space"] },
      ]}
    >
      <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
        <Canvas shadows camera={{ position: [0, 10, 20], fov: 45 }}>
          <color attach="background" args={["#050505"]} />
          <Sky sunPosition={[100, 10, 100]} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          <pointLight position={[-10, 10, -10]} intensity={1} color="#3b82f6" />

          <Suspense fallback={null}>
            <Physics gravity={[0, -30, 0]}>
              {gameStarted && (
                <>
                  <RunnerCar />
                  <Log />
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
              fontFamily: "monospace",
              background: "rgba(0,0,0,0.8)",
              zIndex: 10,
            }}
          >
            <h1 style={{ fontSize: "5rem", margin: 0, color: "#f87171", textShadow: "0 0 20px rgba(248, 113, 113, 0.5)" }}>
              LOG RUNNER
            </h1>
            <p style={{ fontSize: "1.5rem", margin: "1rem 0 3rem 0", letterSpacing: "0.2em" }}>
              STAY ON THE LOG • AVOID OBSTACLES
            </p>
            <button
              onClick={() => setGameStarted(true)}
              style={{
                padding: "1.5rem 4rem",
                fontSize: "2rem",
                cursor: "pointer",
                background: "#f87171",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontWeight: "bold",
                transition: "transform 0.2s",
                boxShadow: "0 10px 30px rgba(248, 113, 113, 0.4)"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              START
            </button>
            <div style={{ marginTop: "4rem", textAlign: "center", opacity: 0.8 }}>
              <p>STEER: WASD / ARROWS</p>
              <p>RAMPS TRIGGER JUMPS AUTOMATICALLY</p>
            </div>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
};
