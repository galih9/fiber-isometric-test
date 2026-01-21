import { useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_PARTICLES = 200;

export interface DustSystemHandle {
  emit: (position: THREE.Vector3, velocity?: THREE.Vector3) => void;
}

type ParticleData = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  active: boolean;
};

export const DustSystem = forwardRef<DustSystemHandle, {}>((_, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useRef<ParticleData[]>(
    Array.from({ length: MAX_PARTICLES }).map(() => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      life: 0,
      scale: 0,
      active: false,
    })),
  );

  useImperativeHandle(ref, () => ({
    emit: (
      position: THREE.Vector3,
      velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    ) => {
      const list = particles.current;
      let targetIndex = list.findIndex((p) => !p.active);
      if (targetIndex === -1) {
        targetIndex = Math.floor(Math.random() * MAX_PARTICLES);
      }

      const p = list[targetIndex];
      p.active = true;
      p.age = 0;
      p.life = 0.5 + Math.random() * 0.5;
      p.position.copy(position);
      p.velocity.copy(velocity).add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 1,
            Math.random() * 2
          )
      );
      p.scale = 0.1 + Math.random() * 0.2;
    },
  }));

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    const list = particles.current;
    list.forEach((p, i) => {
      if (!p.active) {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        return;
      }

      p.age += delta;
      if (p.age >= p.life) {
        p.active = false;
        return;
      }

      p.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.96);

      const progress = p.age / p.life;
      const currentScale = p.scale * (1 - progress);

      dummy.position.copy(p.position);
      dummy.scale.setScalar(currentScale);
      dummy.rotation.set(progress * 2, progress * 2, progress * 2);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#888888"
        transparent
        opacity={0.4}
        roughness={1}
      />
    </instancedMesh>
  );
});
