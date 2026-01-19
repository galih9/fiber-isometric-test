import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import type { DustSystemHandle } from "../DustSystem";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { GAME_CONFIG } from "../constants/gameConfig";

interface CarProps {
  dustRef: React.RefObject<DustSystemHandle | null>;
  onCollision?: () => void;
  positionRef?: React.RefObject<THREE.Vector3 | null>;
  isDisabled?: boolean;
}

export function Car({
  dustRef,
  onCollision,
  positionRef,
  isDisabled,
}: CarProps) {
  const { scene } = useGLTF("/assets/cars/race.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const keys = useKeyboardControls();
  const { camera } = useThree();
  const carPosition = useRef(new THREE.Vector3());

  // Camera offset relative to the car (behind and above)
  const offset = new THREE.Vector3(
    GAME_CONFIG.cameraOffset.x,
    GAME_CONFIG.cameraOffset.y,
    GAME_CONFIG.cameraOffset.z,
  );

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    // Update position ref for enemy AI
    const pos = rigidBodyRef.current.translation();
    if (positionRef?.current) {
      positionRef.current.set(pos.x, pos.y, pos.z);
    }

    // Don't process input if disabled
    if (isDisabled) return;

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
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);

    // Get current velocities (world space)
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);

    // Lateral Friction (Tire Grip)
    const lateralVel = vel.dot(rightDir);
    const frictionImpulse = () => {
      const changeVelocity = -lateralVel * GAME_CONFIG.lateralFriction;
      return rightDir.clone().multiplyScalar(changeVelocity * rigidBody.mass());
    };

    rigidBody.applyImpulse(frictionImpulse(), true);

    // Drive Force
    if (forwardInput) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(
            -GAME_CONFIG.driveSpeed * rigidBody.mass() * delta * 60,
          ),
        true,
      );
    }
    if (backwardInput) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(
            GAME_CONFIG.driveSpeed * rigidBody.mass() * delta * 60,
          ),
        true,
      );
    }

    // Steering
    const forwardSpeed = vel.dot(forwardDir);

    // Limit max speed
    if (vel.length() > GAME_CONFIG.maxSpeed) {
      const clampedVel = vel.normalize().multiplyScalar(GAME_CONFIG.maxSpeed);
      rigidBody.setLinvel(clampedVel, true);
    }

    // Allow turning if moving
    const absSpeed = Math.abs(forwardSpeed);

    if (absSpeed > 1.0 || leftInput || rightInput) {
      const turnSpeed = GAME_CONFIG.turnSpeed * delta;
      const torque = new THREE.Vector3(0, 0, 0);

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

    const vecPos = new THREE.Vector3(pos.x, pos.y, pos.z);

    // Dust Emission
    if (
      absSpeed > GAME_CONFIG.dustSpeedThreshold &&
      Math.random() < GAME_CONFIG.dustEmissionChance
    ) {
      const rearCenter = vecPos
        .clone()
        .add(forwardDir.clone().multiplyScalar(GAME_CONFIG.dustRearOffset));

      // Left Wheel
      const leftWheel = rearCenter
        .clone()
        .add(rightDir.clone().multiplyScalar(-GAME_CONFIG.dustWidthOffset));
      leftWheel.y += GAME_CONFIG.dustYOffset;

      // Right Wheel
      const rightWheel = rearCenter
        .clone()
        .add(rightDir.clone().multiplyScalar(GAME_CONFIG.dustWidthOffset));
      rightWheel.y += GAME_CONFIG.dustYOffset;

      dustRef.current?.emit(leftWheel);
      dustRef.current?.emit(rightWheel);
    }

    // Camera Follow Logic (Stutter Fix)
    const smoothing = 1 - Math.pow(0.001, delta);
    carPosition.current.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), smoothing);

    const targetCameraPos = new THREE.Vector3(
      carPosition.current.x + offset.x,
      carPosition.current.y + offset.y,
      carPosition.current.z + offset.z,
    );

    // Smooth camera movement
    camera.position.lerp(targetCameraPos, GAME_CONFIG.cameraSmoothing);
    camera.lookAt(carPosition.current);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={GAME_CONFIG.carInitialPosition}
      colliders="cuboid"
      mass={GAME_CONFIG.carMass}
      linearDamping={GAME_CONFIG.linearDamping}
      angularDamping={GAME_CONFIG.angularDamping}
      friction={GAME_CONFIG.carFriction}
      collisionGroups={0x00020003} // Dynamic group
      onCollisionEnter={(event) => {
        // Check if collision is with enemy (group 2)
        if (onCollision) {
          onCollision();
        }
      }}
    >
      <primitive object={scene} scale={GAME_CONFIG.carScale} />
    </RigidBody>
  );
}
