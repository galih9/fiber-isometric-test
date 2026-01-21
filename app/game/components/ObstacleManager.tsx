import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';

interface Obstacle {
  id: string;
  type: 'box' | 'ramp';
  position: [number, number, number];
}

const SPAWN_Z = -150;
const DESPAWN_Z = 50;
const SPEED = 40;

const ObstacleItem = ({ obstacle, onDespawn }: { obstacle: Obstacle; onDespawn: (id: string) => void }) => {
  const rbRef = useRef<RapierRigidBody>(null);

  useFrame((_state, delta) => {
    if (!rbRef.current) return;
    const currentPos = rbRef.current.translation();
    const newZ = currentPos.z + SPEED * delta;

    if (newZ > DESPAWN_Z) {
      onDespawn(obstacle.id);
    } else {
      rbRef.current.setNextKinematicTranslation({
        x: currentPos.x,
        y: currentPos.y,
        z: newZ,
      });
    }
  });

  return (
    <RigidBody
      ref={rbRef}
      type="kinematicPosition"
      position={obstacle.position}
      colliders="cuboid"
      userData={{ type: obstacle.type }}
      rotation={obstacle.type === 'ramp' ? [-Math.PI / 12, 0, 0] : [0, 0, 0]}
    >
      {obstacle.type === 'box' ? (
        <mesh castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#d97706" /> {/* Amber/Orange */}
        </mesh>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[6, 1, 8]} />
          <meshStandardMaterial color="#16a34a" /> {/* Green */}
        </mesh>
      )}
    </RigidBody>
  );
};

export const ObstacleManager = () => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const spawnObstacle = () => {
    const type = Math.random() > 0.4 ? 'box' : 'ramp';
    const x = (Math.random() - 0.5) * 40; // Wider spawn area
    const newObstacle: Obstacle = {
      id: Math.random().toString(),
      type,
      position: [x, type === 'ramp' ? 0.2 : 1, SPAWN_Z],
    };
    setObstacles((prev) => [...prev, newObstacle]);
  };

  useEffect(() => {
    const interval = setInterval(spawnObstacle, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDespawn = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <>
      {obstacles.map((obs) => (
        <ObstacleItem key={obs.id} obstacle={obs} onDespawn={handleDespawn} />
      ))}
    </>
  );
};
