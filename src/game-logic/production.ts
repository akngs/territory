import type { GameConfig } from '../types.ts';
import type { GridSquare } from '../grid-utils.ts';
import { NEUTRAL_PLAYER_ID, getPlayerIdChar } from '../grid-utils.ts';

/**
 * Apply production to all occupied squares
 * Returns new grid with production applied
 *
 * Production rules:
 * - Only occupied squares produce (neutral squares don't)
 * - Normal squares: +BASE_PRODUCTION units per round
 * - Resource squares: +RESOURCE_PRODUCTION units per round
 * - No production if square has >= PRODUCTION_CAP units
 * - Production can increase units above PRODUCTION_CAP (e.g., 20 + 2 = 22)
 *
 * @param grid Current grid state
 * @param config Game configuration
 * @returns New grid with production applied
 */
export function applyProduction(grid: GridSquare[][], config: GameConfig): GridSquare[][] {
  const { PRODUCTION_CAP, BASE_PRODUCTION, RESOURCE_PRODUCTION } = config;

  return grid.map((col) =>
    col.map((square) => {
      // Only produce on occupied squares below production cap
      if (square.playerId !== NEUTRAL_PLAYER_ID && square.units < PRODUCTION_CAP) {
        const production = square.isResource ? RESOURCE_PRODUCTION : BASE_PRODUCTION;
        return { ...square, units: square.units + production };
      }
      return { ...square };
    })
  );
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
    const playerId = getPlayerIdChar(i);
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
