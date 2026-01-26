import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';

interface Obstacle {
  id: string;
  position: [number, number, number];
}

const SPAWN_Z = -250;
const DESPAWN_Z = 50;
const SPEED = 60;

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
      userData={{ type: 'obstacle' }}
    >
      <mesh castShadow>
        <boxGeometry args={[4, 2, 1]} /> {/* Slightly smaller obstacles for narrower road */}
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0, 0.51]}>
        <boxGeometry args={[4, 0.4, 0.1]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0, 0.6, 0.51]}>
        <boxGeometry args={[4, 0.15, 0.1]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </RigidBody>
  );
};

export const ObstacleManager = () => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const spawnObstacle = () => {
    // Road width 30. Spawn range -12 to 12
    const x = (Math.random() - 0.5) * 24;
    const newObstacle: Obstacle = {
      id: Math.random().toString(),
      position: [x, 1, SPAWN_Z],
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
