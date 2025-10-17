import type { Command, RoundRecord, GameState } from '../types.ts';
import { getPlayerIdChar, parseGrid, getSquare, type GridSquare } from '../grid-utils.ts';
import { resolveRound } from '../resolve.ts';
import {
  readLines,
  getTargetCoord,
  isValidDirection,
  loadGameState,
  saveGameState,
  getCoordinateKey,
} from '../utils.ts';
import { parseAllPlayerCommands } from './autoplay.ts';

/**
 * Result of parsing a command
 */
type ParseCommandResult = { success: true; command: Command } | { success: false; error: string };

/**
 * Parse a single command string (format: "x,y,direction,count")
 */
export function parseCommand(cmdStr: string, _playerIndex: number): ParseCommandResult {
  const parts = cmdStr
    .trim()
    .split(',')
    .map((part) => part.trim());

  if (parts.length !== 4) {
    return {
      success: false,
      error: `Invalid command format "${cmdStr}". Expected: x,y,direction,count (e.g., "3,4,R,5")`,
    };
  }

  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  const direction = parts[2].toUpperCase();
  const unitCount = parseInt(parts[3], 10);

  if (isNaN(x) || isNaN(y)) {
    return {
      success: false,
      error: `Invalid coordinates in "${cmdStr}". Both x and y must be numbers (e.g., "3,4,R,5")`,
    };
  }

  if (!isValidDirection(direction)) {
    return {
      success: false,
      error: `Invalid direction "${direction}" in "${cmdStr}". Must be U (up), D (down), L (left), or R (right)`,
    };
  }

  if (isNaN(unitCount) || unitCount <= 0) {
    return {
      success: false,
      error: `Invalid unit count in "${cmdStr}". Must be a positive number greater than 0`,
    };
  }

  return {
    success: true,
    command: {
      from: { x, y },
      direction,
      unitCount,
    },
  };
}

/**
 * Validate a command against the current grid state
 */
export function validateCommand(
  cmd: Command,
  playerId: string,
  grid: GridSquare[][],
  mapSize: number
): string | null {
  // Check source coordinate is in bounds
  if (cmd.from.x < 0 || cmd.from.x >= mapSize || cmd.from.y < 0 || cmd.from.y >= mapSize) {
    return `Source coordinate (${cmd.from.x},${cmd.from.y}) is out of bounds. Map size is ${mapSize}x${mapSize} (0-${mapSize - 1})`;
  }

  const sourceSquare = getSquare(grid, cmd.from);
  if (!sourceSquare) {
    return `Source coordinate (${cmd.from.x},${cmd.from.y}) is invalid`;
  }

  // Check player owns the source square
  if (sourceSquare.playerId !== playerId) {
    const owner = sourceSquare.playerId === '.' ? 'neutral' : `player ${sourceSquare.playerId}`;
    return `Square (${cmd.from.x},${cmd.from.y}) does not belong to player ${playerId}. Currently owned by ${owner}`;
  }

  // Check sufficient units
  if (sourceSquare.units < cmd.unitCount) {
    return `Insufficient units at (${cmd.from.x},${cmd.from.y}). Has ${sourceSquare.units} units, trying to move ${cmd.unitCount}`;
  }

  // Check target is adjacent and in bounds
  const target = getTargetCoord(cmd.from, cmd.direction);
  if (target.x < 0 || target.x >= mapSize || target.y < 0 || target.y >= mapSize) {
    return `Target coordinate (${target.x},${target.y}) is out of bounds. Map size is ${mapSize}x${mapSize} (0-${mapSize - 1})`;
  }

  return null; // Valid
}

/**
 * Result of parsing player commands
 */
type ParsePlayerCommandsResult =
  | { success: true; commands: Command[] }
  | { success: false; error: string };

/**
 * Parse commands from a single line (format: "cmd1|cmd2|cmd3")
 */
export function parsePlayerCommands(
  line: string,
  playerIndex: number,
  playerId: string,
  grid: GridSquare[][],
  mapSize: number,
  maxCommands: number
): ParsePlayerCommandsResult {
  if (line.trim() === '') {
    return { success: true, commands: [] }; // No commands for this player
  }

  const cmdStrings = line.split('|');

  if (cmdStrings.length > maxCommands) {
    return {
      success: false,
      error: `Too many commands (${cmdStrings.length}). Maximum is ${maxCommands}`,
    };
  }

  const commands: Command[] = [];
  const unitsUsedPerSquare = new Map<string, number>();

  for (const cmdStr of cmdStrings) {
    const result = parseCommand(cmdStr, playerIndex);

    if (!result.success) {
      return { success: false, error: `Player ${playerId}: ${result.error}` };
    }

    // Validate the command
    const validationError = validateCommand(result.command, playerId, grid, mapSize);
    if (validationError) {
      return { success: false, error: `Player ${playerId}: ${validationError}` };
    }

    // Check cumulative units from this source square
    const key = getCoordinateKey(result.command.from);
    const usedSoFar = unitsUsedPerSquare.get(key) || 0;
    const totalUsed = usedSoFar + result.command.unitCount;

    const sourceSquare = getSquare(grid, result.command.from);
    if (sourceSquare && totalUsed > sourceSquare.units) {
      return {
        success: false,
        error: `Player ${playerId}: Total units from (${result.command.from.x},${result.command.from.y}) would be ${totalUsed}, but only ${sourceSquare.units} available`,
      };
    }

    unitsUsedPerSquare.set(key, totalUsed);
    commands.push(result.command);
  }

  return { success: true, commands };
}

/**
 * Determine the current phase of the game
 */
function determinePhase(
  currentRound: RoundRecord,
  numPlayers: number,
  declarationCount: number
): 'declaration' | 'execution' | 'complete' {
  // Check if commands already submitted
  if (currentRound.commands.length > 0) {
    return 'complete';
  }

  // Check if all declarations are complete
  const expectedDeclarations = numPlayers * declarationCount;
  if (currentRound.declarations.length < expectedDeclarations) {
    return 'declaration';
  }

  // All declarations complete, ready for execution
  return 'execution';
}

/**
 * Handle declaration phase
 */
async function handleDeclarationPhase(
  gameId: string,
  currentRound: RoundRecord,
  numPlayers: number,
  maxLength: number,
  declarationCount: number
): Promise<void> {
  // Calculate which declaration number this is (1-indexed)
  const currentDeclarationCount = currentRound.declarations.length;
  const currentPhase = Math.floor(currentDeclarationCount / numPlayers);
  const declarationNumber = currentPhase + 1;

  // Read n lines from stdin
  const lines = await readLines(numPlayers);

  // Create declarations (truncate to max length if needed, sanitize newlines)
  const newDeclarations: string[] = [];
  const emptyDeclarations: string[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    // Replace newlines and other control characters with spaces
    const sanitized = lines[i].replace(/[\r\n\t]/g, ' ');
    const text = sanitized.slice(0, maxLength);

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

  console.log(
    `Declaration phase ${declarationNumber}/${declarationCount} recorded for round ${currentRound.roundNumber}`
  );
  console.log(`Players: ${numPlayers}, Declarations received: ${newDeclarations.length}`);
}

/**
 * Handle execution phase
 */
async function handleExecutionPhase(
  currentRound: RoundRecord,
  numPlayers: number,
  maxCommands: number,
  mapSize: number,
  gameId: string,
  gameState: GameState
): Promise<void> {
  // Parse the grid state
  const grid = parseGrid(currentRound.gridState);

  // Read n lines from stdin (one per player)
  const lines = await readLines(numPlayers);

  // Parse and validate commands for each player (throws on error)
  const allCommands = parseAllPlayerCommands(lines, numPlayers, grid, mapSize, maxCommands, true);

  // Store commands in current round
  currentRound.commands = allCommands;

  // Display command summary
  const totalCommands = allCommands.reduce((sum, cmds) => sum + cmds.length, 0);

  console.log(`Commands recorded for round ${currentRound.roundNumber}`);
  console.log(`Players: ${numPlayers}, Total commands: ${totalCommands}`);

  // Automatically resolve the round
  console.log(`\nResolving round ${currentRound.roundNumber}...`);
  const result = resolveRound(gameState);

  // Update gameState reference with result
  Object.assign(gameState, result.gameState);

  if (result.winner !== undefined) {
    // Game over
    console.log(`\nGame Over!`);
    if (gameState.winner === null) {
      console.log(`Result: DRAW - All players eliminated (Annihilation)`);
    } else if (Array.isArray(gameState.winner)) {
      console.log(`Result: TIE - Multiple winners: ${gameState.winner.join(', ')}`);
      const units = gameState.winner.map((id: string) => result.playerUnits?.get(id) || 0);
      console.log(`Final units: ${units[0]} each`);
    } else if (gameState.winner !== undefined) {
      console.log(`Winner: Player ${gameState.winner}`);
      const winnerUnits = result.playerUnits?.get(gameState.winner) || 0;
      console.log(`Final units: ${winnerUnits}`);
    }
  } else {
    console.log(`Round ${currentRound.roundNumber} resolved successfully`);
  }
}

/**
 * Advance the game to the next phase (declaration or execution)
 */
export async function nextCommand(gameId: string): Promise<void> {
  // Load game state
  const gameState = await loadGameState(gameId);

  // Check if game is already over
  if (gameState.winner !== undefined) {
    throw new Error(
      `Game "${gameId}" is already over. Use 'state ${gameId}' to view the final results.`
    );
  }

  // Get current round
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const numPlayers = gameState.numPlayers;
  const declarationCount = gameState.config.DECLARATION_COUNT;
  const maxCommands = gameState.config.MAX_COMMANDS_PER_ROUND;
  const mapSize = gameState.config.MAP_SIZE;
  const maxPlanLength = gameState.config.MAX_PLAN_LENGTH;

  // Determine what phase we're in
  const phase = determinePhase(currentRound, numPlayers, declarationCount);

  if (phase === 'complete') {
    throw new Error(
      `Round ${currentRound.roundNumber} is already complete. Use 'state <game_id>' to view the current state.`
    );
  }

  if (phase === 'declaration') {
    await handleDeclarationPhase(gameId, currentRound, numPlayers, maxPlanLength, declarationCount);
  } else {
    // phase === 'execution'
    await handleExecutionPhase(currentRound, numPlayers, maxCommands, mapSize, gameId, gameState);
  }

  // Save updated game state
  await saveGameState(gameId, gameState);
}
