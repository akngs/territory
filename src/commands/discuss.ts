import { getPlayerIdChar } from '../grid-utils.ts';
import { readLines, loadGameState, saveGameState } from '../utils.ts';

/**
 * Add player discussions to the current round
 */
export async function discussCommand(gameId: string): Promise<void> {
  // Load game state
  const gameState = await loadGameState(gameId);

  // Get current round
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const numPlayers = gameState.numPlayers;
  const maxDeclarations = gameState.config.DECLARATION_COUNT;

  // Check if commands have already been submitted (can't go back to declarations)
  if (Object.keys(currentRound.commands).length > 0) {
    console.error(
      `Error: Commands have already been submitted for round ${currentRound.roundNumber}`
    );
    console.error(`Hint: Declarations must be completed before submitting commands`);
    process.exit(1);
  }

  // Check how many declaration phases have occurred
  const currentDeclarationCount = currentRound.declarations.length;
  const currentPhase = Math.floor(currentDeclarationCount / numPlayers);

  if (currentPhase >= maxDeclarations) {
    console.error(
      `Error: All ${maxDeclarations} declaration phases have been completed for round ${currentRound.roundNumber}`
    );
    console.error(`Hint: Use 'cmds <game_id>' to submit movement commands`);
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
  const newDeclarations: string[] = [];
  const emptyDeclarations: string[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const text = lines[i].slice(0, maxLength);

    if (text.trim() === '') {
      emptyDeclarations.push(`Player ${playerId} (player ${i + 1})`);
    }

    newDeclarations.push(text);
  }

  // Warn about empty declarations
  if (emptyDeclarations.length > 0) {
    console.warn(`Warning: Empty declarations from: ${emptyDeclarations.join(', ')}`);
  }

  // Add declarations to current round
  currentRound.declarations.push(...newDeclarations);

  // Save updated game state
  await saveGameState(gameId, gameState);

  console.log(
    `Declaration phase ${declarationNumber} recorded for round ${currentRound.roundNumber}`
  );
  console.log(`Players: ${numPlayers}, Declarations received: ${newDeclarations.length}`);
}
