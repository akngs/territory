import { describe, it, expect } from 'vitest';
import { generateStartingPositions, performInitialSetup } from './game-init.ts';
import { DEFAULT_CONFIG } from './types.ts';

describe('generateStartingPositions', () => {
  it('should generate correct number of positions', () => {
    const positions = generateStartingPositions(5, 10);
    expect(positions.length).toBe(5);
  });

  it('should place all players on outer edge', () => {
    const positions = generateStartingPositions(8, 10);
    const mapSize = 10;

    positions.forEach((pos) => {
      const isOnEdge =
        pos.x === 0 || pos.x === mapSize - 1 || pos.y === 0 || pos.y === mapSize - 1;
      expect(isOnEdge).toBe(true);
    });
  });

  it('should generate unique positions', () => {
    const positions = generateStartingPositions(10, 10);
    const uniquePositions = new Set(positions.map((p) => `${p.x},${p.y}`));
    expect(uniquePositions.size).toBe(positions.length);
  });

  it('should handle minimum players', () => {
    const positions = generateStartingPositions(3, 10);
    expect(positions.length).toBe(3);
  });

  it('should handle maximum players', () => {
    const positions = generateStartingPositions(20, 10);
    expect(positions.length).toBe(20);
  });

  it('should work with different map sizes', () => {
    const positions5 = generateStartingPositions(4, 5);
    const positions15 = generateStartingPositions(4, 15);

    expect(positions5.length).toBe(4);
    expect(positions15.length).toBe(4);

    positions5.forEach((pos) => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThan(5);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThan(5);
    });
  });
});

describe('performInitialSetup', () => {
  it('should create initial round with round number 1', () => {
    const { initialRound } = performInitialSetup(3, DEFAULT_CONFIG);
    expect(initialRound.roundNumber).toBe(1);
  });

  it('should create correct number of starting positions', () => {
    const { startingPositions } = performInitialSetup(5, DEFAULT_CONFIG);
    expect(startingPositions.length).toBe(5);
  });

  it('should assign correct player IDs', () => {
    const { startingPositions } = performInitialSetup(3, DEFAULT_CONFIG);

    expect(startingPositions[0].playerId).toBe('a');
    expect(startingPositions[0].playerNumber).toBe(1);

    expect(startingPositions[1].playerId).toBe('b');
    expect(startingPositions[1].playerNumber).toBe(2);

    expect(startingPositions[2].playerId).toBe('c');
    expect(startingPositions[2].playerNumber).toBe(3);
  });

  it('should initialize with empty declarations', () => {
    const { initialRound } = performInitialSetup(4, DEFAULT_CONFIG);
    expect(initialRound.declarations).toEqual([]);
  });

  it('should initialize with empty commands', () => {
    const { initialRound } = performInitialSetup(4, DEFAULT_CONFIG);
    expect(initialRound.commands).toEqual({});
  });

  it('should create grid state as string', () => {
    const { initialRound } = performInitialSetup(3, DEFAULT_CONFIG);
    expect(typeof initialRound.gridState).toBe('string');
    expect(initialRound.gridState.length).toBeGreaterThan(0);
  });

  it('should place starting units for each player', () => {
    const { initialRound } = performInitialSetup(3, DEFAULT_CONFIG);
    const gridLines = initialRound.gridState.split('\n');

    // Count occurrences of player units in grid
    const hasPlayerA = initialRound.gridState.includes('05a');
    const hasPlayerB = initialRound.gridState.includes('05b');
    const hasPlayerC = initialRound.gridState.includes('05c');

    expect(hasPlayerA).toBe(true);
    expect(hasPlayerB).toBe(true);
    expect(hasPlayerC).toBe(true);
  });

  it('should create grid with correct dimensions', () => {
    const { initialRound } = performInitialSetup(3, DEFAULT_CONFIG);
    const gridLines = initialRound.gridState.split('\n');

    expect(gridLines.length).toBe(DEFAULT_CONFIG.MAP_SIZE);

    gridLines.forEach((line) => {
      const squares = line.split('|');
      expect(squares.length).toBe(DEFAULT_CONFIG.MAP_SIZE);
    });
  });

  it('should mark resource squares', () => {
    const { initialRound } = performInitialSetup(3, DEFAULT_CONFIG);

    // Count resource squares (marked with '+')
    const resourceCount = (initialRound.gridState.match(/\+/g) || []).length;

    const totalSquares = DEFAULT_CONFIG.MAP_SIZE * DEFAULT_CONFIG.MAP_SIZE;
    const expectedResources = Math.ceil(
      (totalSquares * DEFAULT_CONFIG.RESOURCE_SQUARE_PCT) / 100
    );

    expect(resourceCount).toBe(expectedResources);
  });

  it('should not place resources on player starting positions', () => {
    const { initialRound, startingPositions } = performInitialSetup(3, DEFAULT_CONFIG);
    const gridLines = initialRound.gridState.split('\n');

    startingPositions.forEach((pos) => {
      const squares = gridLines[pos.coordinate.y].split('|');
      const square = squares[pos.coordinate.x];

      // Square should have player units but not be a resource
      expect(square).toContain(pos.playerId);
      expect(square).toContain('05'); // STARTING_UNITS
      expect(square).not.toContain('+'); // Should not be resource
    });
  });

  it('should work with different player counts', () => {
    const result3 = performInitialSetup(3, DEFAULT_CONFIG);
    const result10 = performInitialSetup(10, DEFAULT_CONFIG);

    expect(result3.startingPositions.length).toBe(3);
    expect(result10.startingPositions.length).toBe(10);
  });

  it('should work with custom config', () => {
    const customConfig = { ...DEFAULT_CONFIG, STARTING_UNITS: 10, MAP_SIZE: 5 };
    const { initialRound } = performInitialSetup(3, customConfig);

    const gridLines = initialRound.gridState.split('\n');
    expect(gridLines.length).toBe(5);

    // Should have 10 starting units instead of 5
    const has10Units = initialRound.gridState.includes('10a');
    expect(has10Units).toBe(true);
  });
});
