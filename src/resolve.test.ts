import { describe, it, expect } from 'vitest';
import { resolveRound } from './resolve.ts';
import type { GameState, Command } from './types.ts';
import { DEFAULT_CONFIG } from './types.ts';
import {
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
  parseGrid,
  type GridSquare,
} from './grid-utils.ts';

const createGame = (
  grid: GridSquare[][],
  commands: Command[][],
  numPlayers: number
): GameState => ({
  gameId: 'test-game',
  config: { ...DEFAULT_CONFIG, MAP_SIZE: grid.length, MAX_ROUNDS: 100 },
  numPlayers,
  currentRound: 1,
  rounds: [{ roundNumber: 1, declarations: [], commands, gridState: serializeGrid(grid) }],
});

const resolve = (grid: GridSquare[][], commands: Command[][], numPlayers: number) =>
  parseGrid(resolveRound(createGame(grid, commands, numPlayers)).gameState.rounds[1].gridState);

describe('resolveRound', () => {
  it('should process simple movement', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 7);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 8);

    const result = resolve(grid, [[{ from: { x: 0, y: 0 }, direction: 'R', unitCount: 3 }], []], 2);

    expect(result[0][0].units).toBe(5); // 7 - 3 + 1 production
    expect(result[1][0].units).toBe(4); // 3 + 1 production
  });

  it('should handle movement leaving source empty', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const result = resolve(grid, [[{ from: { x: 0, y: 0 }, direction: 'R', unitCount: 5 }], []], 2);

    expect(result[0][0].units).toBe(0);
    expect(result[0][0].playerId).toBe('.');
    expect(result[1][0].units).toBe(6); // 5 + 1 production
  });

  it('should resolve combat with clear winner', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 0 }, 'b', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'c', 5);

    const result = resolve(
      grid,
      [
        [{ from: { x: 0, y: 0 }, direction: 'R', unitCount: 10 }],
        [{ from: { x: 2, y: 0 }, direction: 'L', unitCount: 5 }],
        [],
      ],
      3
    );

    expect(result[1][0].units).toBe(6); // 10 - 5 = 5, then +1 production
    expect(result[1][0].playerId).toBe('a');
  });

  it('should handle tie in combat (square becomes neutral)', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 0 }, 'b', 10);

    const result = resolve(
      grid,
      [
        [{ from: { x: 0, y: 0 }, direction: 'R', unitCount: 5 }],
        [{ from: { x: 2, y: 0 }, direction: 'L', unitCount: 5 }],
      ],
      2
    );

    expect(result[1][0].units).toBe(0);
    expect(result[1][0].playerId).toBe('.');
  });

  it('should apply production to occupied squares', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const result = resolve(grid, [[], []], 2);
    expect(result[0][0].units).toBe(6);
  });

  it('should apply resource production bonus', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 7);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 8);
    markResourceSquare(grid, { x: 0, y: 0 });

    const result = resolve(grid, [[], []], 2);
    expect(result[0][0].units).toBe(9);
  });

  it('should respect production cap threshold', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 20);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 20);

    const result = resolve(grid, [[], []], 2);
    expect(result[0][0].units).toBe(21); // 20 + 1 = 21
  });

  it('should create new round after resolution', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 5);

    const result = resolveRound(createGame(grid, [[], []], 2));

    expect(result.gameState.rounds).toHaveLength(2);
    expect(result.gameState.rounds[1].roundNumber).toBe(2);
    expect(result.gameState.currentRound).toBe(2);
  });

  it('should handle multiple movements to same square', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 4, y: 4 }, 'b', 11);

    const result = resolve(
      grid,
      [
        [
          { from: { x: 0, y: 0 }, direction: 'R', unitCount: 3 },
          { from: { x: 0, y: 0 }, direction: 'R', unitCount: 2 },
        ],
        [],
      ],
      2
    );

    expect(result[0][0].units).toBe(6); // 10 - 3 - 2 + 1 production
    expect(result[1][0].units).toBe(6); // 3 + 2 + 1 production
  });

  it('should handle three-way combat', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 1 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 1 }, 'b', 7);
    placeUnits(grid, { x: 1, y: 0 }, 'c', 5);
    placeUnits(grid, { x: 4, y: 4 }, 'd', 3);

    const result = resolve(
      grid,
      [
        [{ from: { x: 0, y: 1 }, direction: 'R', unitCount: 10 }],
        [{ from: { x: 2, y: 1 }, direction: 'L', unitCount: 7 }],
        [{ from: { x: 1, y: 0 }, direction: 'D', unitCount: 5 }],
        [],
      ],
      4
    );

    expect(result[1][1].units).toBe(4); // 10 - 7 = 3, then +1 production
    expect(result[1][1].playerId).toBe('a');
  });

  describe('Regression: Game end should not create new round', () => {
    it('should not create new round when player wins by domination', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 20);
      placeUnits(grid, { x: 1, y: 0 }, 'b', 5);

      const gameState = createGame(grid, [[], []], 2);
      const result = resolveRound(gameState);

      // Player 'a' wins by domination (20+1=21 > 50% of 26)
      expect(result.winner).toBe('a');
      // Should have only 1 round (the initial round), no new round created
      expect(result.gameState.rounds.length).toBe(1);
    });

    it('should not create new round when all players eliminated (annihilation)', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
      placeUnits(grid, { x: 2, y: 0 }, 'b', 5);

      const gameState = createGame(
        grid,
        [
          [{ from: { x: 0, y: 0 }, direction: 'R', unitCount: 5 }],
          [{ from: { x: 2, y: 0 }, direction: 'L', unitCount: 5 }],
        ],
        2
      );
      const result = resolveRound(gameState);

      // Both players move all units to same square, tie in combat, all destroyed
      // However, winner is returned in ResolveResult, which converts null to undefined
      expect(result.winner).toBeUndefined(); // null is converted to undefined in ResolveResult
      expect(result.gameState.winner).toBeNull(); // The actual game state has null
      expect(result.gameState.rounds.length).toBe(1);
    });

    it('should not create new round when max rounds reached (timeout)', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
      placeUnits(grid, { x: 1, y: 0 }, 'b', 8);

      const gameState = createGame(grid, [[], []], 2);
      gameState.rounds[0].roundNumber = 15; // Max rounds
      const result = resolveRound(gameState);

      // Player 'a' wins by timeout
      expect(result.winner).toBe('a');
      expect(result.gameState.rounds.length).toBe(1);
    });
  });
});
