import type { GameState, RoundRecord, Command, Coordinate } from './types.ts';
import { parseGrid, serializeGrid, getPlayerIdChar, type GridSquare } from './grid-utils.ts';
import { getTargetCoord } from './utils.ts';

/**
 * A unit movement operation
 */
interface Movement {
  from: Coordinate;
  to: Coordinate;
  playerId: string;
  units: number;
}

/**
 * Square state during combat resolution
 */
interface CombatSquare {
  units: number;
  playerId: string;
  isResource: boolean;
  forces: Map<string, number>; // Accumulates units from all movements
}

/**
 * Convert all commands to movement operations
 */
function commandsToMovements(commands: Command[][]): Movement[] {
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
 * Process all movements simultaneously and resolve combat
 */
function processMovements(
  grid: GridSquare[][],
  movements: Movement[],
  mapSize: number
): GridSquare[][] {
  // Create combat grid with forces map for each square
  const combatGrid: CombatSquare[][] = grid.map((col, x) =>
    col.map((square, y) => {
      const forces = new Map<string, number>();
      if (square.playerId !== '.') {
        forces.set(square.playerId, square.units);
      }
      return { ...square, forces };
    })
  );

  // Process all movements - deduct from source squares
  for (const move of movements) {
    const source = combatGrid[move.from.x][move.from.y];
    source.units = Math.max(0, source.units - move.units);

    // If all units left, square becomes neutral
    if (source.units === 0) {
      source.playerId = '.';
      source.forces.clear();
    } else {
      // Update forces map for remaining units
      source.forces.set(source.playerId, source.units);
    }
  }

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
      const square = combatGrid[x][y];
      const { isResource, forces } = square;
      let units = 0;
      let playerId = '.';

      if (forces.size === 1) {
        // Single player - no combat
        const entry = forces.entries().next().value;
        if (entry) {
          [playerId, units] = entry;
        }
      } else if (forces.size > 1) {
        // Multiple players - combat!
        const sorted = Array.from(forces.entries()).sort((a, b) => b[1] - a[1]);
        const [firstPlayer, firstUnits] = sorted[0];
        const [, secondUnits] = sorted[1];
        const remainingUnits = firstUnits - secondUnits;

        if (remainingUnits > 0) {
          units = remainingUnits;
          playerId = firstPlayer;
        }
      }

      newGrid[x][y] = { units, playerId, isResource };
    }
  }

  return newGrid;
}

/**
 * Apply production to all occupied squares
 */
function applyProduction(grid: GridSquare[][], mapSize: number, config: GameState['config']): GridSquare[][] {
  const productionCap = config.PRODUCTION_CAP;
  const baseProduction = config.BASE_PRODUCTION;
  const resourceProduction = config.RESOURCE_PRODUCTION;

  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const square = grid[x][y];

      // Only produce on occupied squares
      if (square.playerId !== '.') {
        const production = square.isResource ? resourceProduction : baseProduction;
        square.units = Math.min(productionCap, square.units + production);
      }
    }
  }

  return grid;
}

/**
 * Calculate total units for each player
 */
function calculatePlayerUnits(
  grid: GridSquare[][],
  mapSize: number,
  numPlayers: number
): Map<string, number> {
  const units = new Map<string, number>();

  // Initialize all players with 0
  for (let i = 0; i < numPlayers; i++) {
    units.set(getPlayerIdChar(i), 0);
  }

  // Count units
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const square = grid[x][y];
      if (square.playerId !== '.') {
        const current = units.get(square.playerId) || 0;
        units.set(square.playerId, current + square.units);
      }
    }
  }

  return units;
}

/**
 * Check win conditions
 * Returns winning player ID or null if game continues
 */
function checkWinConditions(
  playerUnits: Map<string, number>,
  currentRound: number,
  maxRounds: number
): string | null {
  const totalUnits = Array.from(playerUnits.values()).reduce((a, b) => a + b, 0);

  if (totalUnits === 0) {
    return null; // No winner - all eliminated
  }

  // Check for annihilation (only one player remains)
  const playersWithUnits = Array.from(playerUnits.entries()).filter(
    ([, units]) => units > 0
  );

  if (playersWithUnits.length === 1) {
    return playersWithUnits[0][0]; // Winner by annihilation
  }

  // Check for domination (>50% of all units)
  for (const [playerId, units] of playerUnits.entries()) {
    if (units > totalUnits / 2) {
      return playerId; // Winner by domination
    }
  }

  // Check for timeout
  if (currentRound >= maxRounds) {
    // Winner is player with most units
    const sorted = Array.from(playerUnits.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  return null; // Game continues
}

/**
 * Resolve a round: process movements, combat, production, and check win conditions
 * Returns updated game state
 */
export function resolveRound(gameState: GameState): GameState {
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const config = gameState.config;
  const mapSize = config.MAP_SIZE;

  // Parse current grid (state BEFORE commands execute)
  let grid = parseGrid(currentRound.gridState);

  // Convert commands to movements
  const movements = commandsToMovements(currentRound.commands);

  // Process movements and resolve combat
  grid = processMovements(grid, movements, mapSize);

  // Apply production
  grid = applyProduction(grid, mapSize, config);

  // DON'T update current round's grid - it represents state BEFORE commands
  // The resolved grid is only used for next round or win condition check

  // Calculate player units
  const playerUnits = calculatePlayerUnits(grid, mapSize, gameState.numPlayers);

  // Check win conditions
  const winner = checkWinConditions(
    playerUnits,
    currentRound.roundNumber,
    config.MAX_ROUNDS
  );

  if (winner) {
    // Game over - don't create new round
    console.log(`\nGame Over!`);
    console.log(`Winner: Player ${winner}`);
    const winnerUnits = playerUnits.get(winner) || 0;
    console.log(`Final units: ${winnerUnits}`);
  } else {
    // Create next round with resolved grid state
    const nextRound: RoundRecord = {
      roundNumber: currentRound.roundNumber + 1,
      declarations: [],
      commands: [],
      gridState: serializeGrid(grid),
    };

    gameState.rounds.push(nextRound);
    gameState.currentRound = nextRound.roundNumber;
  }

  return gameState;
}
