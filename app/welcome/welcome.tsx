import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrthographicCamera,
  useGLTF,
  Environment,
  Sky,
  useProgress,
} from "@react-three/drei";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import {
  Physics,
  RigidBody,
  RapierRigidBody,
  CuboidCollider,
} from "@react-three/rapier";
import type { DustSystemHandle } from "./DustSystem";
import { DustSystem } from "./DustSystem";

// Car component with physics and tank controls
function Car({
  dustRef,
}: {
  dustRef: React.RefObject<DustSystemHandle | null>;
}) {
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
  const carPosition = useRef(new THREE.Vector3());
  // Camera offset relative to the car (behind and above)
  const offset = new THREE.Vector3(20, 20, 20);

  // Use a lower priority to run after physics?
  // R3F default is 0. Physics is usually done in its own step.
  // We'll just trust delta.
  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const forwardInput = keys.ArrowUp || keys.w;
    const backwardInput = keys.ArrowDown || keys.s;
    const leftInput = keys.ArrowLeft || keys.a;
    const rightInput = keys.ArrowRight || keys.d;

    const rigidBody = rigidBodyRef.current;
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );

    // Car Direction Vectors
    // Assumes the GLTF model faces +Z or -Z.
    // Usually models face +Z or -Z. Let's assume -Z is "forward" for the car mesh.
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);

    // Get current velocities (world space)
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);

    // Lateral Friction (Tire Grip)
    // Project velocity onto the right vector to get sliding speed
    const lateralVel = vel.dot(rightDir);
    // Apply impulse opposite to lateral velocity to kill slide
    // 0.8 is the friction coefficient (1.0 = perfect grip, 0.0 = ice)
    const frictionImpulse = () => {
      const lateralFriction = 0.8;
      const changeVelocity = -lateralVel * lateralFriction;
      // Apply as impulse (mass * change_in_velocity)
      return rightDir.clone().multiplyScalar(changeVelocity * rigidBody.mass());
    };

    rigidBody.applyImpulse(frictionImpulse(), true);

    // Drive Force
    const driveSpeed = 1.0; // Acceleration force
    if (forwardInput) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(-driveSpeed * rigidBody.mass() * delta * 60),
        true,
      );
    }
    if (backwardInput) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(driveSpeed * rigidBody.mass() * delta * 60),
        true,
      );
    }

    // Steering
    // We only steer if the car is moving to simulate realistic car steering
    // (though for games, sometimes turning in place is nicer, but "weird" was the complaint)
    const forwardSpeed = vel.dot(forwardDir);

    // Limit max speed
    const maxSpeed = 20.0;
    if (vel.length() > maxSpeed) {
      const clampedVel = vel.normalize().multiplyScalar(maxSpeed);
      rigidBody.setLinvel(clampedVel, true);
    }

    // Allow turning if moving, or if trying to turn while stopped (optional, lets allow pivot for arcade feel but slower)
    // Absolute speed for determining turn capability
    const absSpeed = Math.abs(forwardSpeed);

    if (absSpeed > 1.0 || leftInput || rightInput) {
      const turnSpeed = 3.5 * delta;
      const torque = new THREE.Vector3(0, 0, 0);

      // Reverse steering when going backward feels more natural for some,
      // but standard games usually keep left=left relative to car.
      // Let's keep strict Left/Right relative to car.

      if (leftInput) {
        torque.y += turnSpeed;
      }
      if (rightInput) {
        torque.y -= turnSpeed;
      }

      rigidBody.applyTorqueImpulse(
        torque.multiplyScalar(rigidBody.mass()),
        true,
      );
    }

    // Stabilize (keep car upright)
    // This is often needed if physics goes crazy, but with Cuboid it should be okay.

    const pos = rigidBody.translation();
    const vecPos = new THREE.Vector3(pos.x, pos.y, pos.z);

    // Dust Emission
    if (absSpeed > 5.0 && Math.random() < 0.2) {
      // Emit from rear wheels
      // Assuming car faces -Z, rear is +Z.
      // Width is X.
      const rearOffset = 1.2;
      const widthOffset = 0.6;
      const yOffset = -0.5; // low to ground

      // User reported dust in front.
      // logic: car moves in -forwardDir direction (see drive logic).
      // so forwardDir points 'backwards' relative to movement.
      // To place dust behind, we move along forwardDir (positive).
      const rearCenter = vecPos
        .clone()
        .add(forwardDir.clone().multiplyScalar(rearOffset));

      // Left Wheel
      const leftWheel = rearCenter
        .clone()
        .add(rightDir.clone().multiplyScalar(-widthOffset));
      leftWheel.y += yOffset;

      // Right Wheel
      const rightWheel = rearCenter
        .clone()
        .add(rightDir.clone().multiplyScalar(widthOffset));
      rightWheel.y += yOffset;

      dustRef.current?.emit(leftWheel);
      dustRef.current?.emit(rightWheel);
    }

    // Camera Follow Logic (Stutter Fix)

    // Smoothly interpolate the car position tracking to avoid jitter from physics updates
    // "damp" the tracking vector
    const smoothing = 1 - Math.pow(0.001, delta); // Strong equivalent to lerp factor but frame-independent

    carPosition.current.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), smoothing);

    const targetCameraPos = new THREE.Vector3(
      carPosition.current.x + offset.x,
      carPosition.current.y + offset.y,
      carPosition.current.z + offset.z,
    );

    // Smooth camera movement
    camera.position.lerp(targetCameraPos, 0.1); // Keep it simple but smooth
    camera.lookAt(carPosition.current);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 2, 0]}
      colliders="cuboid"
      mass={150} // Heavier car feel
      linearDamping={0.5} // Less air resistance, let friction handle it
      angularDamping={5.0} // High angular damping prevents spinning out of control
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
        <meshStandardMaterial color="#555" />
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
        <meshStandardMaterial color="#777" />
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

  const dustRef = useRef<DustSystemHandle>(null);

  // Custom Loader Logic
  const { active, progress } = useProgress();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    // Force wait for 5 seconds
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // If 5s passed AND no loading (assets done), show game
    if (minTimeElapsed && !active) {
      setShowGame(true);
    }
  }, [minTimeElapsed, active]);

  return (
    <div className="h-screen w-screen bg-slate-900 relative">
      {/* Custom Forced Loader */}
      {!showGame && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
          <div className="text-4xl font-bold mb-4 animate-pulse">
            LOADING GAME...
          </div>
          <div className="w-64 h-4 bg-gray-800 rounded-full overflow-hidden">
            {/* Show progress bar if assets are loading, otherwise simple infinite pulse */}
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            {active
              ? `Loading Assets: ${progress.toFixed(0)}%`
              : "Preparing Environment..."}
          </p>
        </div>
      )}

      <Canvas shadows>
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={60} // Closer camera (higher zoom = closer for Ortho)
          near={-100}
          far={300}
        />

        {/* Improved Lighting */}
        <ambientLight intensity={2.0} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={3.0}
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
            <Car dustRef={dustRef} />
            <DustSystem ref={dustRef} />
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
