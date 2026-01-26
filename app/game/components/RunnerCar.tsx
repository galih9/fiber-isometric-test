import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useKeyboardControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DustSystem, type DustSystemHandle } from "../DustSystem";

interface RunnerCarProps {
  touchInput?: { left: boolean; right: boolean };
  onCollision?: () => void;
}

export const RunnerCar = ({ touchInput, onCollision }: RunnerCarProps) => {
  const rbRef = useRef<RapierRigidBody>(null);
  const dustRef = useRef<DustSystemHandle>(null);
  const [, getKeys] = useKeyboardControls();

  const { scene } = useGLTF("/assets/cars/race.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const lastEmitTime = useRef(0);

  useFrame((state, delta) => {
    if (!rbRef.current) return;

    const keys = getKeys();
    const isLeft = keys.left || touchInput?.left;
    const isRight = keys.right || touchInput?.right;

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
    const targetSideSpeed = (isRight ? 18 : 0) + (isLeft ? -18 : 0);
    const speedDiff = targetSideSpeed - linvel.x;
    const accel = 60 * rbRef.current.mass();

    if (Math.abs(speedDiff) > 0.1) {
       rbRef.current.applyImpulse({
         x: speedDiff * accel * delta,
         y: 0,
         z: 0
       }, true);
    }

    // Hand-brake / friction when no input
    if (!isLeft && !isRight) {
      rbRef.current.applyImpulse({ x: -linvel.x * 6 * rbRef.current.mass() * delta, y: 0, z: 0 }, true);
    }

    // Camera follow (Responsive adjustments)
    const isPortrait = state.size.height > state.size.width;
    const zDist = isPortrait ? 22 : 15;
    const yDist = isPortrait ? 8 : 5;

    const cameraPosition = new THREE.Vector3(
      0,
      currentPos.y + yDist,
      currentPos.z + zDist
    );
    state.camera.position.lerp(cameraPosition, 0.1);
    state.camera.lookAt(0, currentPos.y + 1, currentPos.z - 5);

    // Dust effects
    const now = state.clock.getElapsedTime();
    if (now - lastEmitTime.current > 0.02) {
      lastEmitTime.current = now;
      if (dustRef.current) {
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
        enabledTranslations={[true, true, false]}
        enabledRotations={[false, true, false]}
        friction={0.5}
        linearDamping={0.5}
        angularDamping={0.5}
        onCollisionEnter={(e) => {
           if (e.other.rigidBodyObject?.userData?.type === 'obstacle') {
             onCollision?.();
           }
        }}
      >
        <primitive object={clonedScene} scale={1} rotation={[0, Math.PI, 0]} />
      </RigidBody>
    </>
  );
};
