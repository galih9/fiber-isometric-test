import { useFrame } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import { useRef, useMemo, useState, useCallback } from "react";
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
  onDeath,
}: EnemyUnitProps & { onDeath: (id: string) => void }) {
  const { scene } = useGLTF("/assets/cars/van.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const clonedSceneRef = useRef<THREE.Object3D | null>(null);
  const lastPositionRef = useRef(new THREE.Vector3(...spawnPosition));
  const [hp, setHp] = useState<number>(GAME_CONFIG.enemyMaxHP);

  const frameCountRef = useRef(0);

  // Clone scene once and store in ref
  useMemo(() => {
    if (scene && !clonedSceneRef.current) {
      clonedSceneRef.current = scene.clone();
      // Ensure the scene and its children cast/receive shadows if needed
      clonedSceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  const takeDamage = useCallback(
    (amount: number) => {
      setHp((prev) => {
        const newHp = Math.max(0, prev - amount);
        if (newHp <= 0) {
          onDeath(id);
        }
        return newHp;
      });
    },
    [id, onDeath],
  );

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

    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);

    // Get velocities
    const linVel = rigidBody.linvel();
    const vel = new THREE.Vector3(linVel.x, linVel.y, linVel.z);
    const forwardSpeed = vel.dot(forwardDir);
    const currentSpeed = vel.length();

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

    const driveForce = 1.5; // Much stronger drive force

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

      // Stronger steering to escape walls
      const turnSpeed = GAME_CONFIG.turnSpeed * delta * 2.0;
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

    // === BOUNDARY CHECK (physics based now) ===
    // Physics engine will handle wall collisions based on updated collision groups


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
      collisionGroups={0x00020003} // Dynamic group
      onCollisionEnter={(payload) => {
        // Simple damage logic on collision with anything dynamic (like player)
        // You might want to filter this by payload.other.rigidBodyObject.name or collision groups
        // For now, let's assume valid high impact collisions cause damage
        const impulse = payload.manifold.contactImpulse(0);
        if (impulse > 100) { // arbitrary threshold
          takeDamage(10);
        }
      }}
    >
      <primitive object={clonedSceneRef.current} scale={GAME_CONFIG.carScale} />
      <Html position={[0, 2, 0]} center>
        <div style={{ width: '50px', height: '5px', background: 'red', border: '1px solid black' }}>
          <div style={{ width: `${(hp / GAME_CONFIG.enemyMaxHP) * 100}%`, height: '100%', background: 'green' }} />
        </div>
      </Html>
    </RigidBody>
  );
}
