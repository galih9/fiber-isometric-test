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

  const { scene } = useGLTF("/assets/cars/race.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const lastEmitTime = useRef(0);

  useFrame((state, delta) => {
    if (!rbRef.current) return;

    const { left, right } = getKeys();
    const currentPos = rbRef.current.translation();
    const linvel = rbRef.current.linvel();

    // Respawn if fell off
    if (currentPos.y < -5) {
      rbRef.current.setTranslation({ x: 0, y: 2, z: 0 }, true);
      rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rbRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Smoother steering using direct velocity setting or controlled impulses
    const targetSideSpeed = (right ? 20 : 0) + (left ? -20 : 0);
    const speedDiff = targetSideSpeed - linvel.x;
    const accel = 50 * rbRef.current.mass();

    if (Math.abs(speedDiff) > 0.1) {
       rbRef.current.applyImpulse({
         x: speedDiff * accel * delta,
         y: 0,
         z: 0
       }, true);
    }

    // Hand-brake / friction when no input
    if (!left && !right) {
      rbRef.current.applyImpulse({ x: -linvel.x * 5 * rbRef.current.mass() * delta, y: 0, z: 0 }, true);
    }

    // Camera follow (FIXED X position)
    // We target a position behind the car but centered
    const cameraPosition = new THREE.Vector3(
      0,
      currentPos.y + 5,
      currentPos.z + 15
    );
    state.camera.position.lerp(cameraPosition, 0.1);
    state.camera.lookAt(0, currentPos.y + 1, currentPos.z - 5);

    // Dust effects
    const now = state.clock.getElapsedTime();
    if (now - lastEmitTime.current > 0.02) {
      lastEmitTime.current = now;
      if (dustRef.current) {
        // Emit from wheels
        const offset = (Math.random() - 0.5) * 1.5;
        const carPos = new THREE.Vector3(currentPos.x + offset, currentPos.y - 0.5, currentPos.z + 1.5);
        dustRef.current.emit(carPos, new THREE.Vector3(0, 1, 10));
      }
    }
  });

  return (
    <>
      <DustSystem ref={dustRef} />
      <RigidBody
        ref={rbRef}
        colliders="cuboid"
        position={[0, 1, 0]}
        mass={1}
        enabledTranslations={[true, true, false]} // LOCK Z
        enabledRotations={[false, true, false]}     // LOCK X/Z Rotations
        friction={0.5}
        linearDamping={0.5}
        angularDamping={0.5}
      >
        <primitive object={clonedScene} scale={1} rotation={[0, Math.PI, 0]} />
      </RigidBody>
    </>
  );
};
