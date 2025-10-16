import type { Coordinate, GridState } from './types.ts';

/**
 * ASCII code for lowercase 'a' - base for player ID conversion
 */
const PLAYER_ID_BASE_CHAR_CODE = 97;

/**
 * Neutral square player ID marker
 */
export const NEUTRAL_PLAYER_ID = '.';

/**
 * Resource square marker in serialized format
 */
export const RESOURCE_MARKER = '+';

/**
 * Normal square marker in serialized format
 */
export const NORMAL_MARKER = '.';

/**
 * Grid representation for building and manipulation
 * Coordinates: grid[x][y] where x=column (0=left), y=row (0=top)
 */
export interface GridSquare {
  units: number;
  playerId: string; // NEUTRAL_PLAYER_ID for neutral, 'a'-'z' for players
  isResource: boolean;
}

/**
 * Convert player index to single character ID
 * @param playerIndex Zero-based player index (0-19 for max 20 players)
 * @returns Single character player ID ('a' for index 0, 'b' for index 1, etc.)
 */
export function getPlayerIdChar(playerIndex: number): string {
  return String.fromCharCode(PLAYER_ID_BASE_CHAR_CODE + playerIndex);
}

/**
 * Format a single square as compact string
 * @param square Grid square to format
 * @returns Formatted string in format "NNp?" (NN=units, p=player, ?=type)
 */
function formatSquare(square: GridSquare): string {
  const units = square.units.toString().padStart(2, '0');
  const player = square.playerId;
  const resource = square.isResource ? RESOURCE_MARKER : NORMAL_MARKER;
  return `${units}${player}${resource}`;
}

/**
 * Create an empty grid builder
 * @param mapSize Dimensions of the square grid
 * @returns Empty grid with all neutral squares
 */
export function createEmptyGridBuilder(mapSize: number): GridSquare[][] {
  const grid: GridSquare[][] = [];
  for (let x = 0; x < mapSize; x++) {
    grid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      grid[x][y] = {
        units: 0,
        playerId: NEUTRAL_PLAYER_ID,
        isResource: false,
      };
    }
  }
  return grid;
}

/**
 * Place units for a player at a coordinate
 * @param grid Grid to modify
 * @param coord Target coordinate
 * @param playerId Player ID (single character)
 * @param unitCount Number of units to place
 */
export function placeUnits(
  grid: GridSquare[][],
  coord: Coordinate,
  playerId: string,
  unitCount: number
): void {
  grid[coord.x][coord.y].units = unitCount;
  grid[coord.x][coord.y].playerId = playerId;
}

/**
 * Mark a square as a resource square
 * @param grid Grid to modify
 * @param coord Target coordinate
 */
export function markResourceSquare(grid: GridSquare[][], coord: Coordinate): void {
  grid[coord.x][coord.y].isResource = true;
}

/**
 * Serialize grid builder to compact string format
 * @param grid Grid to serialize
 * @returns Compact string representation
 */
export function serializeGrid(grid: GridSquare[][]): GridState {
  const rows: string[] = [];
  const mapSize = grid.length;

  for (let y = 0; y < mapSize; y++) {
    const squares: string[] = [];
    for (let x = 0; x < mapSize; x++) {
      squares.push(formatSquare(grid[x][y]));
    }
    rows.push(squares.join('|'));
  }

  return rows.join('\n');
}

/**
 * Parse a compact grid string into a 2D array
 * @param gridState Serialized grid state string
 * @returns Parsed 2D grid array
 * @throws {Error} If grid format is invalid
 */
export function parseGrid(gridState: GridState): GridSquare[][] {
  if (!gridState || gridState.trim().length === 0) {
    throw new Error('Invalid grid: empty state');
  }

  const rows = gridState.split('\n');
  const mapSize = rows.length;

  if (mapSize === 0) {
    throw new Error('Invalid grid: no rows found');
  }

  const grid: GridSquare[][] = [];

  for (let x = 0; x < mapSize; x++) {
    grid[x] = [];
  }

  for (let y = 0; y < mapSize; y++) {
    const squares = rows[y].split('|');

    if (squares.length !== mapSize) {
      throw new Error(
        `Invalid grid: row ${y} has ${squares.length} squares but expected ${mapSize} (non-square grid)`
      );
    }

    for (let x = 0; x < mapSize; x++) {
      const square = squares[x];

      if (square.length !== 4) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid format "${square}" (expected 4 characters)`
        );
      }

      // Format: "NNp?" where NN=units (2 digits), p=player, ?=type (+/.)
      const units = parseInt(square.slice(0, 2), 10);
      const playerId = square[2];
      const isResource = square[3] === RESOURCE_MARKER;

      if (isNaN(units)) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid unit count "${square.slice(0, 2)}"`
        );
      }

      if (square[3] !== RESOURCE_MARKER && square[3] !== NORMAL_MARKER) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid type marker "${square[3]}" (expected ${RESOURCE_MARKER} or ${NORMAL_MARKER})`
        );
      }

      grid[x][y] = {
        units,
        playerId,
        isResource,
      };
    }
  }

  return grid;
}

/**
 * Get square at coordinate from grid
 * @param grid Grid to read from
 * @param coord Coordinate to access
 * @returns Grid square at coordinate, or null if out of bounds
 */
export function getSquare(grid: GridSquare[][], coord: Coordinate): GridSquare | null {
  if (coord.x < 0 || coord.x >= grid.length || coord.y < 0 || coord.y >= grid.length) {
    return null;
  }
  return grid[coord.x][coord.y];
}
