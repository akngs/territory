import type { Coordinate, GridState, Player, GameConfig } from './types.ts';
import {
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
  getPlayerIdChar,
} from './grid-utils.ts';

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
 * Initialize players with starting positions
 */
export function initializePlayers(
  numPlayers: number,
  startingPositions: Coordinate[]
): Player[] {
  const players: Player[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = getPlayerIdChar(i);
    players.push({
      id: playerId,
      name: `Player ${i + 1}`,
      startingSquare: startingPositions[i],
      isEliminated: false,
    });
  }

  return players;
}

/**
 * Perform complete initial setup for a new game
 */
export function performInitialSetup(
  numPlayers: number,
  config: GameConfig
): { grid: GridState; players: Player[] } {
  // 1. Generate starting positions on outer edge
  const startingPositions = generateStartingPositions(numPlayers, config.MAP_SIZE);

  // 2. Initialize players
  const players = initializePlayers(numPlayers, startingPositions);

  // 3. Create empty grid
  const gridBuilder = createEmptyGridBuilder(config.MAP_SIZE);

  // 4. Place starting units
  for (const player of players) {
    placeUnits(gridBuilder, player.startingSquare, player.id, config.STARTING_UNITS);
  }

  // 5. Select resource squares (excluding player starting positions)
  const totalSquares = config.MAP_SIZE * config.MAP_SIZE;
  const numResourceSquares = Math.ceil((totalSquares * config.RESOURCE_SQUARE_PCT) / 100);

  // Get all coordinates except starting positions
  const availableCoords: Coordinate[] = [];
  for (let x = 0; x < config.MAP_SIZE; x++) {
    for (let y = 0; y < config.MAP_SIZE; y++) {
      const isStarting = startingPositions.some(pos => pos.x === x && pos.y === y);
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

  return { grid, players };
}
