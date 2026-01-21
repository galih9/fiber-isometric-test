import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody, CollisionPayload } from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";

export const RunnerCar = () => {
  const rbRef = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();

  useFrame((state, delta) => {
    if (!rbRef.current) return;

    const { left, right } = getKeys();
    const currentPos = rbRef.current.translation();

    // Respawn if fell off
    if (currentPos.y < -10) {
      rbRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
      rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Steering
    const steeringForce = 100 * rbRef.current.mass();
    if (left) {
      rbRef.current.applyImpulse({ x: -steeringForce * delta, y: 0, z: 0 }, true);
    }
    if (right) {
      rbRef.current.applyImpulse({ x: steeringForce * delta, y: 0, z: 0 }, true);
    }

    // Keep car at z=0
    const zCorrection = -currentPos.z * 50 * rbRef.current.mass();
    rbRef.current.applyImpulse({ x: 0, y: 0, z: zCorrection * delta }, true);

    // Limit X position (road is approx 50 wide)
    if (Math.abs(currentPos.x) > 25) {
      rbRef.current.applyImpulse({ x: -currentPos.x * 2 * rbRef.current.mass(), y: 0, z: 0 }, true);
    }

    // Camera follow
    const cameraPosition = new THREE.Vector3(
      currentPos.x * 0.7,
      currentPos.y + 6,
      currentPos.z + 14
    );
    state.camera.position.lerp(cameraPosition, 0.1);
    state.camera.lookAt(currentPos.x, currentPos.y + 1, currentPos.z);
  });

  const handleCollision = (event: CollisionPayload) => {
    if (event.other.rigidBodyObject?.userData?.type === 'ramp') {
      rbRef.current?.applyImpulse({ x: 0, y: 15, z: 0 }, true);
    }
  };

  return (
    <RigidBody
      ref={rbRef}
      colliders="cuboid"
      position={[0, 2, 0]}
      mass={5}
      enabledRotations={[false, true, false]}
      onCollisionEnter={handleCollision}
      friction={2}
    >
      {/* Simple Car Model */}
      <mesh castShadow>
        <boxGeometry args={[1.5, 0.5, 3]} />
        <meshStandardMaterial color="#f87171" /> {/* Reddish car */}
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 0.5, 1.5]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} />
      </mesh>

      {/* Wheels */}
      {[
        [-0.8, -0.2, 1], [0.8, -0.2, 1],
        [-0.8, -0.2, -1], [0.8, -0.2, -1]
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />
          <meshStandardMaterial color="black" />
        </mesh>
      ))}
    </RigidBody>
  );
};
