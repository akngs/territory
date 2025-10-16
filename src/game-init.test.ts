import { describe, it, expect } from 'vitest';
import { generateStartingPositions, performInitialSetup } from './game-init.ts';
import { DEFAULT_CONFIG } from './types.ts';

describe('generateStartingPositions', () => {
  it('should generate correct count, unique positions on edges', () => {
    const positions = generateStartingPositions(8, 10);

    // Correct count
    expect(positions.length).toBe(8);

    // All on edges
    positions.forEach((pos) => {
      const isOnEdge = pos.x === 0 || pos.x === 9 || pos.y === 0 || pos.y === 9;
      expect(isOnEdge).toBe(true);
    });

    // All unique
    const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`));
    expect(uniquePositions.size).toBe(8);
  });

  it('should work with min/max players and different map sizes', () => {
    expect(generateStartingPositions(3, 10).length).toBe(3);
    expect(generateStartingPositions(20, 10).length).toBe(20);

    const positions = generateStartingPositions(4, 5);
    expect(positions.length).toBe(4);
    positions.forEach((pos) => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThan(5);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThan(5);
    });
  });
});

describe('performInitialSetup', () => {
  it('should create valid initial round', () => {
    const { initialRound, startingPositions } = performInitialSetup(3, DEFAULT_CONFIG);

    // Round properties
    expect(initialRound.roundNumber).toBe(1);
    expect(initialRound.declarations).toEqual([]);
    expect(initialRound.commands).toEqual([]);

    // Grid state
    expect(typeof initialRound.gridState).toBe('string');
    expect(initialRound.gridState.length).toBeGreaterThan(0);

    // Correct number of players
    expect(startingPositions.length).toBe(3);
  });

  it('should assign correct player IDs and numbers', () => {
    const { startingPositions } = performInitialSetup(3, DEFAULT_CONFIG);

    expect(startingPositions[0].playerId).toBe('a');
    expect(startingPositions[0].playerNumber).toBe(1);
    expect(startingPositions[1].playerId).toBe('b');
    expect(startingPositions[1].playerNumber).toBe(2);
    expect(startingPositions[2].playerId).toBe('c');
    expect(startingPositions[2].playerNumber).toBe(3);
  });

  it('should create grid with players and resources', () => {
    const { initialRound, startingPositions } = performInitialSetup(3, DEFAULT_CONFIG);

    // Players placed
    expect(initialRound.gridState.includes('05a')).toBe(true);
    expect(initialRound.gridState.includes('05b')).toBe(true);
    expect(initialRound.gridState.includes('05c')).toBe(true);

    // Correct dimensions
    const gridLines = initialRound.gridState.split('\n');
    expect(gridLines.length).toBe(DEFAULT_CONFIG.MAP_SIZE);
    gridLines.forEach((line) => {
      expect(line.split('|').length).toBe(DEFAULT_CONFIG.MAP_SIZE);
    });

    // Resource squares
    const resourceCount = (initialRound.gridState.match(/\+/g) || []).length;
    const totalSquares = DEFAULT_CONFIG.MAP_SIZE * DEFAULT_CONFIG.MAP_SIZE;
    const expectedResources = Math.ceil(
      (totalSquares * DEFAULT_CONFIG.RESOURCE_SQUARE_PCT) / 100
    );
    expect(resourceCount).toBe(expectedResources);

    // No resources on player positions
    startingPositions.forEach((pos) => {
      const squares = gridLines[pos.coordinate.y].split('|');
      const square = squares[pos.coordinate.x];
      expect(square).toContain(pos.playerId);
      expect(square).not.toContain('+');
    });
  });

  it('should work with custom config', () => {
    const customConfig = { ...DEFAULT_CONFIG, STARTING_UNITS: 10, MAP_SIZE: 5 };
    const { initialRound } = performInitialSetup(3, customConfig);

    const gridLines = initialRound.gridState.split('\n');
    expect(gridLines.length).toBe(5);
    expect(initialRound.gridState.includes('10a')).toBe(true);
  });
});
