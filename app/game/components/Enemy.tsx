import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody, useRapier } from "@react-three/rapier";
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
  const { rapier, world } = useRapier();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const sceneCloneRef = useRef<THREE.Object3D | null>(null);

  enum AIState {
    CHASING,
    AVOIDING_WALL,
  }

  const aiState = useRef(AIState.CHASING);
  const avoidanceTorque = useRef(0);
  const avoidanceState = useRef({
    active: false,
    startTime: 0,
    duration: GAME_CONFIG.enemyAvoidanceDuration,
  });

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

    // --- Wall Detection and State Switching ---
    const forwardRay = new rapier.Ray(enemyPos, forwardDir);
    const forwardHit = world.castRay(
      forwardRay,
      GAME_CONFIG.enemyRaycastDistance,
      true,
      undefined,
      undefined,
      rigidBody.collider(0),
    );

    const leftRayDir = new THREE.Vector3()
      .copy(forwardDir)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    const rightRayDir = new THREE.Vector3()
      .copy(forwardDir)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);

    const leftRay = new rapier.Ray(enemyPos, leftRayDir);
    const rightRay = new rapier.Ray(enemyPos, rightRayDir);

    const leftHit = world.castRay(
      leftRay,
      GAME_CONFIG.enemyRaycastDistance,
      true,
      undefined,
      undefined,
      rigidBody.collider(0),
    );
    const rightHit = world.castRay(
      rightRay,
      GAME_CONFIG.enemyRaycastDistance,
      true,
      undefined,
      undefined,
      rigidBody.collider(0),
    );

    if (forwardHit && aiState.current === AIState.CHASING) {
      aiState.current = AIState.AVOIDING_WALL;
      avoidanceState.current.active = true;
      avoidanceState.current.startTime = state.clock.getElapsedTime();

      const leftDist = leftHit ? leftHit.toi : Infinity;
      const rightDist = rightHit ? rightHit.toi : Infinity;

      // Turn towards the direction with more space
      avoidanceTorque.current = leftDist > rightDist ? 1 : -1;
    }

    // AI State Machine
    switch (aiState.current) {
      case AIState.CHASING:
        // Calculate direction to player
        const toPlayer = playerPositionRef.current.clone().sub(enemyPos);
        toPlayer.y = 0; // Keep on horizontal plane
        const distanceToPlayer = toPlayer.length();
        toPlayer.normalize();

        // Calculate steering direction
        const cross = new THREE.Vector3().crossVectors(forwardDir, toPlayer);
        const turnDirection = cross.y > 0 ? 1 : -1;

        // Calculate how aligned we are with the player
        const alignment = forwardDir.dot(toPlayer);

        // Apply steering torque
        if (distanceToPlayer > 2) {
          const turnSpeed = GAME_CONFIG.enemyTurnSpeed * delta;
          const torque = new THREE.Vector3(0, turnDirection * turnSpeed, 0);
          rigidBody.applyTorqueImpulse(
            torque.multiplyScalar(rigidBody.mass()),
            true,
          );
        }

        // Apply forward acceleration
        rigidBody.applyImpulse(
          forwardDir
            .clone()
            .multiplyScalar(
              -GAME_CONFIG.enemyAcceleration * rigidBody.mass() * delta * 60,
            ),
          true,
        );
        break;

      case AIState.AVOIDING_WALL:
        const elapsedTime =
          (state.clock.getElapsedTime() - avoidanceState.current.startTime) *
          1000;
        if (elapsedTime > avoidanceState.current.duration) {
          aiState.current = AIState.CHASING;
          avoidanceState.current.active = false;
        } else {
          // Apply the determined avoidance torque
          const avoidTurnSpeed = GAME_CONFIG.enemyTurnSpeed * delta * 1.5; // Turn faster
          const avoidTorque = new THREE.Vector3(
            0,
            avoidanceTorque.current * avoidTurnSpeed,
            0,
          );
          rigidBody.applyTorqueImpulse(
            avoidTorque.multiplyScalar(rigidBody.mass()),
            true,
          );
        }
        break;
    }

    // Lateral Friction (same as player car)
    const lateralVel = vel.dot(rightDir);
    const frictionImpulse = () => {
      const changeVelocity = -lateralVel * GAME_CONFIG.lateralFriction;
      return rightDir.clone().multiplyScalar(changeVelocity * rigidBody.mass());
    };
    rigidBody.applyImpulse(frictionImpulse(), true);

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
        <primitive
          object={sceneCloneRef.current}
          scale={GAME_CONFIG.enemyScale}
        />
      )}
    </RigidBody>
  );
}
