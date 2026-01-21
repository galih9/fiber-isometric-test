import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

export const RADIUS = 300;
export const LENGTH = 600;

export const Log = () => {
  const rbRef = useRef<RapierRigidBody>(null);
  const rotationSpeed = 0.13; // Match obstacle speed (approx 40 units/s)
  const rotationAngle = useRef(0);

  useFrame((_state, delta) => {
    if (rbRef.current) {
      rotationAngle.current += rotationSpeed * delta;

      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationAngle.current);

      rbRef.current.setNextKinematicRotation(quaternion);
    }
  });

  return (
    <RigidBody
      type="kinematicPosition"
      colliders="trimesh"
      position={[0, -RADIUS, 0]}
      ref={rbRef}
    >
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[RADIUS, RADIUS, LENGTH, 64]} />
          <meshStandardMaterial color="#4a2c1a" roughness={0.8} />
        </mesh>

        {/* Latitudinal strips to show rotation */}
        {Array.from({ length: 36 }).map((_, i) => (
          <group key={i} rotation={[(i / 36) * Math.PI * 2, 0, 0]}>
            <mesh position={[0, RADIUS + 0.1, 0]}>
              <boxGeometry args={[LENGTH, 0.5, 4]} />
              <meshStandardMaterial color="#2a1a0e" />
            </mesh>
          </group>
        ))}

        {/* Lane markings (at different positions along the cylinder's length) */}
        {[-20, -10, 0, 10, 20].map((xOffset) => (
           <group key={xOffset}>
             <mesh position={[0, xOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[RADIUS + 0.05, 0.1, 8, 100]} />
                <meshStandardMaterial color={xOffset === 0 ? "white" : "#6a4a3a"} transparent opacity={0.5} />
             </mesh>
           </group>
        ))}
      </group>
    </RigidBody>
  );
};
