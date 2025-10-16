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
 * Grid state in compact string format
 *
 * Format: Each square is "NNp?" where:
 * - NN = unit count (2 digits, zero-padded)
 * - p = player ID (. for neutral, a-z for players)
 * - ? = square type (+ for resource, . for normal)
 *
 * Example: "05a+|00..|03b." represents 3 squares:
 * - 5 units, player a, resource square
 * - 0 units, neutral, normal square
 * - 3 units, player b, normal square
 *
 * Rows separated by newlines, squares by |
 */
export type GridState = string;

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
  playerId: string; // Single character: 'a', 'b', 'c', etc.
  text: string;
  declarationNumber: number; // 1 or 2
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
  initialGrid: GridState;
  currentRound: number;
  rounds: RoundRecord[];
  endCondition: EndCondition;
}
