import type { GridSquare } from '../grid-utils.ts';
import type { Movement } from './movement.ts';
import { NEUTRAL_PLAYER_ID } from '../grid-utils.ts';

/**
 * Resolve combat for a single square
 */
function resolveSquareCombat(forces: Map<string, number>): { units: number; playerId: string } {
  if (forces.size === 0) {
    return { units: 0, playerId: NEUTRAL_PLAYER_ID };
  }

  if (forces.size === 1) {
    const entry = forces.entries().next().value as [string, number];
    const [playerId, units] = entry;
    return { units, playerId };
  }

  // Multiple players - combat!
  // Sort players by unit count in descending order (highest first)
  const sorted = Array.from(forces.entries()).sort((a, b) => b[1] - a[1]);

  // Combat formula: Winner keeps (their units - runner-up's units)
  // Example: If Player A has 10 units and Player B has 7 units,
  // Player A wins with 10 - 7 = 3 remaining units
  const remainingUnits = sorted[0][1] - sorted[1][1];

  // If remaining units > 0, the player with most units wins
  // If remaining units = 0 (tie), the square becomes neutral with 0 units
  return remainingUnits > 0
    ? { units: remainingUnits, playerId: sorted[0][0] }
    : { units: 0, playerId: NEUTRAL_PLAYER_ID };
}

/**
 * Resolve combat for all squares after movements
 * Returns new grid with combat resolved
 *
 * Combat rules:
 * - Single player in square: they control it with all their units
 * - Multiple players: highest count wins, keeping (1st - 2nd) units
 * - Tie for first place: all units destroyed, square becomes neutral
 *
 * @param grid Grid after source deductions but before movements applied to destinations
 * @param movements All movements to apply
 * @returns New grid with combat resolved
 */
export function resolveCombat(grid: GridSquare[][], movements: Movement[]): GridSquare[][] {
  // Build forces map for each square
  const forcesGrid: Map<string, number>[][] = grid.map((col) =>
    col.map((square) => {
      const forces = new Map<string, number>();
      if (square.playerId !== NEUTRAL_PLAYER_ID) {
        forces.set(square.playerId, square.units);
      }
      return forces;
    })
  );

  // Add movements to destination squares
  for (const move of movements) {
    const forces = forcesGrid[move.to.x][move.to.y];
    forces.set(move.playerId, (forces.get(move.playerId) || 0) + move.units);
  }

  // Resolve combat for all squares
  return grid.map((col, x) =>
    col.map((square, y) => {
      const { units, playerId } = resolveSquareCombat(forcesGrid[x][y]);
      return { units, playerId, isResource: square.isResource };
    })
  );
}
