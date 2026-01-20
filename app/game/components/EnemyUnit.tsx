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
  onProgressUpdate?: (progress: {
    id: string;
    lap: number;
    checkpointsPassed: number;
    nextWaypointIndex: number;
    distanceToNext: number;
  }) => void;
  isRacing: boolean;
}

export function EnemyUnit({
  id,
  spawnPosition,
  dustRef,
  onPositionUpdate,
  onProgressUpdate,
  isRacing,
}: EnemyUnitProps) {
  const { scene } = useGLTF("/assets/cars/van.glb");
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // AI State
  const currentWaypointIndexRef = useRef(0);
  const checkpointsPassedRef = useRef(0);
  const currentLapRef = useRef(1);
  const isFinishedRef = useRef(false);

  // Stuck Detection functionality
  const [aiState, setAiState] = useState<"RACING" | "REVERSING">("RACING");
  const stuckTimerRef = useRef(0);
  const reverseTimerRef = useRef(0);
  const lastPosRef = useRef(
    new THREE.Vector3(spawnPosition[0], spawnPosition[1], spawnPosition[2]),
  );

  // Clone scene properly
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
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
    const currentIdx = currentWaypointIndexRef.current;
    const dist = enemyPos.distanceTo(targetPos);

    if (dist < 8.0) {
      const nextIdx = (currentIdx + 1) % waypoints.length;
      currentWaypointIndexRef.current = nextIdx;
      checkpointsPassedRef.current += 1;

      // Check for Lap Completion
      // Use the same formula as Player: Math.floor((checkpointsPassed - 1) / totalWaypoints) + 1
      const newLap =
        Math.floor((checkpointsPassedRef.current - 1) / waypoints.length) + 1;

      if (newLap > currentLapRef.current) {
        currentLapRef.current = newLap;
        if (currentLapRef.current > GAME_CONFIG.totalLaps) {
          isFinishedRef.current = true;
        }
      }

      targetCoords = waypoints[nextIdx];
      targetPos.set(targetCoords[0], targetCoords[1], targetCoords[2]);
    }

    // Stop if finished
    if (isFinishedRef.current) {
      if (currentSpeed > 0.1) {
        const brakeForce = forwardDir
          .clone()
          .multiplyScalar(10 * rigidBody.mass() * delta);
        rigidBody.applyImpulse(brakeForce, true);
        rigidBody.setLinvel(new THREE.Vector3(0, 0, 0), true);
      }
      return;
    }

    // Report Progress
    if (onProgressUpdate) {
      onProgressUpdate({
        id,
        lap: currentLapRef.current,
        checkpointsPassed: checkpointsPassedRef.current,
        nextWaypointIndex: currentWaypointIndexRef.current,
        distanceToNext: dist,
      });
    }

    // === STUCK DETECTION ===
    if (aiState === "RACING") {
      // If speed is very low, increment stuck timer
      if (currentSpeed < 1.0) {
        stuckTimerRef.current += delta;
      } else {
        stuckTimerRef.current = Math.max(0, stuckTimerRef.current - delta);
      }

      // Trigger reverse if stuck for too long (e.g., 1 second)
      if (stuckTimerRef.current > 1.0) {
        setAiState("REVERSING");
        stuckTimerRef.current = 0;
        reverseTimerRef.current = 1.0; // Reverse for 1.0 second
      }
    } else if (aiState === "REVERSING") {
      reverseTimerRef.current -= delta;
      if (reverseTimerRef.current <= 0) {
        setAiState("RACING");
        stuckTimerRef.current = 0; // Reset stuck timer so we don't immediately get stuck again
      }
    }

    // === NAVIGATION LOGIC ===

    // Calculate Direction to Target
    const dirToTarget = new THREE.Vector3().subVectors(targetPos, enemyPos);
    dirToTarget.y = 0; // Ignore height
    dirToTarget.normalize();

    // Alignment and Steering
    const steerCross = new THREE.Vector3().crossVectors(
      forwardDir,
      dirToTarget,
    );
    // Proportional steering
    // Clamp steerAmount to -1 to 1 range
    // Multiply by sensitivity to make it turn sharpler when needed
    const steerSensitivity = 3.5; // Increased from 2.0
    let steerAmount = THREE.MathUtils.clamp(
      steerCross.y * steerSensitivity,
      -1,
      1,
    );

    // Dot product for alignment (1 = facing target, -1 = facing away)
    const alignment = forwardDir.dot(dirToTarget);

    let throttle = 0;

    if (aiState === "REVERSING") {
      // Reverse Logic
      // Steer opposite to where we wanted to go to "back out" of a turn?
      // Or just steer straight? Let's steer opposite to the target to re-orient
      steerAmount = -steerAmount;
      throttle = -0.8; // Reverse throttle
    } else {
      // Racing Logic
      throttle = 1.0;

      // Slow down for corners
      if (Math.abs(steerAmount) > 0.5) {
        throttle = 0.6; // Slow down when turning hard
      }

      // If we are facing away from target, we might need a sharper turn or slower speed
      if (alignment < 0) {
        throttle = 0.4; // Very slow speed for U-turns
      }
    }

    // Apply Steering Torque
    const turnSpeed = GAME_CONFIG.enemyTurnSpeed * delta;
    rigidBody.applyTorqueImpulse(
      new THREE.Vector3(0, steerAmount * turnSpeed * rigidBody.mass(), 0),
      true,
    );

    // Apply Throttle/Drive Force
    // Check max speed only if moving forward
    if (throttle > 0) {
      if (currentSpeed < GAME_CONFIG.enemyMaxSpeed) {
        const driveForce = forwardDir
          .clone()
          .multiplyScalar(
            throttle *
              GAME_CONFIG.enemyAcceleration *
              rigidBody.mass() *
              delta *
              60,
          );
        rigidBody.applyImpulse(driveForce, true);
      }
    } else {
      // Reversing (throttle < 0) - allow exceeding max speed checks for simple reverse logic or clamp separately
      const driveForce = forwardDir
        .clone()
        .multiplyScalar(
          throttle *
            GAME_CONFIG.enemyAcceleration *
            rigidBody.mass() *
            delta *
            60,
        );
      rigidBody.applyImpulse(driveForce, true);
    }

    // === LATERAL FRICTION ===
    const lateralVel = vel.dot(rightDir);
    const frictionForce = -lateralVel * GAME_CONFIG.lateralFriction;
    rigidBody.applyImpulse(
      rightDir.clone().multiplyScalar(frictionForce * rigidBody.mass()),
      true,
    );

    // === DUST EMISSION ===
    if (currentSpeed > 5 && Math.random() < 0.1 && aiState === "RACING") {
      const rearPos = enemyPos
        .clone()
        .add(forwardDir.clone().multiplyScalar(-1.5));
      dustRef.current?.emit(rearPos);
    }
  });

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
        object={clonedScene}
        scale={GAME_CONFIG.enemyScale}
        rotation={[0, Math.PI, 0]} // Rotate model 180 deg to face forward (-Z)
      />
    </RigidBody>
  );
}
