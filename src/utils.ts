import { promises as fs } from 'fs';
import { createInterface } from 'readline';
import type { GameState, Coordinate, Direction } from './types.ts';

/**
 * Read n lines from stdin
 */
export async function readLines(count: number): Promise<string[]> {
  const lines: string[] = [];
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= count) {
      rl.close();
      break;
    }
  }

  return lines;
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
 */
export async function loadGameState(gameId: string): Promise<GameState> {
  const gamePath = `gamedata/${gameId}/game-state.json`;

  try {
    const data = await fs.readFile(gamePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Game "${gameId}" not found in gamedata/ directory`);
      console.error(`Hint: Use 'init <game_id> <num_players>' to create a new game`);
    } else {
      console.error(`Error loading game: ${error.message}`);
    }
    process.exit(1);
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
