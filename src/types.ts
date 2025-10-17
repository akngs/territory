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
}

/**
 * Default game configuration from rulebook
 */
export const DEFAULT_CONFIG: GameConfig = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 5,
  MAP_SIZE: 8,
  MAX_ROUNDS: 15,
  STARTING_UNITS: 5,
  MAX_PLAN_LENGTH: 400,
  DECLARATION_COUNT: 2,
  MAX_COMMANDS_PER_ROUND: 3,
  RESOURCE_SQUARE_PCT: 5,
  BASE_PRODUCTION: 1,
  RESOURCE_PRODUCTION: 2,
  PRODUCTION_CAP: 21,
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
 * Format: Each square is "NNNp?" where:
 * - NNN = unit count (3 digits, zero-padded)
 * - p = player ID (. for neutral, a-z for players)
 * - ? = square type (+ for resource, . for normal)
 *
 * Example: "005a+|000..|003b." represents 3 squares:
 * - 5 units, PLAYER A, resource square
 * - 0 units, neutral, normal square
 * - 3 units, PLAYER B, normal square
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
 * A single round's complete record
 * Grid state represents the state AT THE START of the round (BEFORE commands are executed)
 * Round N's gridState = result of resolving round N-1
 *
 * Declarations: Array of strings, ordered by player (a, b, c, d, e) then by phase
 * Commands: Array of command arrays, commands[0] = player 'a', commands[1] = player 'b', etc.
 */
export interface RoundRecord {
  roundNumber: number;
  declarations: string[];
  commands: Command[][];
  gridState: GridState;
}

/**
 * Complete game state
 */
export interface GameState {
  gameId: string;
  config: GameConfig;
  numPlayers: number;
  currentRound: number;
  rounds: RoundRecord[];
  winner?: string | string[] | null; // Set when game ends: player ID string, array of player IDs (tie), null for draw (annihilation), undefined for ongoing
}
