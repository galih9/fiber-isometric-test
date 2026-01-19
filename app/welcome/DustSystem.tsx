import { useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_PARTICLES = 100;

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
  color: THREE.Color;
};

export const DustSystem = forwardRef<DustSystemHandle, {}>((_, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Particle state data (CPU side)
  const particles = useRef<ParticleData[]>(
    Array.from({ length: MAX_PARTICLES }).map(() => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      life: 0,
      scale: 0,
      active: false,
      color: new THREE.Color(0xdddddd),
    })),
  );

  // Expose emit function
  useImperativeHandle(ref, () => ({
    emit: (
      position: THREE.Vector3,
      velocity: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    ) => {
      // Find first inactive or oldest particle
      const list = particles.current;
      let targetIndex = list.findIndex((p) => !p.active);
      if (targetIndex === -1) {
        // If all active, overwrite a random one or the oldest (random is fine for dust)
        targetIndex = Math.floor(Math.random() * MAX_PARTICLES);
      }

      const p = list[targetIndex];
      p.active = true;
      p.age = 0;
      p.life = 1.0 + Math.random() * 0.5; // 1-1.5 seconds life
      p.position.copy(position);

      // Add some randomness to emission velocity
      p.velocity
        .copy(velocity)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 2,
            (Math.random() - 0.5) * 5,
          ),
        );

      // Random scale variation
      p.scale = 0.3 + Math.random() * 0.4;
    },
  }));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let activeCount = 0;
    const list = particles.current;

    list.forEach((p, i) => {
      if (!p.active) {
        // Hide inactive particles by scaling to 0
        dummy.position.set(0, -9999, 0); // Move away
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        return;
      }

      // Update Physics
      p.age += delta;
      if (p.age >= p.life) {
        p.active = false;
        return;
      }

      // Move
      p.position.addScaledVector(p.velocity, delta);
      // Drag (slow down slightly)
      p.velocity.multiplyScalar(0.95);
      // Rise slightly
      p.position.y += 1.0 * delta;

      // Update Visuals
      const progress = p.age / p.life;
      // Scale: Pop in fast, then slowly grow or shrink? Let's grow a bit then fade.
      const currentScale =
        p.scale * (1 + progress * 0.5) * (1 - Math.pow(progress, 3)); // Fade out size at very end

      dummy.position.copy(p.position);
      dummy.scale.setScalar(currentScale);
      dummy.rotation.set(progress, progress, progress); // Some rotation
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Opacity hack: InstancedMesh doesn't support per-instance opacity easily without custom shader.
      // We can only change color. As a cheap fade, we sort of match background or just let it pop out.
      // BETTER: With MeshStandardMaterial, we can't do alpha well per instance.
      // Workaround: Scale down to 0 at the end (done above).

      activeCount++;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#888888"
        transparent
        opacity={0.6}
        roughness={1}
      />
    </instancedMesh>
  );
});
