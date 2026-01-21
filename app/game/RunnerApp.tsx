import { Suspense, useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Sky, KeyboardControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { RunnerCar } from "./components/RunnerCar";
import { Road } from "./components/Road";
import { ObstacleManager } from "./components/ObstacleManager";

export const RunnerApp = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [touchInput, setTouchInput] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !gameOver) {
      interval = setInterval(() => {
        setScore((s) => s + 1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!gameStarted || gameOver) return;
    const { clientX } = e;
    const { width } = containerRef.current!.getBoundingClientRect();
    if (clientX < width / 2) {
      setTouchInput({ left: true, right: false });
    } else {
      setTouchInput({ left: false, right: true });
    }
  };

  const handlePointerUp = () => {
    setTouchInput({ left: false, right: false });
  };

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  };

  return (
    <KeyboardControls
      map={[
        { name: "left", keys: ["ArrowLeft", "KeyA"] },
        { name: "right", keys: ["ArrowRight", "KeyD"] },
      ]}
    >
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          background: "#87ceeb",
          overflow: "hidden",
          touchAction: "none",
          position: "relative"
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Canvas
          shadows
          camera={{ position: [0, 10, 20], fov: 45 }}
          onCreated={({ camera }) => {
            const isPortrait = window.innerHeight > window.innerWidth;
            if (isPortrait && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
              (camera as THREE.PerspectiveCamera).fov = 65;
              camera.updateProjectionMatrix();
            }
          }}
        >
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
                  <RunnerCar
                    touchInput={touchInput}
                    onCollision={() => setGameOver(true)}
                  />
                  {!gameOver && (
                    <>
                      <Road />
                      <ObstacleManager />
                    </>
                  )}
                </>
              )}
            </Physics>
          </Suspense>
        </Canvas>

        {/* Score HUD */}
        {gameStarted && (
          <div style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
            fontWeight: "bold",
            fontFamily: "monospace",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            zIndex: 5
          }}>
            SCORE: {score}
          </div>
        )}

        {(!gameStarted || gameOver) && (
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
              background: "rgba(0,0,0,0.6)",
              zIndex: 10,
              padding: "20px",
              textAlign: "center"
            }}
          >
            <h1 style={{ fontSize: "clamp(2.5rem, 12vw, 5rem)", margin: 0, textShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
              {gameOver ? "GAME OVER" : "CHEESE RUNNER"}
            </h1>
            <p style={{ fontSize: "clamp(1.2rem, 5vw, 2rem)", margin: "1rem 0 2rem 0" }}>
              {gameOver ? `FINAL SCORE: ${score}` : "Stay on the road!"}
            </p>
            <button
              onClick={startGame}
              style={{
                padding: "1.2rem 3.5rem",
                fontSize: "1.8rem",
                cursor: "pointer",
                background: gameOver ? "#ef4444" : "#3d2b1f",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontWeight: "bold",
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                transition: "transform 0.1s"
              }}
              onPointerDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
              onPointerUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {gameOver ? "TRY AGAIN" : "START"}
            </button>
            <p style={{ marginTop: "3rem", opacity: 0.9, fontSize: "clamp(0.8rem, 3vw, 1rem)", letterSpacing: "0.1em" }}>
              AD / ARROWS OR TAP SIDES
            </p>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
};
