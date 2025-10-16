import type { Coordinate, GridState } from './types.ts';

/**
 * Internal grid representation for building
 */
interface GridSquare {
  units: number;
  playerId: string; // '.' for neutral, 'a'-'z' for players
  isResource: boolean;
}

/**
 * Convert player index to single character ID
 */
export function getPlayerIdChar(playerIndex: number): string {
  return String.fromCharCode(97 + playerIndex); // 97 = 'a'
}

/**
 * Format a single square as compact string
 */
function formatSquare(square: GridSquare): string {
  const units = square.units.toString().padStart(2, '0');
  const player = square.playerId;
  const resource = square.isResource ? '+' : '.';
  return `${units}${player}${resource}`;
}

/**
 * Create an empty grid builder
 */
export function createEmptyGridBuilder(mapSize: number): GridSquare[][] {
  const grid: GridSquare[][] = [];
  for (let x = 0; x < mapSize; x++) {
    grid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      grid[x][y] = {
        units: 0,
        playerId: '.',
        isResource: false,
      };
    }
  }
  return grid;
}

/**
 * Place units for a player at a coordinate
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
 */
export function markResourceSquare(grid: GridSquare[][], coord: Coordinate): void {
  grid[coord.x][coord.y].isResource = true;
}

/**
 * Serialize grid builder to compact string format
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
 */
export function parseGrid(gridState: GridState): GridSquare[][] {
  const rows = gridState.split('\n');
  const mapSize = rows.length;
  const grid: GridSquare[][] = [];

  for (let x = 0; x < mapSize; x++) {
    grid[x] = [];
  }

  for (let y = 0; y < mapSize; y++) {
    const squares = rows[y].split('|');
    for (let x = 0; x < mapSize; x++) {
      const square = squares[x];
      // Format: "NNp?" where NN=units (2 digits), p=player, ?=type (+/.)
      const units = parseInt(square.slice(0, 2), 10);
      const playerId = square[2];
      const isResource = square[3] === '+';

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
 */
export function getSquare(grid: GridSquare[][], coord: Coordinate): GridSquare | null {
  if (coord.x < 0 || coord.x >= grid.length || coord.y < 0 || coord.y >= grid.length) {
    return null;
  }
  return grid[coord.x][coord.y];
}
