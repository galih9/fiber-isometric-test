// Game configuration constants
export const GAME_CONFIG = {
  // Map settings
  mapSize: 100,
  wallHeight: 4,
  wallThickness: 2,
  trackWidth: 15,
  trackLength: 80,
  trackRadius: 20,

  // Car settings
  carMass: 150,
  carScale: 0.5,
  carInitialPosition: [0, 0.2, -15] as [number, number, number],
  linearDamping: 0.8,
  angularDamping: 1.5,
  carFriction: 0.5,

  // Physics settings
  gravity: [0, -20, 0] as [number, number, number],
  maxSpeed: 16.0,
  driveSpeed: 2.5, // Reduced for better control
  turnSpeed: 3.5,
  lateralFriction: 0.8,

  // Camera settings
  cameraOffset: { x: 20, y: 20, z: 20 },
  cameraZoom: 50,
  cameraNear: -100,
  cameraFar: 300,
  cameraSmoothing: 0.1,

  // Dust settings
  dustSpeedThreshold: 5.0,
  dustEmissionChance: 0.2,
  dustRearOffset: 1.2,
  dustWidthOffset: 0.6,
  dustYOffset: -0.5,

  // Obstacle settings
  obstacleScale: 3,
  obstacleMass: 5,
  obstacleFriction: 0.5,
  obstacleRestitution: 0.2,

  // Loader settings
  loaderMinDuration: 2000,

  // Racing settings
  totalLaps: 3,
  checkpointRadius: 10,

  // Enemy settings (Racers)
  enemyMass: 150, // Same as player
  enemyScale: 0.5,
  enemyMaxSpeed: 15.0, // Slightly slower than player max
  enemyAcceleration: 1.0,
  enemyTurnSpeed: 3.0,
  collisionGroupStatic: 0x00010002,
  collisionGroupDynamic: 0x00020003,
} as const;

// Racing Waypoints (Simple Oval)
// 4 corners + midpoints
export const TRACK_WAYPOINTS: [number, number, number][] = [
  [30, 0, -20], // Turn 1 entry
  [40, 0, 0], // Turn 1 apex
  [30, 0, 20], // Turn 1 exit
  [-30, 0, 20], // Turn 2 entry
  [-40, 0, 0], // Turn 2 apex
  [-30, 0, -20], // Turn 2 exit
];

// Start Positions (Grid)
export const START_POSITIONS: [number, number, number][] = [
  [0, 2, -15], // P1 (Player)
  [-5, 2, -15], // P2
  [5, 2, -15], // P3
  [-10, 2, -15], // P4
  [10, 2, -15], // P5
];
