import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

export const ROAD_WIDTH = 60;
export const ROAD_LENGTH = 2000;
const SPEED = 60; // Should match ObstacleManager speed

export const Road = () => {
  const scrollRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (scrollRef.current) {
      // Scroll markings backward to simulate forward motion
      scrollRef.current.position.z += SPEED * delta;
      // Reset position to loop the pattern
      if (scrollRef.current.position.z > 50) {
        scrollRef.current.position.z = 0;
      }
    }
  });

  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[ROAD_WIDTH, 1, ROAD_LENGTH]} />
          <meshStandardMaterial color="#2d1b0f" roughness={1} />
        </mesh>
      </RigidBody>

      <group ref={scrollRef}>
        {/* Side markings */}
        {[-ROAD_WIDTH / 2 + 1, ROAD_WIDTH / 2 - 1].map((x) => (
            <mesh key={x} position={[x, 0.02, 0]}>
                <boxGeometry args={[0.5, 0.01, ROAD_LENGTH]} />
                <meshStandardMaterial color="white" transparent opacity={0.5} />
            </mesh>
        ))}

        {/* Dashed center line */}
        <group position={[0, 0.02, 0]}>
            {/* Generate enough dashes to cover the visible area and allow looping */}
            {Array.from({ length: 100 }).map((_, i) => (
            <mesh key={i} position={[0, 0, -i * 50]}>
                <boxGeometry args={[0.4, 0.01, 10]} />
                <meshStandardMaterial color="white" transparent opacity={0.4} />
            </mesh>
            ))}
        </group>
      </group>
    </group>
  );
};
