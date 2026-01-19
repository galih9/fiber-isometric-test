import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function Car() {
  const { scene } = useGLTF("/assets/race.glb");
  const carRef = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.key]: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.key]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!carRef.current) return;

    const speed = 5 * delta;
    const currentPos = carRef.current.position;

    if (keys.ArrowUp || keys.w) {
      currentPos.x -= speed;
      carRef.current.rotation.y = -Math.PI / 2;
    }
    if (keys.ArrowDown || keys.s) {
      currentPos.x += speed;
      carRef.current.rotation.y = Math.PI / 2;
    }
    if (keys.ArrowLeft || keys.a) {
      currentPos.z += speed;
      carRef.current.rotation.y = 0;
    }
    if (keys.ArrowRight || keys.d) {
      currentPos.z -= speed;
      carRef.current.rotation.y = Math.PI;
    }

    // Diagonal rotation handling could be improved, but this is simple enough
    if ((keys.ArrowUp || keys.w) && (keys.ArrowLeft || keys.a))
      carRef.current.rotation.y = -Math.PI / 4;
    if ((keys.ArrowUp || keys.w) && (keys.ArrowRight || keys.d))
      carRef.current.rotation.y = -Math.PI * 0.75;
    if ((keys.ArrowDown || keys.s) && (keys.ArrowLeft || keys.a))
      carRef.current.rotation.y = Math.PI / 4;
    if ((keys.ArrowDown || keys.s) && (keys.ArrowRight || keys.d))
      carRef.current.rotation.y = Math.PI * 0.75;
  });

  return <primitive object={scene} ref={carRef} scale={0.5} />;
}

export function Welcome() {
  return (
    <div className="h-screen w-screen bg-gray-900">
      <Canvas shadows>
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={40}
          near={-50}
          far={200}
          onUpdate={(c) => c.lookAt(0, 0, 0)}
        />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <group position={[0, -1, 0]}>
          <Car />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <gridHelper args={[50, 50]} />
        </group>
      </Canvas>

      <div className="absolute top-4 left-4 text-white font-mono pointer-events-none">
        <h1 className="text-xl font-bold">Racer</h1>
        <p>Use WASD or Arrow Keys to move</p>
      </div>
    </div>
  );
}
