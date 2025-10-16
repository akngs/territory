import chalk from 'chalk';
import { getPlayerIdChar } from '../grid-utils.ts';
import { loadGameState } from '../utils.ts';
import type { Command, GameState } from '../types.ts';

/**
 * Parse grid state string and count units/resources for display
 */
function parseGridSummary(gridState: string): {
  playerUnits: Map<string, number>;
  resourceCount: number;
  totalSquares: number;
} {
  const playerUnits = new Map<string, number>();
  let resourceCount = 0;
  let totalSquares = 0;

  const rows = gridState.split('\n');
  for (const row of rows) {
    const squares = row.split('|');
    for (const square of squares) {
      totalSquares++;
      const units = parseInt(square.substring(0, 2), 10);
      const playerId = square[2];
      const isResource = square[3] === '+';

      if (playerId !== '.') {
        playerUnits.set(playerId, (playerUnits.get(playerId) || 0) + units);
      }

      if (isResource) {
        resourceCount++;
      }
    }
  }

  return { playerUnits, resourceCount, totalSquares };
}

/**
 * Render grid state in 2D format for terminal display
 */
function renderGrid(gridState: string): string {
  const rows = gridState.split('\n');
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const squares = rows[i].split('|');
    const displaySquares = squares.map((sq) => {
      // Format: "NNp?" where ? is '+' for resource or '.' for normal
      const isResource = sq[3] === '+';
      const isNeutral = sq[2] === '.';

      // Colorize: resource squares in green, neutral squares in gray
      if (isResource) {
        return chalk.green(sq);
      } else if (isNeutral) {
        return chalk.gray(sq);
      }
      return sq;
    });
    lines.push(displaySquares.join(' '));
  }

  return lines.join('\n');
}

/**
 * Display declarations for a round
 */
function displayDeclarations(declarations: string[], numPlayers: number): void {
  if (declarations.length === 0) return;

  console.log();
  console.log(`Declarations:`);
  for (let i = 0; i < declarations.length; i++) {
    const playerIndex = i % numPlayers;
    const playerId = getPlayerIdChar(playerIndex);
    const text = declarations[i];
    console.log(`- ${playerId}: ${text}`);
  }
}

/**
 * Display commands for a round
 */
function displayCommands(commands: Command[][]): void {
  if (commands.length === 0) return;

  console.log();
  console.log(`Commands:`);
  for (let i = 0; i < commands.length; i++) {
    const playerId = getPlayerIdChar(i);
    const playerCommands = commands[i];
    if (playerCommands.length === 0) {
      console.log(`- ${playerId}: (no commands)`);
    } else {
      const cmdStrings = playerCommands
        .map((cmd) => `${cmd.from.x},${cmd.from.y},${cmd.direction},${cmd.unitCount}`)
        .join(' | ');
      console.log(`- ${playerId}: ${cmdStrings}`);
    }
  }
}

/**
 * Determine current game phase
 */
function determineGamePhase(gameState: GameState): string {
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const expectedDeclarations = gameState.numPlayers * gameState.config.DECLARATION_COUNT;
  const hasCommands = currentRound.commands.length > 0;
  const hasNextRound = gameState.rounds.length > currentRound.roundNumber;

  if (hasCommands && hasNextRound) {
    return `Round ${gameState.currentRound} - Awaiting declarations (phase 1/${gameState.config.DECLARATION_COUNT})`;
  }
  if (hasCommands && !hasNextRound) {
    return `Game Over`;
  }
  if (currentRound.declarations.length < expectedDeclarations) {
    const currentPhase = Math.floor(currentRound.declarations.length / gameState.numPlayers) + 1;
    return `Round ${currentRound.roundNumber} - Awaiting declarations (phase ${currentPhase}/${gameState.config.DECLARATION_COUNT})`;
  }
  return `Round ${currentRound.roundNumber} - Awaiting commands`;
}

/**
 * Display game state in human-readable format
 */
export async function showState(gameId: string): Promise<void> {
  const gameState = await loadGameState(gameId);

  // Display rounds history
  for (let i = 0; i < gameState.rounds.length; i++) {
    const round = gameState.rounds[i];

    if (i > 0) {
      console.log();
    }

    console.log(chalk.cyan(`## Round ${round.roundNumber}/${gameState.config.MAX_ROUNDS}`));
    console.log();

    // Render the grid
    console.log('```');
    console.log(renderGrid(round.gridState));
    console.log('```');
    console.log();

    // Parse grid summary
    const summary = parseGridSummary(round.gridState);

    // Show player units (use localeCompare for alphabetical sort)
    const playerIds = Array.from(summary.playerUnits.keys()).sort((a, b) => a.localeCompare(b));
    const unitsList = playerIds.map((id) => `${id}=${summary.playerUnits.get(id) || 0}`).join(', ');
    console.log(`Units: ${unitsList}`);

    // Show declarations and commands
    displayDeclarations(round.declarations, gameState.numPlayers);
    displayCommands(round.commands);
  }

  // Display summary
  console.log();
  console.log(chalk.cyan(`## Summary`));
  console.log(determineGamePhase(gameState));
  console.log();
}
