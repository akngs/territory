import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { initGame } from './init.ts';
import { showState, formatGameState } from './state.ts';
import { loadGameState, saveGameState } from '../utils.ts';
import { getPlayerIdChar } from '../grid-utils.ts';
import { resolveRound } from '../resolve.ts';
import { parseGrid } from '../grid-utils.ts';
import { parsePlayerCommands } from './next.ts';
import { calculatePlayerUnits } from '../game-logic/production.ts';
import type { Command } from '../types.ts';

const CLAUDE_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Call Claude CLI for a player and get their response
 */
async function callClaudeForPlayer(
  gameId: string,
  playerId: string,
  phase: 'declare' | 'execute',
  declarationPhase?: number
): Promise<string> {
  return new Promise((resolve) => {
    const stateFilePath = `./gamedata/${gameId}/state.txt`;

    let prompt: string;
    if (phase === 'declare') {
      prompt = `Read ./rulebook.md to understand the game rule. Read ${stateFilePath} to understand the current state. This is declaration phase ${declarationPhase}. YOU ARE PLAYER ${playerId.toUpperCase()}. When referring to yourself, use "I" or "me", not "PLAYER ${playerId.toUpperCase()}". Your declaration will be visible to ALL other players - don't write a monologue, but address other players directly to influence their decisions (negotiate, threaten, form alliances, deceive, etc.). Output your declaration (max 400 characters). Don't say anything else but just a single-line declaration.`;
    } else {
      prompt = `Read ./rulebook.md to understand the game rule. Read ${stateFilePath} to understand the current state. YOU ARE PLAYER ${playerId.toUpperCase()}. Output your commands in the format: x,y,direction,count (multiple commands separated by |). If you have no commands, output an empty line. Don't say anything else but just the command line.`;
    }

    // Log the command being executed (simplified)
    const commandArgs = ['-p', prompt, '--allowedTools', 'Read'];

    // Use Haiku model for player 'b', Sonnet for all others
    if (playerId === 'b') {
      commandArgs.push('--model', 'haiku');
    } else {
      commandArgs.push('--model', 'sonnet');
    }

    const modelInfo = playerId === 'b' ? ' (Haiku)' : ' (Sonnet)';
    console.log(`[Player ${playerId}${modelInfo}] Calling Claude...`);

    // eslint-disable-next-line sonarjs/no-os-command-from-path -- Intentionally calling the claude CLI from user's PATH
    const claude = spawn('claude', commandArgs, {
      env: process.env, // Pass environment variables including CLAUDE_CODE_OAUTH_TOKEN
      stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout: pipe, stderr: pipe
    });

    let output = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      claude.kill();
      resolve(''); // Return empty string on timeout
    }, CLAUDE_TIMEOUT_MS);

    claude.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      // Only log errors, not normal output
      if (chunk.trim()) {
        console.error(`[Player ${playerId}] Error: ${chunk}`);
      }
    });

    claude.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        console.warn(`[Player ${playerId}] Timed out after ${CLAUDE_TIMEOUT_MS / 1000}s`);
        resolve('');
      } else if (code !== 0) {
        console.warn(`[Player ${playerId}] Claude exited with code ${code}`);
        resolve('');
      } else {
        // Extract just the first line of output, trimmed
        const lines = output.trim().split('\n');
        const response = lines[0] || '';
        console.log(`[Player ${playerId}] Response: ${response || '(empty)'}`);
        resolve(response);
      }
    });

    claude.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`[Player ${playerId}] Failed to spawn Claude:`, err);
      resolve('');
    });
  });
}

/**
 * Clear the terminal screen
 */
function clearScreen(): void {
  // ANSI escape code to clear screen and move cursor to top-left
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Save current game state to state.txt for Claude to read
 */
async function saveStateToFile(gameId: string): Promise<void> {
  const stateFilePath = join(process.cwd(), 'gamedata', gameId, 'state.txt');
  const stateContent = await formatGameState(gameId);
  await fs.writeFile(stateFilePath, stateContent, 'utf-8');
}

/**
 * Display current game state to terminal
 */
async function displayGameState(gameId: string): Promise<void> {
  clearScreen();
  await showState(gameId);
}

/**
 * Get concurrent responses from all players
 */
async function getConcurrentPlayerResponses(
  gameId: string,
  numPlayers: number,
  phase: 'declare' | 'execute',
  playerUnits?: Map<string, number>,
  declarationPhase?: number
): Promise<string[]> {
  const promises: Promise<string>[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const units = playerUnits?.get(playerId) || 0;

    // Skip calling Claude if player has 0 units (only in execute phase)
    if (phase === 'execute' && playerUnits && units === 0) {
      console.log(`[Player ${playerId}] Eliminated (0 units) - skipping`);
      promises.push(Promise.resolve(''));
    } else {
      promises.push(callClaudeForPlayer(gameId, playerId, phase, declarationPhase));
    }
  }

  return Promise.all(promises);
}

/**
 * Process declaration phase
 */
async function processDeclarationPhase(
  gameId: string,
  numPlayers: number,
  declarationPhase: number
): Promise<void> {
  console.log(`\n=== Declaration Phase ${declarationPhase} ===`);

  // Get concurrent responses from all players
  const responses = await getConcurrentPlayerResponses(
    gameId,
    numPlayers,
    'declare',
    declarationPhase
  );

  // Load game state
  const gameState = await loadGameState(gameId);
  const currentRound = gameState.rounds[gameState.rounds.length - 1];

  // Add declarations to current round (truncate to max length)
  const maxLength = gameState.config.MAX_PLAN_LENGTH;
  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const declaration = responses[i].slice(0, maxLength);
    currentRound.declarations.push(declaration);
    console.log(`Player ${playerId}: ${declaration || '(empty)'}`);
  }

  // Save updated game state
  await saveGameState(gameId, gameState);
}

/**
 * Print game over message
 */
function printGameOverMessage(
  winner: string | string[] | null | undefined,
  playerUnits?: Map<string, number>
): void {
  console.log(`\nGame Over!`);
  if (winner === null) {
    console.log(`Result: DRAW - All players eliminated (Annihilation)`);
  } else if (Array.isArray(winner)) {
    console.log(`Result: TIE - Multiple winners: ${winner.join(', ')}`);
    const units = winner.map((id) => playerUnits?.get(id) || 0);
    console.log(`Final units: ${units[0]} each`);
  } else if (winner !== undefined) {
    console.log(`Winner: Player ${winner}`);
    const winnerUnits = playerUnits?.get(winner) || 0;
    console.log(`Final units: ${winnerUnits}`);
  }
}

/**
 * Format commands for display
 */
function formatCommandsForDisplay(commands: Command[]): string {
  if (commands.length === 0) {
    return '(no commands)';
  }
  return commands
    .map((cmd) => `${cmd.from.x},${cmd.from.y},${cmd.direction},${cmd.unitCount}`)
    .join(' | ');
}

/**
 * Parse player commands from responses
 */
export function parseAllPlayerCommands(
  responses: string[],
  numPlayers: number,
  grid: ReturnType<typeof parseGrid>,
  mapSize: number,
  maxCommands: number,
  throwOnError = false
): Command[][] {
  const allCommands: Command[][] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const playerNumber = i + 1;

    try {
      const result = parsePlayerCommands(responses[i], i, playerId, grid, mapSize, maxCommands);

      if (!result.success) {
        if (throwOnError) {
          throw new Error(`Player ${playerId} (#${playerNumber}): ${result.error}`);
        }
        console.warn(
          `Player ${playerId} (#${playerNumber}): ${result.error} - treating as no commands`
        );
        allCommands.push([]);
      } else {
        allCommands.push(result.commands);
        if (!throwOnError) {
          console.log(`Player ${playerId}: ${formatCommandsForDisplay(result.commands)}`);
        }
      }
    } catch (err) {
      if (throwOnError) {
        throw err;
      }
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`Player ${playerId} error: ${errorMsg} - treating as no commands`);
      allCommands.push([]);
    }
  }

  return allCommands;
}

/**
 * Process execution phase
 */
async function processExecutionPhase(gameId: string, numPlayers: number): Promise<boolean> {
  console.log(`\n=== Execution Phase ===`);

  // Load game state
  const gameState = await loadGameState(gameId);
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const grid = parseGrid(currentRound.gridState);

  // Calculate units for each player
  const playerUnits = calculatePlayerUnits(grid, numPlayers);

  // Get concurrent responses from all players
  const responses = await getConcurrentPlayerResponses(gameId, numPlayers, 'execute', playerUnits);

  // Parse and validate commands for each player
  const allCommands = parseAllPlayerCommands(
    responses,
    numPlayers,
    grid,
    gameState.config.MAP_SIZE,
    gameState.config.MAX_COMMANDS_PER_ROUND
  );

  // Store commands in current round
  currentRound.commands = allCommands;

  // Resolve the round
  console.log(`\nResolving round ${currentRound.roundNumber}...`);
  const result = resolveRound(gameState);

  // Save updated game state
  await saveGameState(gameId, result.gameState);

  if (result.winner !== undefined) {
    printGameOverMessage(result.gameState.winner, result.playerUnits);
    return true; // Game ended
  }

  console.log(`Round ${currentRound.roundNumber} resolved successfully`);
  return false; // Game continues
}

/**
 * Autoplay command: Initialize game and let Claude instances play
 */
export async function autoplayCommand(gameId: string, numPlayersStr: string): Promise<void> {
  const numPlayers = parseInt(numPlayersStr, 10);

  if (isNaN(numPlayers)) {
    throw new Error('Number of players must be a valid integer');
  }

  console.log(`Starting autoplay game "${gameId}" with ${numPlayers} players`);

  // Step 1: Initialize the game
  await initGame(gameId, numPlayers);
  console.log(`Game initialized: ${gameId}`);

  // Main game loop
  let gameEnded = false;

  while (!gameEnded) {
    const gameState = await loadGameState(gameId);
    const currentRound = gameState.rounds[gameState.rounds.length - 1];
    const expectedDeclarations = numPlayers * gameState.config.DECLARATION_COUNT;

    // Display current game state
    await displayGameState(gameId);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Round ${currentRound.roundNumber}`);
    console.log(`${'='.repeat(60)}`);

    // Save current state to file for Claude to read
    await saveStateToFile(gameId);

    // Check if we need to do declarations
    if (currentRound.declarations.length < expectedDeclarations) {
      // Step 3 & 4: Declaration phases
      const currentPhase = Math.floor(currentRound.declarations.length / numPlayers) + 1;

      for (let phase = currentPhase; phase <= gameState.config.DECLARATION_COUNT; phase++) {
        await processDeclarationPhase(gameId, numPlayers, phase);

        // Update state file and display after declarations
        await saveStateToFile(gameId);
        await displayGameState(gameId);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Round ${currentRound.roundNumber} - Declaration Phase ${phase} Complete`);
        console.log(`${'='.repeat(60)}\n`);
      }
    }

    // Step 5 & 6: Execution phase
    gameEnded = await processExecutionPhase(gameId, numPlayers);

    // Display state after execution
    if (!gameEnded) {
      await displayGameState(gameId);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Round ${currentRound.roundNumber} Complete - Next Round Starting`);
      console.log(`${'='.repeat(60)}\n`);

      // Pause briefly so the user can see the state
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Final state
  await displayGameState(gameId);
  console.log(`\n${'='.repeat(60)}`);
  console.log('GAME OVER - Final State Above');
  console.log(`${'='.repeat(60)}\n`);
}
