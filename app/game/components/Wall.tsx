import { RigidBody } from "@react-three/rapier";

interface WallProps {
  position: [number, number, number];
  args: [number, number, number];
}

export function Wall({ position, args }: WallProps) {
  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders="cuboid"
      collisionGroups={0x00010002} // Static group
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#777" />
      </mesh>
    </RigidBody>
  );
}
