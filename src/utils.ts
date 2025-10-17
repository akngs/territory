import { promises as fs } from 'fs';
import { createInterface } from 'readline';
import type { GameState, Coordinate, Direction } from './types.ts';

/**
 * Read n lines from stdin
 * @param count Number of lines to read
 * @returns Array of lines read from stdin
 * @throws {Error} If EOF is reached before reading all lines
 */
export async function readLines(count: number): Promise<string[]> {
  const lines: string[] = [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return new Promise((resolve, reject) => {
    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length >= count) {
        rl.close();
      }
    });

    rl.on('close', () => {
      if (lines.length < count) {
        reject(new Error(`Expected ${count} lines but only received ${lines.length} before EOF`));
      } else {
        resolve(lines);
      }
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get the target coordinate after moving in a direction
 */
export function getTargetCoord(from: Coordinate, direction: Direction): Coordinate {
  switch (direction) {
    case 'U':
      return { x: from.x, y: from.y - 1 };
    case 'D':
      return { x: from.x, y: from.y + 1 };
    case 'L':
      return { x: from.x - 1, y: from.y };
    case 'R':
      return { x: from.x + 1, y: from.y };
  }
}

/**
 * Load game state from file system
 * @throws {Error} If game is not found or cannot be loaded
 */
export async function loadGameState(gameId: string): Promise<GameState> {
  const gamePath = `gamedata/${gameId}/game-state.json`;

  try {
    const data = await fs.readFile(gamePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `Game "${gameId}" not found in gamedata/ directory. Hint: Use 'init <game_id> <num_players>' to create a new game`
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load game: ${message}`);
  }
}

/**
 * Save game state to file system
 */
export async function saveGameState(gameId: string, gameState: GameState): Promise<void> {
  const gamePath = `gamedata/${gameId}/game-state.json`;
  await fs.writeFile(gamePath, JSON.stringify(gameState, null, 2));
}

/**
 * Check if a direction is valid
 */
export function isValidDirection(dir: string): dir is Direction {
  return dir === 'U' || dir === 'D' || dir === 'L' || dir === 'R';
}

/**
 * Get the opposite direction
 */
export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case 'U':
      return 'D';
    case 'D':
      return 'U';
    case 'L':
      return 'R';
    case 'R':
      return 'L';
  }
}

/**
 * Check if two coordinates are equal
 */
export function coordinatesEqual(c1: Coordinate, c2: Coordinate): boolean {
  return c1.x === c2.x && c1.y === c2.y;
}

/**
 * Get a string key for a coordinate (for use in Map/Set)
 */
export function getCoordinateKey(coord: Coordinate): string {
  return `${coord.x},${coord.y}`;
}

/**
 * Parse a coordinate from a coordinate key string
 */
export function parseCoordinateKey(key: string): Coordinate {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}
