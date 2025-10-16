import type { Coordinate, GridState, Player, Square, GameConfig } from './types.ts';

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
 * Initialize an empty grid
 */
export function createEmptyGrid(mapSize: number): GridState {
  const grid: GridState = [];

  for (let x = 0; x < mapSize; x++) {
    grid[x] = [];
    for (let y = 0; y < mapSize; y++) {
      const square: Square = {
        coordinate: { x, y },
        isResource: false,
        units: {},
        controller: null,
      };
      grid[x][y] = square;
    }
  }

  return grid;
}

/**
 * Select random resource squares (excluding player starting positions)
 */
export function selectResourceSquares(
  grid: GridState,
  startingPositions: Coordinate[],
  resourcePct: number,
  mapSize: number
): void {
  const totalSquares = mapSize * mapSize;
  const numResourceSquares = Math.ceil((totalSquares * resourcePct) / 100);

  // Get all coordinates except starting positions
  const availableCoords: Coordinate[] = [];
  for (let x = 0; x < mapSize; x++) {
    for (let y = 0; y < mapSize; y++) {
      const isStarting = startingPositions.some(pos => pos.x === x && pos.y === y);
      if (!isStarting) {
        availableCoords.push({ x, y });
      }
    }
  }

  // Randomly select resource squares
  const shuffled = shuffle(availableCoords);
  const resourceCoords = shuffled.slice(0, numResourceSquares);

  // Mark squares as resource squares
  for (const coord of resourceCoords) {
    grid[coord.x][coord.y].isResource = true;
  }
}

/**
 * Initialize players with starting positions and units
 */
export function initializePlayers(
  gameId: string,
  numPlayers: number,
  startingPositions: Coordinate[],
  startingUnits: number
): Player[] {
  const players: Player[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const playerId = `${gameId}-p${i + 1}`;
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
 * Place starting units on the grid for each player
 */
export function placeStartingUnits(
  grid: GridState,
  players: Player[],
  startingUnits: number
): void {
  for (const player of players) {
    const { x, y } = player.startingSquare;
    grid[x][y].units[player.id] = startingUnits;
    grid[x][y].controller = player.id;
  }
}

/**
 * Perform complete initial setup for a new game
 */
export function performInitialSetup(
  gameId: string,
  numPlayers: number,
  config: GameConfig
): { grid: GridState; players: Player[] } {
  // 1. Generate starting positions on outer edge
  const startingPositions = generateStartingPositions(numPlayers, config.MAP_SIZE);

  // 2. Create empty grid
  const grid = createEmptyGrid(config.MAP_SIZE);

  // 3. Initialize players
  const players = initializePlayers(gameId, numPlayers, startingPositions, config.STARTING_UNITS);

  // 4. Place starting units
  placeStartingUnits(grid, players, config.STARTING_UNITS);

  // 5. Select resource squares
  selectResourceSquares(grid, startingPositions, config.RESOURCE_SQUARE_PCT, config.MAP_SIZE);

  return { grid, players };
}
