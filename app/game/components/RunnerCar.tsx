import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DustSystem, type DustSystemHandle } from "../DustSystem";

export const RunnerCar = () => {
  const rbRef = useRef<RapierRigidBody>(null);
  const dustRef = useRef<DustSystemHandle>(null);
  const [, getKeys] = useKeyboardControls();

  // Load the car model
  const { scene } = useGLTF("/assets/cars/race.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Adjust model orientation/scale if needed
  // Usually these models are centered.

  const lastEmitTime = useRef(0);

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
    const steeringForce = 120 * rbRef.current.mass();
    if (left) {
      rbRef.current.applyImpulse({ x: -steeringForce * delta, y: 0, z: 0 }, true);
    }
    if (right) {
      rbRef.current.applyImpulse({ x: steeringForce * delta, y: 0, z: 0 }, true);
    }

    // Keep car at z=0 (compensate for any physics drift)
    const zCorrection = -currentPos.z * 50 * rbRef.current.mass();
    rbRef.current.applyImpulse({ x: 0, y: 0, z: zCorrection * delta }, true);

    // Limit X position (road is short)
    // The cylinder LENGTH is 60. So X range is -30 to 30.
    if (Math.abs(currentPos.x) > 28) {
       // Apply a strong force back or just let it fall?
       // User said "stay on the log". If they go too far they should fall.
       // But I'll add a little resistance at the edges.
       const edgeForce = (currentPos.x > 0 ? -1 : 1) * 10 * rbRef.current.mass();
       rbRef.current.applyImpulse({ x: edgeForce * delta, y: 0, z: 0 }, true);
    }

    // Camera follow (FIXED X position as requested)
    const cameraPosition = new THREE.Vector3(
      0, // Fixed X
      currentPos.y + 6,
      currentPos.z + 18 // Slightly further back
    );
    state.camera.position.lerp(cameraPosition, 0.1);

    // Look at a point at the center of the road, but at car's height
    state.camera.lookAt(0, currentPos.y + 1, currentPos.z);

    // Dust effects
    const now = state.clock.getElapsedTime();
    if (now - lastEmitTime.current > 0.05) {
      lastEmitTime.current = now;
      if (dustRef.current) {
        // Emit from back wheels approx
        const carPos = new THREE.Vector3(currentPos.x, currentPos.y - 0.5, currentPos.z);
        dustRef.current.emit(carPos, new THREE.Vector3(0, 1, 2));
      }
    }
  });

  return (
    <>
      <DustSystem ref={dustRef} />
      <RigidBody
        ref={rbRef}
        colliders="cuboid"
        position={[0, 2, 0]}
        mass={5}
        enabledRotations={[false, true, false]}
        friction={2}
      >
        <primitive object={clonedScene} scale={1} rotation={[0, Math.PI, 0]} />
      </RigidBody>
    </>
  );
};
