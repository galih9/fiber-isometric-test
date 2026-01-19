import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import { GAME_CONFIG } from "../constants/gameConfig";

interface ObstacleProps {
  position: [number, number, number];
}

export function Obstacle({ position }: ObstacleProps) {
  const { scene } = useGLTF("/assets/bricks/bevel-hq-brick-1x2.glb");
  const clone = useMemo(() => scene.clone(), [scene]);

  return (
    <RigidBody
      position={position}
      mass={GAME_CONFIG.obstacleMass}
      colliders="cuboid"
      friction={GAME_CONFIG.obstacleFriction}
      restitution={GAME_CONFIG.obstacleRestitution}
    >
      <primitive object={clone} scale={GAME_CONFIG.obstacleScale} />
    </RigidBody>
  );
}
