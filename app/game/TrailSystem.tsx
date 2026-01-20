import { useRef, useMemo, useImperativeHandle, forwardRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_TRAILS = 10000;

export interface TrailSystemHandle {
  emit: (position: THREE.Vector3, rotationY: number) => void;
}

type TrailData = {
  position: THREE.Vector3;
  rotationY: number;
  age: number;
  life: number;
  active: boolean;
};

export const TrailSystem = forwardRef<TrailSystemHandle, {}>((_, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize instanceColor
  useEffect(() => {
    if (meshRef.current && !meshRef.current.instanceColor) {
      const colors = new Float32Array(MAX_TRAILS * 3);
      // Initialize with 1.0 alpha (represented in R component)
      for (let i = 0; i < MAX_TRAILS; i++) {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }
  }, []);

  const trails = useRef<TrailData[]>(
    Array.from({ length: MAX_TRAILS }).map(() => ({
      position: new THREE.Vector3(),
      rotationY: 0,
      age: 0,
      life: 0,
      active: false,
    })),
  );

  const nextIndex = useRef(0);

  useImperativeHandle(ref, () => ({
    emit: (position: THREE.Vector3, rotationY: number) => {
      const t = trails.current[nextIndex.current];
      t.active = true;
      t.age = 0;
      t.life = 3.0; // 3 seconds life
      t.position.copy(position);
      t.rotationY = rotationY;

      nextIndex.current = (nextIndex.current + 1) % MAX_TRAILS;
    },
  }));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const list = trails.current;
    list.forEach((t, i) => {
      if (!t.active) {
        dummy.position.set(0, -99, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        return;
      }

      t.age += delta;
      if (t.age >= t.life) {
        t.active = false;
        return;
      }

      const progress = t.age / t.life;
      const alpha = 0.8 * (1.0 - progress);

      dummy.position.copy(t.position);
      // Slightly above ground to avoid z-fighting
      dummy.position.y = 0.02;
      dummy.rotation.set(-Math.PI / 2, 0, t.rotationY);
      // Trail segment size
      dummy.scale.set(0.4, 0.6, 1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // We use the red component of instanceColor to store alpha
      // and keep green/blue at 0 for a black trail mark.
      meshRef.current!.setColorAt(i, new THREE.Color(alpha, 0, 0));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_TRAILS]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        transparent
        depthWrite={false}
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            `#include <color_fragment>`,
            `
            #ifdef USE_INSTANCING_COLOR
              // instanceColor.r is our alpha
              diffuseColor.rgb = vec3(0.0);
              diffuseColor.a = vInstanceColor.r;
            #endif
            `
          );
        }}
      />
    </instancedMesh>
  );
});
