import { getPlayerIdChar } from '../grid-utils.ts';
import { readLines, loadGameState, saveGameState } from '../utils.ts';
import type { RoundRecord } from '../types.ts';

/**
 * Validate that declarations can be submitted for the current round
 * @returns Validation result with error message if invalid
 */
function validateDeclarationPhase(
  currentRound: RoundRecord,
  numPlayers: number,
  maxDeclarations: number
): { valid: true } | { valid: false; error: string; hint?: string } {
  // Check if commands have already been submitted (can't go back to declarations)
  if (currentRound.commands.length > 0) {
    return {
      valid: false,
      error: `Commands have already been submitted for round ${currentRound.roundNumber}`,
      hint: 'Declarations must be completed before submitting commands',
    };
  }

  // Check how many declaration phases have occurred
  const currentDeclarationCount = currentRound.declarations.length;
  const currentPhase = Math.floor(currentDeclarationCount / numPlayers);

  if (currentPhase >= maxDeclarations) {
    return {
      valid: false,
      error: `All ${maxDeclarations} declaration phases have been completed for round ${currentRound.roundNumber}`,
      hint: `Use 'execute <game_id>' to submit movement commands`,
    };
  }

  return { valid: true };
}

/**
 * Add player declarations to the current round
 */
export async function declareCommand(gameId: string): Promise<void> {
  // Load game state
  const gameState = await loadGameState(gameId);

  // Get current round
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const numPlayers = gameState.numPlayers;
  const maxDeclarations = gameState.config.DECLARATION_COUNT;

  // Validate declaration phase
  const validation = validateDeclarationPhase(currentRound, numPlayers, maxDeclarations);
  if (!validation.valid) {
    throw new Error(
      validation.hint ? `${validation.error}. Hint: ${validation.hint}` : validation.error
    );
  }

  // Calculate which declaration number this is (1-indexed)
  const currentDeclarationCount = currentRound.declarations.length;
  const currentPhase = Math.floor(currentDeclarationCount / numPlayers);
  const declarationNumber = currentPhase + 1;

  // Read n lines from stdin
  const lines = await readLines(numPlayers);

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
