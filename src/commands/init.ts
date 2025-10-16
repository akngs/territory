import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { GameState } from '../types.ts';
import { DEFAULT_CONFIG } from '../types.ts';
import { performInitialSetup } from '../game-init.ts';

/**
 * Initialize a new game with the given ID and number of players
 */
export async function initGame(gameId: string, numPlayers: number): Promise<void> {
  // Validate game ID
  if (!gameId || gameId.trim().length === 0) {
    throw new Error('Game ID cannot be empty');
  }

  // Validate number of players
  if (numPlayers < DEFAULT_CONFIG.MIN_PLAYERS || numPlayers > DEFAULT_CONFIG.MAX_PLAYERS) {
    throw new Error(`Number of players must be between ${DEFAULT_CONFIG.MIN_PLAYERS} and ${DEFAULT_CONFIG.MAX_PLAYERS}`);
  }

  // Sanitize game ID to prevent directory traversal
  const sanitizedGameId = gameId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (sanitizedGameId !== gameId) {
    console.warn(`Game ID sanitized from "${gameId}" to "${sanitizedGameId}"`);
  }

  const gamedataDir = join(process.cwd(), 'gamedata');
  const gameDir = join(gamedataDir, sanitizedGameId);
  const stateFile = join(gameDir, 'game-state.json');

  // Create gamedata directory if it doesn't exist
  await mkdir(gamedataDir, { recursive: true });

  // Check if game directory already exists
  try {
    await access(gameDir);
    throw new Error(`Game "${sanitizedGameId}" already exists in gamedata/`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Directory doesn't exist, which is what we want
  }

  // Create game directory
  await mkdir(gameDir, { recursive: true });
  console.log(`Created game directory: gamedata/${sanitizedGameId}/`);

  // Perform initial setup
  const { grid, startingPositions } = performInitialSetup(numPlayers, DEFAULT_CONFIG);

  // Initialize game state
  const initialState: GameState = {
    gameId: sanitizedGameId,
    config: DEFAULT_CONFIG,
    numPlayers,
    initialGrid: grid,
    currentRound: 0,
    rounds: [],
    endCondition: null,
  };

  // Write initial state to file
  await writeFile(stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
  console.log(`Created game state file: gamedata/${sanitizedGameId}/game-state.json`);
  console.log(`\nGame "${sanitizedGameId}" initialized successfully!`);
  console.log(`Players: ${numPlayers}`);
  console.log(`Map: ${DEFAULT_CONFIG.MAP_SIZE}×${DEFAULT_CONFIG.MAP_SIZE}`);
  console.log(`Resource squares: ${Math.ceil((DEFAULT_CONFIG.MAP_SIZE * DEFAULT_CONFIG.MAP_SIZE * DEFAULT_CONFIG.RESOURCE_SQUARE_PCT) / 100)}`);
  console.log(`\nStarting positions:`);
  for (const pos of startingPositions) {
    console.log(`  Player ${pos.playerNumber} (${pos.playerId}): (${pos.coordinate.x}, ${pos.coordinate.y}) with ${DEFAULT_CONFIG.STARTING_UNITS} units`);
  }
  console.log(`\nNext steps:`);
  console.log(`  1. Start round 1 with public discussion`);
}
