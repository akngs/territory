import type { Command, Coordinate } from '../types.ts';
import { getPlayerIdChar, type GridSquare } from '../grid-utils.ts';
import { getTargetCoord } from '../utils.ts';

/**
 * A unit movement operation
 */
export interface Movement {
  from: Coordinate;
  to: Coordinate;
  playerId: string;
  units: number;
}

/**
 * Convert all player commands to movement operations
 * @param commands Array of command arrays (one per player)
 * @returns Array of all movements
 */
export function commandsToMovements(commands: Command[][]): Movement[] {
  const movements: Movement[] = [];

  for (let i = 0; i < commands.length; i++) {
    const playerId = getPlayerIdChar(i);
    const playerCommands = commands[i];
    for (const cmd of playerCommands) {
      movements.push({
        from: cmd.from,
        to: getTargetCoord(cmd.from, cmd.direction),
        playerId,
        units: cmd.unitCount,
      });
    }
  }

  return movements;
}

/**
 * Apply movements to grid, deducting units from source squares
 * Returns new grid with updated source squares
 * @param grid Current grid state
 * @param movements Array of movements to apply
 * @returns New grid with movements applied to sources
 */
export function applyMovementsFromSources(
  grid: GridSquare[][],
  movements: Movement[]
): GridSquare[][] {
  const mapSize = grid.length;
  const newGrid: GridSquare[][] = [];

  // Deep copy grid
  for (let x = 0; x < mapSize; x++) {
    newGrid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      newGrid[x][y] = { ...grid[x][y] };
    }
  }

  // Track units leaving each square
  const unitsLeaving = new Map<string, number>();

  for (const move of movements) {
    const key = `${move.from.x},${move.from.y}`;
    unitsLeaving.set(key, (unitsLeaving.get(key) || 0) + move.units);
  }

  // Deduct from source squares
  for (const [key, units] of unitsLeaving) {
    const [x, y] = key.split(',').map(Number);
    const square = newGrid[x][y];
    square.units = Math.max(0, square.units - units);

    // If all units left, square becomes neutral
    if (square.units === 0) {
      square.playerId = '.';
    }
  }

  return newGrid;
}
