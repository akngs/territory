import type { GameState, Command, Coordinate } from '../types.ts';
import { getPlayerIdChar, parseGrid, getSquare } from '../grid-utils.ts';
import { resolveRound } from '../resolve.ts';
import { readLines, getTargetCoord, isValidDirection, loadGameState, saveGameState } from '../utils.ts';

/**
 * Parse a single command string (format: "x,y,direction,count")
 */
export function parseCommand(cmdStr: string, playerIndex: number): Command | string {
  const parts = cmdStr.trim().split(',');

  if (parts.length !== 4) {
    return `Invalid command format "${cmdStr}". Expected: x,y,direction,count (e.g., "3,4,R,5")`;
  }

  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  const direction = parts[2].toUpperCase();
  const unitCount = parseInt(parts[3], 10);

  if (isNaN(x) || isNaN(y)) {
    return `Invalid coordinates in "${cmdStr}". Both x and y must be numbers (e.g., "3,4,R,5")`;
  }

  if (!isValidDirection(direction)) {
    return `Invalid direction "${direction}" in "${cmdStr}". Must be U (up), D (down), L (left), or R (right)`;
  }

  if (isNaN(unitCount) || unitCount <= 0) {
    return `Invalid unit count in "${cmdStr}". Must be a positive number greater than 0`;
  }

  return {
    from: { x, y },
    direction,
    unitCount,
  };
}

/**
 * Validate a command against the current grid state
 */
export function validateCommand(
  cmd: Command,
  playerId: string,
  grid: any[][],
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
 * Parse commands from a single line (format: "cmd1|cmd2|cmd3")
 */
export function parsePlayerCommands(
  line: string,
  playerIndex: number,
  playerId: string,
  grid: any[][],
  mapSize: number,
  maxCommands: number
): Command[] | string {
  if (line.trim() === '') {
    return []; // No commands for this player
  }

  const cmdStrings = line.split('|');

  if (cmdStrings.length > maxCommands) {
    return `Too many commands (${cmdStrings.length}). Maximum is ${maxCommands}`;
  }

  const commands: Command[] = [];

  for (const cmdStr of cmdStrings) {
    const result = parseCommand(cmdStr, playerIndex);

    if (typeof result === 'string') {
      return `Player ${playerId}: ${result}`;
    }

    // Validate the command
    const validationError = validateCommand(result, playerId, grid, mapSize);
    if (validationError) {
      return `Player ${playerId}: ${validationError}`;
    }

    commands.push(result);
  }

  return commands;
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

  // Check if declarations are complete
  const expectedDeclarations = numPlayers * gameState.config.DECLARATION_COUNT;
  if (currentRound.declarations.length < expectedDeclarations) {
    console.error(
      `Error: Declaration phase not complete for round ${currentRound.roundNumber}`
    );
    console.error(
      `Expected ${expectedDeclarations} declarations (${numPlayers} players × ${gameState.config.DECLARATION_COUNT} phases), but got ${currentRound.declarations.length}`
    );
    console.error(`Hint: Use 'discuss <game_id>' to submit declarations first`);
    process.exit(1);
  }

  // Check if commands already submitted
  if (Object.keys(currentRound.commands).length > 0) {
    console.error(
      `Error: Commands have already been submitted for round ${currentRound.roundNumber}`
    );
    console.error(`Hint: Round ${currentRound.roundNumber} is complete`);
    process.exit(1);
  }

  // Parse the grid state
  const grid = parseGrid(currentRound.gridState);

  // Read n lines from stdin (one per player)
  const lines = await readLines(numPlayers);

  if (lines.length < numPlayers) {
    console.error(`Error: Expected ${numPlayers} lines but got ${lines.length}`);
    process.exit(1);
  }

  // Parse and validate commands for each player
  const allCommands: { [playerId: string]: Command[] } = {};

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    const playerNumber = i + 1;
    const result = parsePlayerCommands(
      lines[i],
      i,
      playerId,
      grid,
      mapSize,
      maxCommands
    );

    if (typeof result === 'string') {
      console.error(`Error (Player ${playerId}, #${playerNumber}): ${result}`);
      process.exit(1);
    }

    allCommands[playerId] = result;
  }

  // Store commands in current round
  currentRound.commands = allCommands;

  // Display command summary
  const totalCommands = Object.values(allCommands).reduce(
    (sum, cmds) => sum + cmds.length,
    0
  );

  console.log(`Commands recorded for round ${currentRound.roundNumber}`);
  console.log(`Players: ${numPlayers}, Total commands: ${totalCommands}`);

  // Automatically resolve the round
  console.log(`\nResolving round ${currentRound.roundNumber}...`);
  const updatedGameState = resolveRound(gameState);

  // Save updated game state
  await saveGameState(gameId, updatedGameState);

  console.log(`Round ${currentRound.roundNumber} resolved successfully`);
}
