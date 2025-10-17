import type { GameState, RoundRecord } from './types.ts';
import { parseGrid, serializeGrid } from './grid-utils.ts';
import { commandsToMovements, applyMovementsFromSources } from './game-logic/movement.ts';
import { resolveCombat } from './game-logic/combat.ts';
import { applyProduction, calculatePlayerUnits } from './game-logic/production.ts';
import { checkEndConditions } from './game-logic/end-conditions.ts';

/**
 * Result of resolving a round
 */
export interface ResolveResult {
  gameState: GameState;
  winner?: string | string[];
  playerUnits?: Map<string, number>;
}

/**
 * Resolve a round: process movements, combat, production, and check end conditions
 * Returns updated game state and optional win information
 *
 * Round resolution sequence:
 * 1. Parse current grid state (before commands)
 * 2. Convert commands to movements
 * 3. Apply movements (deduct from sources)
 * 4. Resolve combat at all squares
 * 5. Apply production to occupied squares
 * 6. Check end conditions
 * 7. Create next round or return winner
 *
 * @param gameState Current game state
 * @returns Resolution result with updated state and optional winner
 */
export function resolveRound(gameState: GameState): ResolveResult {
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const config = gameState.config;

  // Parse current grid (state BEFORE commands execute)
  let grid = parseGrid(currentRound.gridState);

  // Convert commands to movements
  const movements = commandsToMovements(currentRound.commands);

  // Apply movements from sources (deduct units)
  grid = applyMovementsFromSources(grid, movements);

  // Resolve combat at all destination squares
  grid = resolveCombat(grid, movements);

  // Apply production
  grid = applyProduction(grid, config);

  // DON'T update current round's grid - it represents state BEFORE commands
  // The resolved grid is only used for next round or end condition check

  // Calculate player units
  const playerUnits = calculatePlayerUnits(grid, gameState.numPlayers);

  // Check end conditions
  const winner = checkEndConditions(playerUnits, currentRound.roundNumber, config.MAX_ROUNDS);

  if (winner !== undefined) {
    // Game over (winner is a player ID string, array of player IDs, or null for draw)
    gameState.winner = winner;

    return {
      gameState,
      winner: winner ?? undefined, // Convert null to undefined for ResolveResult
      playerUnits,
    };
  }

  // Game continues - create next round with resolved grid state
  const nextRound: RoundRecord = {
    roundNumber: currentRound.roundNumber + 1,
    declarations: [],
    commands: [],
    gridState: serializeGrid(grid),
  };

  gameState.rounds.push(nextRound);
  gameState.currentRound = nextRound.roundNumber;

  return { gameState };
}
