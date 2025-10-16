import type { Command, RoundRecord } from '../types.ts';
import { getPlayerIdChar, parseGrid, getSquare, type GridSquare } from '../grid-utils.ts';
import { resolveRound } from '../resolve.ts';
import {
  readLines,
  getTargetCoord,
  isValidDirection,
  loadGameState,
  saveGameState,
} from '../utils.ts';

/**
 * Result of parsing a command
 */
type ParseCommandResult = { success: true; command: Command } | { success: false; error: string };

/**
 * Parse a single command string (format: "x,y,direction,count")
 */
export function parseCommand(cmdStr: string, _playerIndex: number): ParseCommandResult {
  const parts = cmdStr.trim().split(',');

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

    commands.push(result.command);
  }

  return { success: true, commands };
}

/**
 * Validate that commands can be submitted for the current round
 */
function validateCommandPhase(
  currentRound: RoundRecord,
  numPlayers: number,
  declarationCount: number
): { valid: true } | { valid: false; error: string; hint?: string } {
  // Check if declarations are complete
  const expectedDeclarations = numPlayers * declarationCount;
  if (currentRound.declarations.length < expectedDeclarations) {
    return {
      valid: false,
      error: `Declaration phase not complete for round ${currentRound.roundNumber}. Expected ${expectedDeclarations} declarations (${numPlayers} players × ${declarationCount} phases), but got ${currentRound.declarations.length}`,
      hint: `Use 'discuss <game_id>' to submit declarations first`,
    };
  }

  // Check if commands already submitted
  if (currentRound.commands.length > 0) {
    return {
      valid: false,
      error: `Commands have already been submitted for round ${currentRound.roundNumber}`,
      hint: `Round ${currentRound.roundNumber} is complete`,
    };
  }

  return { valid: true };
}

/**
 * Submit commands for the current round
 */
export async function cmdsCommand(gameId: string): Promise<void> {
  // Load game state
  const gameState = await loadGameState(gameId);

  // Get current round
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const numPlayers = gameState.numPlayers;
  const maxCommands = gameState.config.MAX_COMMANDS_PER_ROUND;
  const mapSize = gameState.config.MAP_SIZE;

  // Validate command phase
  const validation = validateCommandPhase(
    currentRound,
    numPlayers,
    gameState.config.DECLARATION_COUNT
  );
  if (!validation.valid) {
    throw new Error(
      validation.hint ? `${validation.error}. Hint: ${validation.hint}` : validation.error
    );
  }

  // Parse the grid state
  const grid = parseGrid(currentRound.gridState);

  // Read n lines from stdin (one per player)
  const lines = await readLines(numPlayers);

  // Parse and validate commands for each player
  const allCommands: Command[][] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const playerNumber = i + 1;
    const result = parsePlayerCommands(lines[i], i, playerId, grid, mapSize, maxCommands);

    if (!result.success) {
      throw new Error(`Player ${playerId} (#${playerNumber}): ${result.error}`);
    }

    allCommands.push(result.commands);
  }

  // Store commands in current round
  currentRound.commands = allCommands;

  // Display command summary
  const totalCommands = allCommands.reduce((sum, cmds) => sum + cmds.length, 0);

  console.log(`Commands recorded for round ${currentRound.roundNumber}`);
  console.log(`Players: ${numPlayers}, Total commands: ${totalCommands}`);

  // Automatically resolve the round
  console.log(`\nResolving round ${currentRound.roundNumber}...`);
  const result = resolveRound(gameState);

  // Save updated game state
  await saveGameState(gameId, result.gameState);

  if (result.winner) {
    // Game over
    console.log(`\nGame Over!`);
    console.log(`Winner: Player ${result.winner}`);
    const winnerUnits = result.playerUnits?.get(result.winner) || 0;
    console.log(`Final units: ${winnerUnits}`);
  } else {
    console.log(`Round ${currentRound.roundNumber} resolved successfully`);
  }
}
