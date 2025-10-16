import type { GameConfig } from '../types.ts';
import type { GridSquare } from '../grid-utils.ts';
import { NEUTRAL_PLAYER_ID } from '../grid-utils.ts';

/**
 * Apply production to all occupied squares
 * Returns new grid with production applied
 *
 * Production rules:
 * - Only occupied squares produce (neutral squares don't)
 * - Normal squares: +BASE_PRODUCTION units per round
 * - Resource squares: +RESOURCE_PRODUCTION units per round
 * - No production if square has >= PRODUCTION_CAP units
 *
 * @param grid Current grid state
 * @param config Game configuration
 * @returns New grid with production applied
 */
export function applyProduction(grid: GridSquare[][], config: GameConfig): GridSquare[][] {
  const mapSize = grid.length;
  const productionCap = config.PRODUCTION_CAP;
  const baseProduction = config.BASE_PRODUCTION;
  const resourceProduction = config.RESOURCE_PRODUCTION;

  const newGrid: GridSquare[][] = [];

  for (let x = 0; x < mapSize; x++) {
    newGrid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      const square = grid[x][y];

      // Only produce on occupied squares below production cap
      if (square.playerId !== NEUTRAL_PLAYER_ID && square.units < productionCap) {
        const production = square.isResource ? resourceProduction : baseProduction;
        newGrid[x][y] = {
          ...square,
          units: Math.min(productionCap, square.units + production),
        };
      } else {
        // Neutral or at cap - no production
        newGrid[x][y] = { ...square };
      }
    }
  }

  return newGrid;
}

/**
 * Calculate total units for each player across the grid
 * @param grid Current grid state
 * @param numPlayers Number of players in the game
 * @returns Map of player ID to total unit count
 */
export function calculatePlayerUnits(
  grid: GridSquare[][],
  numPlayers: number
): Map<string, number> {
  const units = new Map<string, number>();
  const mapSize = grid.length;

  // Initialize all players with 0
  for (let i = 0; i < numPlayers; i++) {
    const playerId = String.fromCharCode(97 + i); // 'a' + i
    units.set(playerId, 0);
  }

  // Count units in single pass
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const square = grid[x][y];
      if (square.playerId !== NEUTRAL_PLAYER_ID) {
        const current = units.get(square.playerId) || 0;
        units.set(square.playerId, current + square.units);
      }
    }
  }

  return units;
}
