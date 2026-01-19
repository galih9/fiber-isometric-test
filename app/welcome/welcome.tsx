import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrthographicCamera,
  useGLTF,
  Environment,
  Sky,
} from "@react-three/drei";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import {
  Physics,
  RigidBody,
  RapierRigidBody,
  CuboidCollider,
} from "@react-three/rapier";

// Car component with physics and tank controls
function Car() {
  const { scene } = useGLTF("/assets/cars/race.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);

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

  const { camera } = useThree();
  const carPosition = new THREE.Vector3();
  const offset = new THREE.Vector3(20, 20, 20);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    // TANK CONTROLS
    const forward = keys.ArrowUp || keys.w;
    const backward = keys.ArrowDown || keys.s;
    const left = keys.ArrowLeft || keys.a;
    const right = keys.ArrowRight || keys.d;

    // Get current rotation
    const rotation = rigidBodyRef.current.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );

    // Calculate forward direction (assuming -Z is forward for the model)
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

    // Movement force (Impulse)
    const speed = 0.5; // Impulse strength
    const impulse = new THREE.Vector3();

    // REVERSED CONTROLS FIX:
    // If "forward" (W) was moving it wrong, forwardDir might be pointing opposite to desired.
    // Standard GLB often faces +Z. Our code assumed -Z.
    // If user said it was reversed, we flip the signs.

    if (forward) {
      impulse.addScaledVector(forwardDir, -speed); // Flipped
    }
    if (backward) {
      impulse.addScaledVector(forwardDir, speed); // Flipped
    }

    // Apply impulse (wake up body if sleeping)
    if (impulse.lengthSq() > 0) {
      rigidBodyRef.current.applyImpulse(impulse, true);
    }

    // Rotation torque
    const turnSpeed = 0.05; // Greatly Reduced sensitivity
    const torque = new THREE.Vector3();
    if (left) {
      torque.y += turnSpeed;
    }
    if (right) {
      torque.y -= turnSpeed;
    }

    if (torque.lengthSq() > 0) {
      rigidBodyRef.current.applyTorqueImpulse(torque, true);
    }

    // Camera Follow
    const pos = rigidBodyRef.current.translation();
    carPosition.set(pos.x, pos.y, pos.z);

    camera.lookAt(carPosition);
    camera.position.lerp(
      new THREE.Vector3(
        carPosition.x + offset.x,
        carPosition.y + offset.y,
        carPosition.z + offset.z,
      ),
      0.1, // Smooth factor
    );
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 2, 0]}
      colliders="cuboid"
      mass={50}
      linearDamping={2.0}
      angularDamping={2.0} // High damping helps control
      friction={0.5}
    >
      <primitive object={scene} scale={0.5} />
    </RigidBody>
  );
}

function Ground() {
  return (
    // Use CuboidCollider for the ground to ensure nothing falls through
    // Rotation is applied to the rigidbody, effectively making the collider flat
    <RigidBody
      type="fixed"
      rotation={[-Math.PI / 2, 0, 0]}
      friction={1}
      colliders={false}
    >
      <CuboidCollider args={[50, 50, 1]} position={[0, 0, -1]} />
      <mesh receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </RigidBody>
  );
}

function Wall({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </RigidBody>
  );
}

function Obstacle({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF("/assets/bricks/bevel-hq-brick-1x2.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  return (
    // Made bricks bigger (scale 3) and adjusted mass/colliders
    <RigidBody
      position={position}
      mass={5}
      colliders="cuboid"
      friction={0.5}
      restitution={0.2}
    >
      <primitive object={clone} scale={3} />
    </RigidBody>
  );
}

export function Welcome() {
  // Reduced Map Size
  const mapSize = 60;
  const wallHeight = 4;
  const wallThickness = 2;
  const halfSize = mapSize / 2;
  // Wall positions
  // Top (Z = -50)
  // Bottom (Z = 50)
  // Left (X = -50)
  // Right (X = 50)

  return (
    <div className="h-screen w-screen bg-gray-900">
      <Canvas shadows>
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={60} // Closer camera (higher zoom = closer for Ortho)
          near={-100}
          far={300}
        />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1}
          castShadow
          // Reduced shadow map size for performance
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
          <Physics gravity={[0, -20, 0]}>
            <Car />
            <Ground />

            {/* Boundaries */}
            <Wall
              position={[0, wallHeight / 2, -halfSize]}
              args={[mapSize, wallHeight, wallThickness]}
            />
            <Wall
              position={[0, wallHeight / 2, halfSize]}
              args={[mapSize, wallHeight, wallThickness]}
            />
            <Wall
              position={[-halfSize, wallHeight / 2, 0]}
              args={[wallThickness, wallHeight, mapSize]}
            />
            <Wall
              position={[halfSize, wallHeight / 2, 0]}
              args={[wallThickness, wallHeight, mapSize]}
            />

            {/* Random Obstacles */}
            <Obstacle position={[5, 2, 5]} />
            <Obstacle position={[-5, 2, -5]} />
            <Obstacle position={[10, 2, -10]} />
            <Obstacle position={[-10, 2, 8]} />
            <Obstacle position={[15, 2, 2]} />
            <Obstacle position={[-12, 2, 12]} />
            <Obstacle position={[0, 2, 12]} />
            <Obstacle position={[8, 2, -15]} />
          </Physics>
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 text-white font-mono pointer-events-none select-none z-10">
        <h1 className="text-xl font-bold">Racer Physics</h1>
        <p>WASD / Arrows to Drive</p>
        <p>Push the bricks!</p>
      </div>
    </div>
  );
}
