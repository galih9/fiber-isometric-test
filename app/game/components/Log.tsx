import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

export const RADIUS = 300;
export const LENGTH = 60; // Short like a block of cheese

export const Log = () => {
  const rbRef = useRef<RapierRigidBody>(null);
  const rotationSpeed = 0.13;
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
          <meshStandardMaterial color="#3d2b1f" roughness={0.8} />
        </mesh>
      </group>
    </RigidBody>
  );
};
