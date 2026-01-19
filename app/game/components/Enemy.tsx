import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import type { DustSystemHandle } from "../DustSystem";
import { GAME_CONFIG } from "../constants/gameConfig";

interface EnemyUnitProps {
  id: string;
  spawnPosition: [number, number, number];
  playerPositionRef: React.RefObject<THREE.Vector3 | null>;
  dustRef: React.RefObject<DustSystemHandle | null>;
  onPositionUpdate: (pos: THREE.Vector3) => void;
}

export function EnemyUnit({
  id,
  spawnPosition,
  playerPositionRef,
  dustRef,
  onPositionUpdate,
}: EnemyUnitProps) {
  const { scene } = useGLTF("/assets/cars/van.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const sceneCloneRef = useRef<THREE.Object3D | null>(null);

  // Clone the scene for this enemy instance
  useEffect(() => {
    if (scene) {
      sceneCloneRef.current = scene.clone();
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !playerPositionRef.current) return;

    const rigidBody = rigidBodyRef.current;
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );

    // Enemy Direction Vectors
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);

    // Get current position and velocity
    const pos = rigidBody.translation();
    const enemyPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);

    // Update position for parent
    onPositionUpdate(enemyPos);

    // Calculate direction to player
    const toPlayer = playerPositionRef.current.clone().sub(enemyPos);
    toPlayer.y = 0; // Keep on horizontal plane
    const distanceToPlayer = toPlayer.length();
    toPlayer.normalize();

    // Lateral Friction (same as player car)
    const lateralVel = vel.dot(rightDir);
    const frictionImpulse = () => {
      const changeVelocity = -lateralVel * GAME_CONFIG.lateralFriction;
      return rightDir.clone().multiplyScalar(changeVelocity * rigidBody.mass());
    };
    rigidBody.applyImpulse(frictionImpulse(), true);

    // Calculate steering direction
    // Determine if player is to the left or right
    const cross = new THREE.Vector3().crossVectors(forwardDir, toPlayer);
    const turnDirection = cross.y > 0 ? 1 : -1; // Positive = turn left, negative = turn right

    // Calculate how aligned we are with the player
    const alignment = forwardDir.dot(toPlayer);

    // Apply steering torque
    if (distanceToPlayer > 2) {
      // Only steer if not too close
      const turnSpeed = GAME_CONFIG.enemyTurnSpeed * delta;
      const torque = new THREE.Vector3(0, turnDirection * turnSpeed, 0);
      rigidBody.applyTorqueImpulse(
        torque.multiplyScalar(rigidBody.mass()),
        true,
      );
    }

    // Apply forward acceleration when roughly facing the player
    if (alignment > 0.3) {
      // Only accelerate when facing somewhat toward player
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(
            -GAME_CONFIG.enemyAcceleration * rigidBody.mass() * delta * 60,
          ),
        true,
      );
    }

    // Limit max speed
    if (vel.length() > GAME_CONFIG.enemyMaxSpeed) {
      const clampedVel = vel
        .normalize()
        .multiplyScalar(GAME_CONFIG.enemyMaxSpeed);
      rigidBody.setLinvel(clampedVel, true);
    }

    // Dust Emission
    const speed = vel.length();
    if (
      speed > GAME_CONFIG.dustSpeedThreshold &&
      Math.random() < GAME_CONFIG.dustEmissionChance
    ) {
      const rearCenter = enemyPos
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
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={spawnPosition}
      colliders="cuboid"
      mass={GAME_CONFIG.enemyMass}
      linearDamping={GAME_CONFIG.linearDamping}
      angularDamping={GAME_CONFIG.angularDamping}
      friction={GAME_CONFIG.carFriction}
      collisionGroups={0x00020002} // Group 2, collides with group 2 (player)
    >
      {sceneCloneRef.current && (
        <primitive object={sceneCloneRef.current} scale={GAME_CONFIG.enemyScale} />
      )}
    </RigidBody>
  );
}
