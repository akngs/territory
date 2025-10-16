import { promises as fs } from 'fs';
import { createInterface } from 'readline';
import type { GameState, Declaration } from '../types.ts';
import { getPlayerIdChar } from '../grid-utils.ts';

/**
 * Read n lines from stdin
 */
async function readLines(count: number): Promise<string[]> {
  const lines: string[] = [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= count) {
      rl.close();
      break;
    }
  }

  return lines;
}

/**
 * Add player discussions to the current round
 */
export async function discussCommand(gameId: string): Promise<void> {
  const gamePath = `gamedata/${gameId}/game-state.json`;

  // Load game state
  let gameState: GameState;
  try {
    const data = await fs.readFile(gamePath, 'utf-8');
    gameState = JSON.parse(data);
  } catch (error) {
    console.error(`Error: Game "${gameId}" not found`);
    process.exit(1);
  }

  // Get current round
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const numPlayers = gameState.numPlayers;
  const maxDeclarations = gameState.config.DECLARATION_COUNT;

  // Check how many declaration phases have occurred
  const currentDeclarationCount = currentRound.declarations.length;
  const currentPhase = Math.floor(currentDeclarationCount / numPlayers);

  if (currentPhase >= maxDeclarations) {
    console.error(
      `Error: All ${maxDeclarations} declaration phases have been completed for round ${currentRound.roundNumber}`
    );
    process.exit(1);
  }

  // Calculate which declaration number this is (1-indexed)
  const declarationNumber = currentPhase + 1;

  // Read n lines from stdin
  const lines = await readLines(numPlayers);

  if (lines.length < numPlayers) {
    console.error(`Error: Expected ${numPlayers} lines but got ${lines.length}`);
    process.exit(1);
  }

  // Create declarations (truncate to max length if needed)
  const maxLength = gameState.config.MAX_PLAN_LENGTH;
  const newDeclarations: Declaration[] = [];
  for (let i = 0; i < numPlayers; i++) {
    newDeclarations.push({
      playerId: getPlayerIdChar(i),
      text: lines[i].slice(0, maxLength),
      declarationNumber,
    });
  }

  // Add declarations to current round
  currentRound.declarations.push(...newDeclarations);

  // Save updated game state
  await fs.writeFile(gamePath, JSON.stringify(gameState, null, 2));

  console.log(
    `Declaration phase ${declarationNumber} recorded for round ${currentRound.roundNumber}`
  );
  console.log(`Players: ${numPlayers}, Declarations received: ${newDeclarations.length}`);
}
