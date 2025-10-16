import { readFile } from 'fs/promises';
import { join } from 'path';
import type { GameState } from '../types.ts';

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
    const displaySquares = squares.map(sq => {
      // Format: "NNp?" -> display as "NNp?" (4 chars)
      return sq;
    });
    lines.push(displaySquares.join(' '));
  }

  return lines.join('\n');
}

/**
 * Display game state in human-readable format
 */
export async function showState(gameId: string): Promise<void> {
  const gamedataDir = join(process.cwd(), 'gamedata');
  const gameDir = join(gamedataDir, gameId);
  const stateFile = join(gameDir, 'game-state.json');

  // Load game state
  let gameState: GameState;
  try {
    const content = await readFile(stateFile, 'utf-8');
    gameState = JSON.parse(content);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Game "${gameId}" not found`);
    }
    throw err;
  }

  // Display configuration
  console.log(`## Configuration`);
  console.log(`Players: ${gameState.numPlayers}`);
  console.log(`Map: ${gameState.config.MAP_SIZE}×${gameState.config.MAP_SIZE}`);
  console.log(`Max Rounds: ${gameState.config.MAX_ROUNDS}`);
  console.log();

  // Display rounds history
  console.log(`## Rounds (${gameState.rounds.length})`);
  for (const round of gameState.rounds) {
    console.log();
    console.log(`### Round ${round.roundNumber}`);
    console.log();

    // Render the grid
    console.log('```');
    console.log(renderGrid(round.gridState));
    console.log('```');
    console.log();

    // Parse grid summary
    const summary = parseGridSummary(round.gridState);

    // Show player units
    const playerIds = Array.from(summary.playerUnits.keys()).sort();
    for (const playerId of playerIds) {
      const units = summary.playerUnits.get(playerId) || 0;
      console.log(`Player ${playerId}: ${units} units`);
    }

    // Show declarations if any
    if (round.declarations.length > 0) {
      console.log();
      console.log(`Declarations:`);
      for (const decl of round.declarations) {
        console.log(`- ${decl.playerId}: ${decl.text}`);
      }
    }

    // Show commands if any
    const playerIdsWithCommands = Object.keys(round.commands);
    if (playerIdsWithCommands.length > 0) {
      console.log();
      console.log(`Commands:`);
      for (const playerId of playerIdsWithCommands) {
        const commands = round.commands[playerId];
        console.log(`  [${playerId}] ${commands.length} command(s)`);
      }
    }
  }
}
