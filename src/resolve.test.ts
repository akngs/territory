import { describe, it, expect } from 'vitest';
import { resolveRound } from './resolve.ts';
import type { GameState, RoundRecord } from './types.ts';
import { DEFAULT_CONFIG } from './types.ts';
import { createEmptyGridBuilder, placeUnits, markResourceSquare, serializeGrid, parseGrid } from './grid-utils.ts';

describe('resolveRound', () => {
  it('should process simple movement', () => {
    // Create a 5x5 grid with player a at (0,0) with 5 units
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
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
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Source square should have 3 units (5 - 3 = 2, then +1 production)
    expect(resolvedGrid[0][0].units).toBe(3);
    expect(resolvedGrid[0][0].playerId).toBe('a');

    // Target square (0,0) -> R = (1,0) should have 4 units (3 moved + 1 production)
    expect(resolvedGrid[1][0].units).toBe(4);
    expect(resolvedGrid[1][0].playerId).toBe('a');
  });

  it('should handle movement leaving source empty', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
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
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

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
    placeUnits(grid, { x: 2, y: 0 }, 'b', 5);  // Player b: 5 units

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
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
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Both should meet at (1,0)
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
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
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
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Tie at (1,0) - should be neutral
    expect(resolvedGrid[1][0].units).toBe(0);
    expect(resolvedGrid[1][0].playerId).toBe('.');
  });

  it('should apply production to occupied squares', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [], // No movements for player a
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Should gain 1 unit from production (BASE_PRODUCTION = 1)
    expect(resolvedGrid[0][0].units).toBe(6);
  });

  it('should apply resource production bonus', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    markResourceSquare(grid, { x: 0, y: 0 });

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Should gain 2 units from resource production (RESOURCE_PRODUCTION = 2)
    expect(resolvedGrid[0][0].units).toBe(7);
  });

  it('should respect production cap', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 20); // Near cap

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // Should cap at 21 (PRODUCTION_CAP = 21)
    expect(resolvedGrid[0][0].units).toBe(21);
  });

  it('should create new round after resolution', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 2,
      currentRound: 1,
      rounds: [
        {
          roundNumber: 1,
          declarations: [],
          commands: [
            [],
            [],
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);

    // Should have 2 rounds now
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[1].roundNumber).toBe(2);
    expect(result.currentRound).toBe(2);

    // New round should have empty commands and declarations
    expect(result.rounds[1].declarations).toEqual([]);
    expect(result.rounds[1].commands).toEqual([]);
  });

  it('should handle multiple movements to same square', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 1,
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
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

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

    const gameState: GameState = {
      gameId: 'test-game',
      config: { ...DEFAULT_CONFIG, MAP_SIZE: 5 },
      numPlayers: 3,
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
          ],
          gridState: serializeGrid(grid),
        },
      ],
    };

    const result = resolveRound(gameState);
    const resolvedGrid = parseGrid(result.rounds[0].gridState);

    // All meet at (1,1)
    // Player a: 10, b: 7, c: 5
    // Winner: a with 10 - 7 = 3 units, then +1 production = 4
    expect(resolvedGrid[1][1].units).toBe(4);
    expect(resolvedGrid[1][1].playerId).toBe('a');
  });
});
