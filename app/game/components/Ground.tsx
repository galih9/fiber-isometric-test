import { RigidBody, CuboidCollider } from "@react-three/rapier";

export function Ground() {
  return (
    <RigidBody
      type="fixed"
      rotation={[-Math.PI / 2, 0, 0]}
      friction={1}
      colliders={false}
    >
      <CuboidCollider args={[50, 50, 1]} position={[0, 0, -1]} />
      <mesh receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </RigidBody>
  );
}
