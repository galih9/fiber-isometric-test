import { Wall } from "./Wall";
import { GAME_CONFIG } from "../constants/gameConfig";

export function Track() {
  const { trackLength, trackWidth, wallHeight, wallThickness } = GAME_CONFIG;
  const halfLength = trackLength / 2;
  const halfWidth = trackWidth / 2;
  // Make the track distinct from the outer map bound
  // Inner Loop
  const innerWidth = trackWidth;
  const innerLength = trackLength - 20; // Slightly shorter inner loop to create track width

  // We need to create an "O" shape.
  // We can do this with 4 Outer Walls and 4 Inner Walls (defining the "Island")

  // Actually, a simple rectangle track means we have an outer boundary and an inner island.
  // The "MapSize" in config was 100, so we have space.

  const outerX = 45;
  const outerZ = 30;

  const innerX = 20;
  const innerZ = 10;

  return (
    <>
      {/* Outer Boundary */}
      {/* Long sides */}
      <Wall
        position={[0, wallHeight / 2, -outerZ]}
        args={[outerX * 2, wallHeight, wallThickness]}
      />
      <Wall
        position={[0, wallHeight / 2, outerZ]}
        args={[outerX * 2, wallHeight, wallThickness]}
      />
      {/* Short sides */}
      <Wall
        position={[-outerX, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, outerZ * 2]}
      />
      <Wall
        position={[outerX, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, outerZ * 2]}
      />

      {/* Inner Island (The hole in the donut) */}
      {/* Long sides */}
      <Wall
        position={[0, wallHeight / 2, -innerZ]}
        args={[innerX * 2, wallHeight, wallThickness]}
      />
      <Wall
        position={[0, wallHeight / 2, innerZ]}
        args={[innerX * 2, wallHeight, wallThickness]}
      />
      {/* Short sides */}
      <Wall
        position={[-innerX, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, innerZ * 2]}
      />
      <Wall
        position={[innerX, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, innerZ * 2]}
      />

      {/* Start/Finish Line Visual (Non-colliding, just a flat box on ground) */}
      <mesh position={[0, 0.05, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, outerZ - innerZ]} />
        <meshStandardMaterial color="white" side={2} /> {/* DoubleSide = 2 */}
      </mesh>
      <mesh position={[0.5, 0.06, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, outerZ - innerZ]} />
        <meshStandardMaterial color="black" side={2} />
      </mesh>
    </>
  );
}
