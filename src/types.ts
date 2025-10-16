/**
 * Game configuration parameters
 */
export interface GameConfig {
  MIN_PLAYERS: number;
  MAX_PLAYERS: number;
  MAP_SIZE: number;
  MAX_ROUNDS: number;
  STARTING_UNITS: number;
  MAX_PLAN_LENGTH: number;
  DECLARATION_COUNT: number;
  MAX_COMMANDS_PER_ROUND: number;
  RESOURCE_SQUARE_PCT: number;
  BASE_PRODUCTION: number;
  RESOURCE_PRODUCTION: number;
  PRODUCTION_CAP: number;
  ROUND_DURATION_HOURS: number;
}

/**
 * Default game configuration from rulebook
 */
export const DEFAULT_CONFIG: GameConfig = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 20,
  MAP_SIZE: 15,
  MAX_ROUNDS: 15,
  STARTING_UNITS: 5,
  MAX_PLAN_LENGTH: 200,
  DECLARATION_COUNT: 2,
  MAX_COMMANDS_PER_ROUND: 3,
  RESOURCE_SQUARE_PCT: 5,
  BASE_PRODUCTION: 1,
  RESOURCE_PRODUCTION: 2,
  PRODUCTION_CAP: 21,
  ROUND_DURATION_HOURS: 24,
};

/**
 * Coordinate on the game grid
 */
export interface Coordinate {
  x: number;
  y: number;
}

/**
 * A single square on the map
 */
export interface Square {
  coordinate: Coordinate;
  isResource: boolean;
  units: { [playerId: string]: number }; // playerId -> unit count
  controller: string | null; // playerId or null if neutral
}

/**
 * Grid state
 */
export type GridState = Square[][];

/**
 * Direction for movement commands
 */
export type Direction = 'U' | 'D' | 'L' | 'R';

/**
 * A movement command
 */
export interface Command {
  from: Coordinate;
  direction: Direction;
  unitCount: number;
}

/**
 * Player's declaration (plan)
 */
export interface Declaration {
  playerId: string;
  text: string;
  declarationNumber: number; // 1 or 2
}

/**
 * Player information
 */
export interface Player {
  id: string;
  name: string;
  startingSquare: Coordinate;
  isEliminated: boolean;
}

/**
 * Player statistics for a round
 */
export interface PlayerStats {
  playerId: string;
  totalUnits: number;
  controlledSquares: number;
}

/**
 * A single round's complete record
 */
export interface RoundRecord {
  roundNumber: number;
  declarations: Declaration[];
  commands: { [playerId: string]: Command[] };
  gridStateBefore: GridState;
  gridStateAfter: GridState;
  playerStats: PlayerStats[];
  events: string[]; // Notable events (combat, eliminations, etc.)
}

/**
 * Game end condition
 */
export type EndCondition = 'domination' | 'annihilation' | 'timeout' | null;

/**
 * Complete game state
 */
export interface GameState {
  gameId: string;
  config: GameConfig;
  numPlayers: number;
  players: Player[];
  initialGrid: GridState;
  currentRound: number;
  rounds: RoundRecord[];
  endCondition: EndCondition;
}
