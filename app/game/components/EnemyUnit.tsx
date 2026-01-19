import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, useMemo } from "react";
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
  const clonedSceneRef = useRef<THREE.Object3D | null>(null);
  const lastPositionRef = useRef(new THREE.Vector3(...spawnPosition));
  const stuckFrameCountRef = useRef(0);
  const frameCountRef = useRef(0);

  // Clone scene once and store in ref
  useMemo(() => {
    if (scene && !clonedSceneRef.current) {
      clonedSceneRef.current = scene.clone();
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;
    if (!playerPositionRef.current) return;

    frameCountRef.current++;
    const rigidBody = rigidBodyRef.current;
    const pos = rigidBody.translation();
    const enemyPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    
    // Update position for parent component
    onPositionUpdate(enemyPos);

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

    // Get velocities
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);
    const forwardSpeed = vel.dot(forwardDir);
    const currentSpeed = vel.length();

    // === STUCK DETECTION (disabled for first 3 seconds) ===
    const distanceMoved = enemyPos.distanceTo(lastPositionRef.current);
    
    // Only check stuck detection after 3 seconds (180 frames at 60fps)
    if (frameCountRef.current > 180) {
      if (currentSpeed < 1.5 && distanceMoved < 0.1) {
        stuckFrameCountRef.current++;
      } else {
        stuckFrameCountRef.current = 0;
      }
    }
    
    const isStuck = stuckFrameCountRef.current > 120;
    lastPositionRef.current.copy(enemyPos);

    // Calculate direction to player
    const playerPos = playerPositionRef.current;
    const dirToPlayer = new THREE.Vector3(
      playerPos.x - enemyPos.x,
      0,
      playerPos.z - enemyPos.z
    );
    const distanceToPlayer = dirToPlayer.length();

    // === LATERAL FRICTION ===
    const lateralVel = vel.dot(rightDir);
    const frictionForce = -lateralVel * GAME_CONFIG.lateralFriction;
    rigidBody.applyImpulse(
      rightDir.clone().multiplyScalar(frictionForce * rigidBody.mass()),
      true
    );

    // === SIMPLE CHASING BEHAVIOR ===
    // Drive toward player at full power
    const driveForce = isStuck ? 0.6 : 1.5; // Much stronger drive force
    
    if (distanceToPlayer > 1.5) {
      rigidBody.applyImpulse(
        forwardDir
          .clone()
          .multiplyScalar(GAME_CONFIG.driveSpeed * driveForce * rigidBody.mass() * delta * 60),
        true
      );
    }

    // Gentle steering toward player
    if (distanceToPlayer > 0.5) {
      dirToPlayer.normalize();
      const steerCross = new THREE.Vector3().crossVectors(forwardDir, dirToPlayer);
      const steerAmount = steerCross.y > 0 ? 1 : -1;
      
      // Moderate steering - not too weak, not too fast
      const turnSpeed = GAME_CONFIG.turnSpeed * delta * 0.35;
      const steerTorque = new THREE.Vector3(0, steerAmount * turnSpeed, 0);
      rigidBody.applyTorqueImpulse(
        steerTorque.multiplyScalar(rigidBody.mass()),
        true
      );
    }

    // === SPEED LIMIT ===
    if (currentSpeed > GAME_CONFIG.maxSpeed) {
      const limitedVel = vel
        .clone()
        .normalize()
        .multiplyScalar(GAME_CONFIG.maxSpeed);
      rigidBody.setLinvel(limitedVel, true);
    }

    // === BOUNDARY CHECK (prevent flying or going too far out) ===
    const mapHalf = GAME_CONFIG.mapSize / 2;
    const wallMargin = 2;
    
    // If approaching boundary, reduce forward velocity
    let boundaryPenalty = 1;
    if (enemyPos.x > mapHalf - wallMargin) boundaryPenalty = 0.3;
    if (enemyPos.x < -mapHalf + wallMargin) boundaryPenalty = 0.3;
    if (enemyPos.z > mapHalf - wallMargin) boundaryPenalty = 0.3;
    if (enemyPos.z < -mapHalf + wallMargin) boundaryPenalty = 0.3;
    if (enemyPos.y > 5) boundaryPenalty = 0; // Stop upward velocity
    if (enemyPos.y < 1) boundaryPenalty = 0; // Stop downward velocity
    
    // Apply penalty by clamping forward velocity
    if (boundaryPenalty < 1) {
      const newVel = vel.clone().multiplyScalar(boundaryPenalty);
      rigidBody.setLinvel(newVel, true);
    }

    // === DUST EMISSION ===
    const absForwardSpeed = Math.abs(forwardSpeed);
    if (
      absForwardSpeed > GAME_CONFIG.dustSpeedThreshold &&
      Math.random() < GAME_CONFIG.dustEmissionChance
    ) {
      const rearPos = enemyPos
        .clone()
        .add(forwardDir.clone().multiplyScalar(GAME_CONFIG.dustRearOffset));

      const leftWheel = rearPos
        .clone()
        .add(rightDir.clone().multiplyScalar(-GAME_CONFIG.dustWidthOffset));
      leftWheel.y += GAME_CONFIG.dustYOffset;

      const rightWheel = rearPos
        .clone()
        .add(rightDir.clone().multiplyScalar(GAME_CONFIG.dustWidthOffset));
      rightWheel.y += GAME_CONFIG.dustYOffset;

      dustRef.current?.emit(leftWheel);
      dustRef.current?.emit(rightWheel);
    }
  });

  if (!clonedSceneRef.current) {
    return null;
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={spawnPosition}
      colliders="cuboid"
      mass={GAME_CONFIG.carMass}
      linearDamping={GAME_CONFIG.linearDamping}
      angularDamping={GAME_CONFIG.angularDamping}
      friction={GAME_CONFIG.carFriction}
      collisionGroups={0x00020002}
    >
      <primitive object={clonedSceneRef.current} scale={GAME_CONFIG.carScale} />
    </RigidBody>
  );
}
