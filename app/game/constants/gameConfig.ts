// Game configuration constants
export const GAME_CONFIG = {
  // Map settings
  mapSize: 60,
  wallHeight: 4,
  wallThickness: 2,

  // Car settings
  carMass: 150,
  carScale: 0.5,
  carInitialPosition: [0, 2, 0] as [number, number, number],
  linearDamping: 0.8,
  angularDamping: 1.5,
  carFriction: 0.5,

  // Physics settings
  gravity: [0, -20, 0] as [number, number, number],
  maxSpeed: 20.0,
  driveSpeed: 2.0,
  turnSpeed: 3.5,
  lateralFriction: 0.8,

  // Camera settings
  cameraOffset: { x: 20, y: 20, z: 20 },
  cameraZoom: 60,
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
  loaderMinDuration: 5000, // 5 seconds

  // Gameplay settings
  playerMaxHP: 100,
  collisionDamage: 20,
  damageCooldown: 1000, // 1 second between damage

  // Enemy settings
  enemyMass: 200,
  enemyScale: 0.5,
  enemyMaxSpeed: 15.0,
  enemyAcceleration: 0.8,
  enemyTurnSpeed: 2.5,
  enemySpawnDistance: 25, // Distance from center
  enemySpawnInterval: 15000, // 15 seconds in milliseconds
  enemyDespawnDistance: 35, // Distance from center to despawn enemy
} as const;

// Obstacle positions
export const OBSTACLE_POSITIONS: [number, number, number][] = [
  [5, 2, 5],
  [-5, 2, -5],
  [10, 2, -10],
  [-10, 2, 8],
  [15, 2, 2],
  [-12, 2, 12],
  [0, 2, 12],
  [8, 2, -15],
];
