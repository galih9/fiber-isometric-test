import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import type { DustSystemHandle } from "../DustSystem";
import { GAME_CONFIG, TRACK_WAYPOINTS } from "../constants/gameConfig";

interface EnemyUnitProps {
  id: string;
  spawnPosition: [number, number, number];
  dustRef: React.RefObject<DustSystemHandle | null>;
  onPositionUpdate: (pos: THREE.Vector3) => void;
  isRacing: boolean;
}

export function EnemyUnit({
  id,
  spawnPosition,
  dustRef,
  onPositionUpdate,
  isRacing,
}: EnemyUnitProps) {
  const { scene } = useGLTF("/assets/cars/van.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const clonedSceneRef = useRef<THREE.Object3D | null>(null);

  // AI State
  const currentWaypointIndexRef = useRef(0);

  // Clone scene once and store in ref
  useMemo(() => {
    if (scene && !clonedSceneRef.current) {
      clonedSceneRef.current = scene.clone();
      clonedSceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const rigidBody = rigidBodyRef.current;
    const pos = rigidBody.translation();
    const enemyPos = new THREE.Vector3(pos.x, pos.y, pos.z);

    // Update position for parent component
    onPositionUpdate(enemyPos);

    // Stop processing if not racing
    if (!isRacing) return;

    // Get rotation and direction vectors
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w,
    );
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);

    // Velocity
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);
    // const forwardSpeed = vel.dot(forwardDir); // Not used currently but useful for debug
    const currentSpeed = vel.length();

    // === WAYPOINT FOLLOWING ===
    const waypoints = TRACK_WAYPOINTS;
    let targetCoords = waypoints[currentWaypointIndexRef.current];
    let targetPos = new THREE.Vector3(
      targetCoords[0],
      targetCoords[1],
      targetCoords[2],
    );

    // Check if we reached the waypoint
    // Use a slightly larger radius for AI to ensure flow
    if (enemyPos.distanceTo(targetPos) < 8.0) {
      currentWaypointIndexRef.current =
        (currentWaypointIndexRef.current + 1) % waypoints.length;
      targetCoords = waypoints[currentWaypointIndexRef.current];
      targetPos.set(targetCoords[0], targetCoords[1], targetCoords[2]);
    }

    // Calculate Direction to Target
    const dirToTarget = new THREE.Vector3().subVectors(targetPos, enemyPos);
    dirToTarget.y = 0; // Ignore height
    dirToTarget.normalize();

    // Debug direction
    // console.log(id, "Forward:", forwardDir, "Target:", dirToTarget);

    // Steer
    const steerCross = new THREE.Vector3().crossVectors(
      forwardDir,
      dirToTarget,
    );
    const steerAmount = steerCross.y > 0 ? 1 : -1;
    // Calculate alignment (dot product)
    const alignment = forwardDir.dot(dirToTarget);

    // Apply Steering Torque
    // Turn faster if alignment is off
    const turnMult = alignment < 0.5 ? 2.0 : 1.0;
    const turnSpeed = GAME_CONFIG.enemyTurnSpeed * delta * turnMult;
    rigidBody.applyTorqueImpulse(
      new THREE.Vector3(0, steerAmount * turnSpeed * rigidBody.mass(), 0),
      true,
    );

    // Drive Forward
    // Slow down if taking a hard turn
    const speedMult = alignment < 0.5 ? 0.5 : 1.0;

    if (currentSpeed < GAME_CONFIG.enemyMaxSpeed * speedMult) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(
            GAME_CONFIG.enemyAcceleration * rigidBody.mass() * delta * 60,
          ),
        true,
      );
    }

    // === LATERAL FRICTION ===
    const lateralVel = vel.dot(rightDir);
    const frictionForce = -lateralVel * GAME_CONFIG.lateralFriction;
    rigidBody.applyImpulse(
      rightDir.clone().multiplyScalar(frictionForce * rigidBody.mass()),
      true,
    );

    // === DUST EMISSION ===
    // Simplified dust logic
    if (currentSpeed > 5 && Math.random() < 0.1) {
      // ... existing dust logic or simplified
      const rearPos = enemyPos
        .clone()
        .add(forwardDir.clone().multiplyScalar(-1.5));
      dustRef.current?.emit(rearPos);
    }
  });

  if (!clonedSceneRef.current) {
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={spawnPosition}
      rotation={[0, -Math.PI / 2, 0]} // Face the track
      colliders="cuboid"
      mass={GAME_CONFIG.enemyMass}
      linearDamping={GAME_CONFIG.linearDamping}
      angularDamping={GAME_CONFIG.angularDamping}
      friction={0.5}
      collisionGroups={GAME_CONFIG.collisionGroupDynamic}
    >
      <primitive
        object={clonedSceneRef.current}
        scale={GAME_CONFIG.enemyScale}
        rotation={[0, Math.PI, 0]} // Rotate model 180 deg to face forward (-Z)
      />
    </RigidBody>
  );
}
