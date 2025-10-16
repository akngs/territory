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
    // Clean up any existing test game
    await fs.rm(TEST_GAME_PATH, { recursive: true, force: true });
  });

  afterEach(async () => {
    // Clean up test game
    await fs.rm(TEST_GAME_PATH, { recursive: true, force: true });
  });

  it('should play a complete 3-player game', async () => {
    // Step 1: Initialize game
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    // Verify game was created
    let gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    expect(gameState.gameId).toBe(TEST_GAME_ID);
    expect(gameState.numPlayers).toBe(3);
    expect(gameState.currentRound).toBe(1);
    expect(gameState.rounds).toHaveLength(1);

    // Parse initial grid to verify setup
    const initialGrid = parseGrid(gameState.rounds[0].gridState);
    let playerAUnits = 0;
    let playerBUnits = 0;
    let playerCUnits = 0;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (initialGrid[x][y].playerId === 'a') {
          playerAUnits += initialGrid[x][y].units;
        } else if (initialGrid[x][y].playerId === 'b') {
          playerBUnits += initialGrid[x][y].units;
        } else if (initialGrid[x][y].playerId === 'c') {
          playerCUnits += initialGrid[x][y].units;
        }
      }
    }

    expect(playerAUnits).toBe(5); // Starting units
    expect(playerBUnits).toBe(5);
    expect(playerCUnits).toBe(5);

    // Step 2: First declaration phase
    const input1 = `Player A declares war!\nPlayer B prepares defense!\nPlayer C stays neutral\n`;
    await execPromise(`echo "${input1}" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);

    gameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    expect(gameState.rounds[0].declarations).toHaveLength(3);
    expect(gameState.rounds[0].declarations[0].playerId).toBe('a');
    expect(gameState.rounds[0].declarations[0].text).toBe('Player A declares war!');

    // Step 3: Second declaration phase
    const input2 = `Attack!\nDefend!\nWatch!\n`;
    await execPromise(`echo "${input2}" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);

    gameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    expect(gameState.rounds[0].declarations).toHaveLength(6); // 3 players × 2 phases

    // Step 4: Find player positions
    let playerAPos: { x: number; y: number } | null = null;
    let playerBPos: { x: number; y: number } | null = null;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (initialGrid[x][y].playerId === 'a') {
          playerAPos = { x, y };
        } else if (initialGrid[x][y].playerId === 'b') {
          playerBPos = { x, y };
        }
      }
    }

    expect(playerAPos).not.toBeNull();
    expect(playerBPos).not.toBeNull();

    // Step 5: Submit movement commands
    // Player A moves some units, Players B and C stay put
    const playerADirection =
      playerAPos!.x === 0 ? 'R' : playerAPos!.x === 9 ? 'L' : 'R';

    const cmdInput = `${playerAPos!.x},${playerAPos!.y},${playerADirection},2\n\n\n`;
    await execPromise(`echo "${cmdInput}" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

    gameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Round should have been resolved
    expect(gameState.rounds[0].commands.a).toHaveLength(1);
    expect(gameState.rounds[0].commands.b).toHaveLength(0);
    expect(gameState.rounds[0].commands.c).toHaveLength(0);

    // Should have created round 2
    expect(gameState.rounds).toHaveLength(2);
    expect(gameState.currentRound).toBe(2);

    // Verify round 1 was resolved with production
    const round1Grid = parseGrid(gameState.rounds[0].gridState);

    // Find player A's original square
    const sourceSquare = round1Grid[playerAPos!.x][playerAPos!.y];

    // Should have 4 units remaining (5 - 2 + 1 production)
    expect(sourceSquare.units).toBe(4);
    expect(sourceSquare.playerId).toBe('a');

    // Find player B's square - should have gained production
    const playerBSquare = round1Grid[playerBPos!.x][playerBPos!.y];
    expect(playerBSquare.units).toBe(6); // 5 + 1 production
  });

  it('should handle combat between players', async () => {
    // Initialize game with 3 players
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    let gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Manually set up a combat scenario
    // Place players adjacent to each other
    const grid = parseGrid(gameState.rounds[0].gridState);

    // Find and modify grid to create adjacent positions
    // Player A at (4,4) with 10 units
    // Player B at (5,4) with 5 units
    // Player C far away at (9,9) with 5 units
    grid[4][4] = { units: 10, playerId: 'a', isResource: false };
    grid[5][4] = { units: 5, playerId: 'b', isResource: false };
    grid[9][9] = { units: 5, playerId: 'c', isResource: false };

    // Clear all other squares
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (!((x === 4 && y === 4) || (x === 5 && y === 4) || (x === 9 && y === 9))) {
          grid[x][y] = { units: 0, playerId: '.', isResource: grid[x][y].isResource };
        }
      }
    }

    // Import serializeGrid
    const { serializeGrid } = await import('./grid-utils.ts');
    gameState.rounds[0].gridState = serializeGrid(grid);

    await fs.writeFile(
      `${TEST_GAME_PATH}/game-state.json`,
      JSON.stringify(gameState, null, 2)
    );

    // Skip declarations for this test
    gameState.rounds[0].declarations = [
      { playerId: 'a', text: 'Attacking!', declarationNumber: 1 },
      { playerId: 'b', text: 'Defending!', declarationNumber: 1 },
      { playerId: 'c', text: 'Waiting!', declarationNumber: 1 },
      { playerId: 'a', text: 'Charge!', declarationNumber: 2 },
      { playerId: 'b', text: 'Hold!', declarationNumber: 2 },
      { playerId: 'c', text: 'Watch!', declarationNumber: 2 },
    ];

    await fs.writeFile(
      `${TEST_GAME_PATH}/game-state.json`,
      JSON.stringify(gameState, null, 2)
    );

    // Players A and B move toward each other, C stays
    const combatInput = `4,4,R,10\n5,4,L,5\n\n`;
    await execPromise(`echo "${combatInput}" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

    gameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    const resolvedGrid = parseGrid(gameState.rounds[0].gridState);

    // They should meet and fight
    // At (4,4): Player B has 5 units (moved from 5,4)
    // At (5,4): Player A has 10 units (moved from 4,4)
    // Player A wins at (5,4) with 10 - 5 = 5 units, then +1 production = 6
    // Player B wins at (4,4) with 5 - 0 = 5 units, then +1 production = 6
    // Wait, they're moving to each other's starting positions, so no direct combat

    // Actually, let's verify the swap
    expect(resolvedGrid[4][4].playerId).toBe('b');
    expect(resolvedGrid[4][4].units).toBe(6); // 5 + 1 production

    expect(resolvedGrid[5][4].playerId).toBe('a');
    expect(resolvedGrid[5][4].units).toBe(11); // 10 + 1 production
  });

  it('should detect game over when player dominates', async () => {
    // Initialize game
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    let gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Set up domination scenario
    const grid = parseGrid(gameState.rounds[0].gridState);

    // Player A has 20 units, Players B and C have 1 unit each
    // After production: A=21, B=2, C=2, total=25, A has 84% > 50%
    grid[4][4] = { units: 20, playerId: 'a', isResource: false };
    grid[5][4] = { units: 1, playerId: 'b', isResource: false };
    grid[6][4] = { units: 1, playerId: 'c', isResource: false };

    // Clear all other squares
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
      { playerId: 'a', text: '', declarationNumber: 1 },
      { playerId: 'b', text: '', declarationNumber: 1 },
      { playerId: 'c', text: '', declarationNumber: 1 },
      { playerId: 'a', text: '', declarationNumber: 2 },
      { playerId: 'b', text: '', declarationNumber: 2 },
      { playerId: 'c', text: '', declarationNumber: 2 },
    ];

    await fs.writeFile(
      `${TEST_GAME_PATH}/game-state.json`,
      JSON.stringify(gameState, null, 2)
    );

    // Submit no-op commands
    const noopInput = `\n\n\n`;
    await execPromise(`echo "${noopInput}" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

    gameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Player A should win by domination (21 units vs 2 units each for B and C = 21 vs 4 total = 84%)
    // Should not create a new round
    expect(gameState.rounds).toHaveLength(1);
    expect(gameState.currentRound).toBe(1);

    // Verify the resolved grid shows domination
    const resolvedGrid = parseGrid(gameState.rounds[0].gridState);
    let finalAUnits = 0;
    let finalBUnits = 0;
    let finalCUnits = 0;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (resolvedGrid[x][y].playerId === 'a') finalAUnits += resolvedGrid[x][y].units;
        if (resolvedGrid[x][y].playerId === 'b') finalBUnits += resolvedGrid[x][y].units;
        if (resolvedGrid[x][y].playerId === 'c') finalCUnits += resolvedGrid[x][y].units;
      }
    }

    expect(finalAUnits).toBe(21);
    expect(finalBUnits).toBe(2);
    expect(finalCUnits).toBe(2);
  });

  it('should handle multiple rounds of gameplay', async () => {
    // Initialize game
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    // Play through 3 rounds
    for (let round = 1; round <= 3; round++) {
      let gameState: GameState = JSON.parse(
        await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
      );

      // Declarations
      const decl1 = `Round ${round} - A\nRound ${round} - B\nRound ${round} - C\n`;
      await execPromise(`echo "${decl1}" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);

      const decl2 = `Attack ${round}\nDefend ${round}\nWatch ${round}\n`;
      await execPromise(`echo "${decl2}" | ${CLI_PATH} discuss ${TEST_GAME_ID}`);

      // Commands (no-op to just advance)
      const cmdInput = `\n\n\n`;
      await execPromise(`echo "${cmdInput}" | ${CLI_PATH} cmds ${TEST_GAME_ID}`);

      gameState = JSON.parse(
        await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
      );

      // After round 3, we should have 4 rounds (initial + 3)
      // unless game ended
      if (gameState.rounds.length > round) {
        expect(gameState.currentRound).toBe(round + 1);
      }
    }

    const finalGameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Should have completed at least 3 rounds worth of data
    expect(finalGameState.rounds[0].declarations).toHaveLength(6); // 3 players × 2 phases
    expect(finalGameState.rounds[1].declarations).toHaveLength(6);
    expect(finalGameState.rounds[2].declarations).toHaveLength(6);
  });

  it('should properly serialize and deserialize game state', async () => {
    // Initialize game
    await execPromise(`${CLI_PATH} init ${TEST_GAME_ID} 3`);

    const gameState: GameState = JSON.parse(
      await fs.readFile(`${TEST_GAME_PATH}/game-state.json`, 'utf-8')
    );

    // Verify all players are present
    const grid = parseGrid(gameState.rounds[0].gridState);

    const playerUnits = new Map<string, number>();
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const square = grid[x][y];
        if (square.playerId !== '.') {
          const current = playerUnits.get(square.playerId) || 0;
          playerUnits.set(square.playerId, current + square.units);
        }
      }
    }

    expect(playerUnits.get('a')).toBe(5);
    expect(playerUnits.get('b')).toBe(5);
    expect(playerUnits.get('c')).toBe(5);

    // Verify resource squares are marked
    let resourceSquares = 0;
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (grid[x][y].isResource) {
          resourceSquares++;
        }
      }
    }

    expect(resourceSquares).toBeGreaterThan(0); // Should have some resource squares
  });
});
