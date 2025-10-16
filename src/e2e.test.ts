import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GameState } from './types.ts';
import { parseGrid } from './grid-utils.ts';

const execPromise = promisify(exec);
const TEST_GAME_ID = 'e2e-test-game';
const TEST_GAME_PATH = `gamedata/${TEST_GAME_ID}`;
const CLI_PATH = './src/cli.ts';

describe('End-to-End Game Flow', () => {
  beforeEach(async () => {
    await fs.rm(TEST_GAME_PATH, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_GAME_PATH, { recursive: true, force: true });
  });

  it('should play complete game with declarations, movement, and production', async () => {
    // Initialize
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    let gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    expect(gameState.gameId).toBe(TEST_GAME_ID);
    expect(gameState.numPlayers).toBe(3);
    expect(gameState.currentRound).toBe(1);

    // Verify initial setup
    const initialGrid = parseGrid(gameState.rounds[0].gridState);
    let playerAUnits = 0;
    let playerBUnits = 0;
    let playerCUnits = 0;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (initialGrid[x][y].playerId === 'a') playerAUnits += initialGrid[x][y].units;
        if (initialGrid[x][y].playerId === 'b') playerBUnits += initialGrid[x][y].units;
        if (initialGrid[x][y].playerId === 'c') playerCUnits += initialGrid[x][y].units;
      }
    }

    expect(playerAUnits).toBe(5);
    expect(playerBUnits).toBe(5);
    expect(playerCUnits).toBe(5);

    // Declarations
    await execPromise(`echo "War!\\nDefend!\\nWatch!\\n" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);
    await execPromise(`echo "Attack!\\nHold!\\nWait!\\n" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);

    gameState = JSON.parse(await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8'));
    expect(gameState.rounds[0].declarations).toHaveLength(6);

    // Find player positions
    let playerAPos: { x: number; y: number } | null = null;
    let playerBPos: { x: number; y: number } | null = null;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (initialGrid[x][y].playerId === 'a') playerAPos = { x, y };
        if (initialGrid[x][y].playerId === 'b') playerBPos = { x, y };
      }
    }

    // Submit commands
    const direction = playerAPos!.x === 0 ? 'R' : playerAPos!.x === 9 ? 'L' : 'R';
    const cmdInput = `${playerAPos!.x},${playerAPos!.y},${direction},2\\n\\n\\n`;
    await execPromise(`echo "${cmdInput}" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

    gameState = JSON.parse(await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8'));

    // Verify round resolved
    expect(gameState.rounds[0].commands[0]).toHaveLength(1);
    expect(gameState.rounds).toHaveLength(2);
    expect(gameState.currentRound).toBe(2);

    // Verify production applied
    const round1Grid = parseGrid(gameState.rounds[0].gridState);
    const sourceSquare = round1Grid[playerAPos!.x][playerAPos!.y];
    expect(sourceSquare.units).toBe(4); // 5 - 2 + 1 production
    expect(round1Grid[playerBPos!.x][playerBPos!.y].units).toBe(6); // 5 + 1 production
  });

  it('should handle combat and game over by domination', async () => {
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    let gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Set up domination scenario
    const grid = parseGrid(gameState.rounds[0].gridState);
    grid[4][4] = { units: 20, playerId: 'a', isResource: false };
    grid[5][4] = { units: 1, playerId: 'b', isResource: false };
    grid[6][4] = { units: 1, playerId: 'c', isResource: false };

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!((x === 4 && y === 4) || (x === 5 && y === 4) || (x === 6 && y === 4))) {
          grid[x][y] = { units: 0, playerId: '.', isResource: grid[x][y].isResource };
        }
      }
    }

    const { serializeGrid } = await import('./grid-utils.ts');
    gameState.rounds[0].gridState = serializeGrid(grid);
    gameState.rounds[0].declarations = [
      '', '', '', '', '', ''
    ];

    await fs.writeFile(
      `${TEST_GAME_PATH}/game-state.json`,
      JSON.stringify(gameState, null, 2)
    );

    // Submit no-op commands
    await execPromise(`echo "\\n\\n\\n" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

    gameState = JSON.parse(await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8'));

    // Game should end (no new round created)
    expect(gameState.rounds).toHaveLength(1);
    expect(gameState.currentRound).toBe(1);

    // Verify domination: A has 21/(21+2+2) = 84% > 50%
    const resolvedGrid = parseGrid(gameState.rounds[0].gridState);
    let finalAUnits = 0;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (resolvedGrid[x][y].playerId === 'a') finalAUnits += resolvedGrid[x][y].units;
      }
    }

    expect(finalAUnits).toBe(21);
  });

  it('should handle multiple rounds of gameplay', async () => {
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    // Play through 3 rounds
    for (let round = 1; round <= 3; round++) {
      await execPromise(`echo "R${round}-A\\nR${round}-B\\nR${round}-C\\n" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);
      await execPromise(`echo "Go!\\nGo!\\nGo!\\n" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);
      await execPromise(`echo "\\n\\n\\n" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);
    }

    const gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Should have completed 3 rounds
    expect(gameState.rounds[0].declarations).toHaveLength(6);
    expect(gameState.rounds[1].declarations).toHaveLength(6);
    expect(gameState.rounds[2].declarations).toHaveLength(6);
  });
});
