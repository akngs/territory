import { describe, it, expect } from 'vitest';
import { resolveRound } from './resolve.ts';
import type { GameState, RoundRecord } from './types.ts';
import { DEFAULT_CONFIG } from './types.ts';
import {
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
  parseGrid,
} from './grid-utils.ts';

describe('resolveRound', () => {
  it('should process simple movement', () => {
    // Create a 5x5 grid with balanced units to avoid domination
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 7);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 8);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 3,
              },
            ],
            [], // Player b has no commands
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);

    // Round 0 should show state BEFORE resolution
    const beforeGrid = parseGrid(result.gameState.rounds[0].gridState);
    expect(beforeGrid[0][0].units).toBe(7);

    // Round 1 should show state AFTER resolution
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Source square should have 5 units (7 - 3 = 4, then +1 production)
    expect(resolvedGrid[0][0].units).toBe(5);
    expect(resolvedGrid[0][0].playerId).toBe('a');

    // Target square (0,0) -> R = (1,0) should have 4 units (3 moved + 1 production)
    expect(resolvedGrid[1][0].units).toBe(4);
    expect(resolvedGrid[1][0].playerId).toBe('a');
  });

  it('should handle movement leaving source empty', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 5,
              },
            ],
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Source should be neutral (no production for neutral squares)
    expect(resolvedGrid[0][0].units).toBe(0);
    expect(resolvedGrid[0][0].playerId).toBe('.');

    // Target should have 6 units (5 moved + 1 production)
    expect(resolvedGrid[1][0].units).toBe(6);
    expect(resolvedGrid[1][0].playerId).toBe('a');
  });

  it('should resolve combat with clear winner', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10); // Player a: 10 units
    placeUnits(grid, { x: 2, y: 0 }, 'b', 5); // Player b: 5 units
    placeUnits(grid, { x: 4, y: 4 }, 'c', 5); // Player c: 5 units for balance

    // After combat at (1,0): a wins with 10-5=5 units, +1 production = 6
    // After production: a=6, c=6 total=12, no one has >6 (50%)

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 3,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 10,
              },
            ],
            [
              {
                from: { x: 2, y: 0 },
                direction: 'L',
                unitCount: 5,
              },
            ],
            [], // Player c has no commands
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Players a and b meet at (1,0)
    // Player a: 10 units, Player b: 5 units
    // Winner: a with 10 - 5 = 5 units, then +1 production = 6
    expect(resolvedGrid[1][0].units).toBe(6);
    expect(resolvedGrid[1][0].playerId).toBe('a');
  });

  it('should handle tie in combat (square becomes neutral)', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 2, y: 0 }, 'b', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 5,
              },
            ],
            [
              {
                from: { x: 2, y: 0 },
                direction: 'L',
                unitCount: 5,
              },
            ],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Tie at (1,0) - should be neutral
    expect(resolvedGrid[1][0].units).toBe(0);
    expect(resolvedGrid[1][0].playerId).toBe('.');
  });

  it('should apply production to occupied squares', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [], // No movements for player a
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Should gain 1 unit from production (BASE_PRODUCTION = 1)
    expect(resolvedGrid[0][0].units).toBe(6);
  });

  it('should apply resource production bonus', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 7);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 8);
    markResourceSquare(grid, { x: 0, y: 0 });

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [[], []],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Should gain 2 units from resource production (RESOURCE_PRODUCTION = 2)
    expect(resolvedGrid[0][0].units).toBe(9);
  });

  it('should respect production cap', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 20); // Near cap
    placeUnits(grid, { x: 4, y: 4 }, 'b', 20); // Equal units to avoid domination

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [[], []],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Should cap at 21 (PRODUCTION_CAP = 21)
    expect(resolvedGrid[0][0].units).toBe(21);
  });

  it('should create new round after resolution', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [[], []],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);

    // Should have 2 rounds now
    expect(result.gameState.rounds).toHaveLength(2);
    expect(result.gameState.rounds[1].roundNumber).toBe(2);
    expect(result.gameState.currentRound).toBe(2);

    // New round should have empty commands and declarations
    expect(result.gameState.rounds[1].declarations).toEqual([]);
    expect(result.gameState.rounds[1].commands).toEqual([]);
  });

  it('should handle multiple movements to same square', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 11);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 3,
              },
              {
                from: { x: 0, y: 0 },
                direction: 'R',
                unitCount: 2,
              },
            ],
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Source should have 6 units (10 - 3 - 2 = 5, then +1 production)
    expect(resolvedGrid[0][0].units).toBe(6);

    // Target should have 6 units (3 + 2 = 5, then +1 production)
    expect(resolvedGrid[1][0].units).toBe(6);
  });

  it('should handle three-way combat', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 1 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 1 }, 'b', 7);
    placeUnits(grid, { x: 1, y: 0 }, 'c', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'd', 3); // Player d for balance

    // After combat at (1,1): a=10, b=7, c=5 → a wins with 10-7=3, +1 prod = 4
    // After production: a=4, d=4 total=8, each has exactly 50% (tie, no winner)

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5, MAX_ROUNDS: 100 },
      numPlayers: 4,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [
              {
                from: { x: 0, y: 1 },
                direction: 'R',
                unitCount: 10,
              },
            ],
            [
              {
                from: { x: 2, y: 1 },
                direction: 'L',
                unitCount: 7,
              },
            ],
            [
              {
                from: { x: 1, y: 0 },
                direction: 'D',
                unitCount: 5,
              },
            ],
            [], // Player d has no commands
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.gameState.rounds[1].gridState);

    // Players a, b, c meet at (1,1)
    // Player a: 10, b: 7, c: 5
    // Winner: a with 10 - 7 = 3 units, then +1 production = 4
    expect(resolvedGrid[1][1].units).toBe(4);
    expect(resolvedGrid[1][1].playerId).toBe('a');
  });
});
