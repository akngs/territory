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
 * @param playerIndex Zero-based player index (0-4 for max 5 players)
 * @returns Single character player ID ('a' for index 0, 'b' for index 1, etc.)
 */
export function getPlayerIdChar(playerIndex: number): string {
  return String.fromCharCode(PLAYER_ID_BASE_CHAR_CODE + playerIndex);
}

/**
 * Format a single square as compact string
 * @returns Formatted string in format "NNNp?" (NNN=units, p=player, ?=type)
 */
function formatSquare(square: GridSquare): string {
  return `${square.units.toString().padStart(3, '0')}${square.playerId}${square.isResource ? RESOURCE_MARKER : NORMAL_MARKER}`;
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
 */
export function serializeGrid(grid: GridSquare[][]): GridState {
  const mapSize = grid.length;
  const rows: string[] = [];

  for (let y = 0; y < mapSize; y++) {
    rows.push(Array.from({ length: mapSize }, (_, x) => formatSquare(grid[x][y])).join('|'));
  }

  return rows.join('\n');
}

/**
 * Parse a compact grid string into a 2D array
 * @throws {Error} If grid format is invalid
 */
export function parseGrid(gridState: GridState): GridSquare[][] {
  if (!gridState?.trim()) {
    throw new Error('Invalid grid: empty state');
  }

  const rows = gridState.split('\n');
  const mapSize = rows.length;
  const grid: GridSquare[][] = Array.from({ length: mapSize }, () => []);

  for (let y = 0; y < mapSize; y++) {
    const squares = rows[y].split('|');

    if (squares.length !== mapSize) {
      throw new Error(
        `Invalid grid: row ${y} has ${squares.length} squares but expected ${mapSize} (non-square grid)`
      );
    }

    for (let x = 0; x < mapSize; x++) {
      const square = squares[x];

      if (square.length !== 5) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid format "${square}" (expected 5 characters)`
        );
      }

      const units = parseInt(square.slice(0, 3), 10);
      const typeMarker = square[4];

      if (isNaN(units)) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid unit count "${square.slice(0, 3)}"`
        );
      }

      if (typeMarker !== RESOURCE_MARKER && typeMarker !== NORMAL_MARKER) {
        throw new Error(
          `Invalid grid: square at (${x},${y}) has invalid type marker "${typeMarker}" (expected ${RESOURCE_MARKER} or ${NORMAL_MARKER})`
        );
      }

      grid[x][y] = {
        units,
        playerId: square[3],
        isResource: typeMarker === RESOURCE_MARKER,
      };
    }
  }

  return grid;
}

/**
 * Get square at coordinate from grid
 * @returns Grid square at coordinate, or null if out of bounds
 */
export function getSquare(grid: GridSquare[][], coord: Coordinate): GridSquare | null {
  const { x, y } = coord;
  return x >= 0 && x < grid.length && y >= 0 && y < grid[x]?.length ? grid[x][y] : null;
}

/**
 * Create a deep copy of a grid
 * @param grid Grid to copy
 * @returns New grid with copied squares
 */
export function copyGrid(grid: GridSquare[][]): GridSquare[][] {
  const mapSize = grid.length;
  const newGrid: GridSquare[][] = [];
  for (let x = 0; x < mapSize; x++) {
    newGrid[x] = grid[x].map((square) => ({ ...square }));
  }
  return newGrid;
}

/**
 * Iterate over all grid squares
 * @param grid Grid to iterate
 * @param callback Function to call for each square with (square, x, y)
 */
export function forEachGridSquare(
  grid: GridSquare[][],
  callback: (square: GridSquare, x: number, y: number) => void
): void {
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      callback(grid[x][y], x, y);
    }
  }
}

/**
 * Map over all grid squares to create a new grid
 * @param grid Grid to map
 * @param callback Function to transform each square
 * @returns New grid with transformed squares
 */
export function mapGridSquares(
  grid: GridSquare[][],
  callback: (square: GridSquare, x: number, y: number) => GridSquare
): GridSquare[][] {
  const result: GridSquare[][] = [];
  for (let x = 0; x < grid.length; x++) {
    result[x] = [];
    for (let y = 0; y < grid[x].length; y++) {
      result[x][y] = callback(grid[x][y], x, y);
    }
  }
  return result;
}

/**
 * Find all grid squares matching a condition
 * @param grid Grid to search
 * @param predicate Function to test each square
 * @returns Array of matching squares with their coordinates
 */
export function findGridSquares(
  grid: GridSquare[][],
  predicate: (square: GridSquare, x: number, y: number) => boolean
): Array<{ square: GridSquare; x: number; y: number }> {
  const results = [];
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      if (predicate(grid[x][y], x, y)) {
        results.push({ square: grid[x][y], x, y });
      }
    }
  }
  return results;
}
