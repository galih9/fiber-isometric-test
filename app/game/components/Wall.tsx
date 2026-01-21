import { RigidBody } from "@react-three/rapier";

interface WallProps {
  position: [number, number, number];
  args: [number, number, number];
}

export function Wall({ position, args }: WallProps) {
  return (
    <RigidBody type="fixed" position={position} colliders="cuboid">
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </RigidBody>
  );
}
