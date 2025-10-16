import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { GameState, GameConfig, RoundRecord, Coordinate } from '../types.ts';
import { DEFAULT_CONFIG } from '../types.ts';
import {
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
  getPlayerIdChar,
} from '../grid-utils.ts';

/**
 * Starting position with player info for display purposes only
 */
interface StartingPosition {
  playerId: string;
  playerNumber: number;
  coordinate: Coordinate;
}

/**
 * Check if a coordinate is on the outer edge of the map
 */
function isOuterEdge(coord: Coordinate, mapSize: number): boolean {
  return coord.x === 0 || coord.x === mapSize - 1 || coord.y === 0 || coord.y === mapSize - 1;
}

/**
 * Get all outer edge coordinates
 */
function getOuterEdgeCoordinates(mapSize: number): Coordinate[] {
  const edges: Coordinate[] = [];

  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      if (isOuterEdge({ x, y }, mapSize)) {
        edges.push({ x, y });
      }
    }
  }

  return edges;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate random starting positions for players on the outer edge
 */
export function generateStartingPositions(numPlayers: number, mapSize: number): Coordinate[] {
  const outerEdge = getOuterEdgeCoordinates(mapSize);
  const shuffled = shuffle(outerEdge);
  return shuffled.slice(0, numPlayers);
}

/**
 * Perform complete initial setup for a new game
 */
export function performInitialSetup(
  numPlayers: number,
  config: GameConfig
): { initialRound: RoundRecord; startingPositions: StartingPosition[] } {
  // 1. Generate starting positions on outer edge
  const startingCoords = generateStartingPositions(numPlayers, config.MAP_SIZE);

  // 2. Create starting positions with player IDs for display
  const startingPositions: StartingPosition[] = [];
  for (let i = 0; i < numPlayers; i++) {
    startingPositions.push({
      playerId: getPlayerIdChar(i),
      playerNumber: i + 1,
      coordinate: startingCoords[i],
    });
  }

  // 3. Create empty grid
  const gridBuilder = createEmptyGridBuilder(config.MAP_SIZE);

  // 4. Place starting units
  for (const pos of startingPositions) {
    placeUnits(gridBuilder, pos.coordinate, pos.playerId, config.STARTING_UNITS);
  }

  // 5. Select resource squares (excluding player starting positions)
  const totalSquares = config.MAP_SIZE * config.MAP_SIZE;
  const numResourceSquares = Math.ceil((totalSquares * config.RESOURCE_SQUARE_PCT) / 100);

  // Get all coordinates except starting positions
  const availableCoords: Coordinate[] = [];
  for (let x = 0; x < config.MAP_SIZE; x++) {
    for (let y = 0; y < config.MAP_SIZE; y++) {
      const isStarting = startingCoords.some(pos => pos.x === x && pos.y === y);
      if (!isStarting) {
        availableCoords.push({ x, y });
      }
    }
  }

  // Randomly select and mark resource squares
  const shuffled = shuffle(availableCoords);
  const resourceCoords = shuffled.slice(0, numResourceSquares);
  for (const coord of resourceCoords) {
    markResourceSquare(gridBuilder, coord);
  }

  // 6. Serialize grid to compact format
  const grid = serializeGrid(gridBuilder);

  // 7. Create initial round record (round 1)
  const initialRound: RoundRecord = {
    roundNumber: 1,
    declarations: [],
    commands: [],
    gridState: grid,
  };

  return { initialRound, startingPositions };
}

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

  // Perform initial setup
  const { initialRound, startingPositions } = performInitialSetup(numPlayers, DEFAULT_CONFIG);

  // Initialize game state
  const initialState: GameState = {
    gameId: sanitizedGameId,
    config: DEFAULT_CONFIG,
    numPlayers,
    currentRound: 1,
    rounds: [initialRound],
  };

  // Write initial state to file
  await writeFile(stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
}
