import type { GridSquare } from '../grid-utils.ts';
import type { Movement } from './movement.ts';
import { NEUTRAL_PLAYER_ID } from '../grid-utils.ts';

/**
 * Square state during combat resolution with forces accumulation
 */
interface CombatSquare {
  units: number;
  playerId: string;
  isResource: boolean;
  forces: Map<string, number>; // Accumulates units from all movements
}

/**
 * Resolve combat for a single square
 */
function resolveSquareCombat(forces: Map<string, number>): { units: number; playerId: string } {
  if (forces.size === 0) {
    return { units: 0, playerId: NEUTRAL_PLAYER_ID };
  }

  if (forces.size === 1) {
    // Single player - no combat
    const entry = forces.entries().next().value;
    if (entry) {
      const [playerId, units] = entry;
      return { units, playerId };
    }
    return { units: 0, playerId: NEUTRAL_PLAYER_ID };
  }

  // Multiple players - combat!
  const sorted = Array.from(forces.entries()).sort((a, b) => b[1] - a[1]);
  const [firstPlayer, firstUnits] = sorted[0];
  const [, secondUnits] = sorted[1];
  const remainingUnits = firstUnits - secondUnits;

  if (remainingUnits > 0) {
    return { units: remainingUnits, playerId: firstPlayer };
  }

  // Tie - square becomes neutral
  return { units: 0, playerId: NEUTRAL_PLAYER_ID };
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
  const mapSize = grid.length;

  // Create combat grid with forces map for each square
  const combatGrid: CombatSquare[][] = grid.map((col) =>
    col.map((square) => {
      const forces = new Map<string, number>();
      if (square.playerId !== NEUTRAL_PLAYER_ID) {
        forces.set(square.playerId, square.units);
      }
      return { ...square, forces };
    })
  );

  // Apply all movements - add to destination squares
  for (const move of movements) {
    const dest = combatGrid[move.to.x][move.to.y];
    const currentForce = dest.forces.get(move.playerId) || 0;
    dest.forces.set(move.playerId, currentForce + move.units);
  }

  // Resolve combat and convert back to regular grid
  const newGrid: GridSquare[][] = [];
  for (let x = 0; x < mapSize; x++) {
    newGrid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      const combatSquare = combatGrid[x][y];
      const { units, playerId } = resolveSquareCombat(combatSquare.forces);
      newGrid[x][y] = { units, playerId, isResource: combatSquare.isResource };
    }
  }

  return newGrid;
}
