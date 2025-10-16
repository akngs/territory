import { describe, it, expect } from 'vitest';
import {
  getPlayerIdChar,
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
} from './grid-utils.ts';

describe('getPlayerIdChar', () => {
  it('should convert player index 0 to "a"', () => {
    expect(getPlayerIdChar(0)).toBe('a');
  });

  it('should convert player index 1 to "b"', () => {
    expect(getPlayerIdChar(1)).toBe('b');
  });

  it('should convert player index 25 to "z"', () => {
    expect(getPlayerIdChar(25)).toBe('z');
  });

  it('should convert sequential indices correctly', () => {
    expect(getPlayerIdChar(2)).toBe('c');
    expect(getPlayerIdChar(5)).toBe('f');
    expect(getPlayerIdChar(19)).toBe('t');
  });
});

describe('createEmptyGridBuilder', () => {
  it('should create a 3x3 grid', () => {
    const grid = createEmptyGridBuilder(3);
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(3);
  });

  it('should create a 10x10 grid', () => {
    const grid = createEmptyGridBuilder(10);
    expect(grid.length).toBe(10);
    expect(grid[0].length).toBe(10);
  });

  it('should initialize all squares as empty neutral squares', () => {
    const grid = createEmptyGridBuilder(2);
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        expect(grid[x][y]).toEqual({
          units: 0,
          playerId: '.',
          isResource: false,
        });
      }
    }
  });
});

describe('placeUnits', () => {
  it('should place units at a coordinate', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 1, y: 1 }, 'a', 5);

    expect(grid[1][1].units).toBe(5);
    expect(grid[1][1].playerId).toBe('a');
  });

  it('should update existing square', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 3);
    placeUnits(grid, { x: 0, y: 0 }, 'b', 7);

    expect(grid[0][0].units).toBe(7);
    expect(grid[0][0].playerId).toBe('b');
  });

  it('should place units for different players', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 2, y: 2 }, 'b', 10);

    expect(grid[0][0].playerId).toBe('a');
    expect(grid[0][0].units).toBe(5);
    expect(grid[2][2].playerId).toBe('b');
    expect(grid[2][2].units).toBe(10);
  });
});

describe('markResourceSquare', () => {
  it('should mark a square as resource', () => {
    const grid = createEmptyGridBuilder(3);
    markResourceSquare(grid, { x: 1, y: 1 });

    expect(grid[1][1].isResource).toBe(true);
  });

  it('should not affect other properties', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 1, y: 1 }, 'a', 5);
    markResourceSquare(grid, { x: 1, y: 1 });

    expect(grid[1][1].isResource).toBe(true);
    expect(grid[1][1].units).toBe(5);
    expect(grid[1][1].playerId).toBe('a');
  });

  it('should mark multiple squares independently', () => {
    const grid = createEmptyGridBuilder(3);
    markResourceSquare(grid, { x: 0, y: 0 });
    markResourceSquare(grid, { x: 2, y: 2 });

    expect(grid[0][0].isResource).toBe(true);
    expect(grid[2][2].isResource).toBe(true);
    expect(grid[1][1].isResource).toBe(false);
  });
});

describe('serializeGrid', () => {
  it('should serialize an empty 2x2 grid', () => {
    const grid = createEmptyGridBuilder(2);
    const serialized = serializeGrid(grid);

    expect(serialized).toBe('00..|00..\n00..|00..');
  });

  it('should serialize grid with units', () => {
    const grid = createEmptyGridBuilder(2);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 1, y: 1 }, 'b', 12);

    const serialized = serializeGrid(grid);
    expect(serialized).toBe('05a.|00..\n00..|12b.');
  });

  it('should serialize grid with resource squares', () => {
    const grid = createEmptyGridBuilder(2);
    markResourceSquare(grid, { x: 0, y: 1 });
    markResourceSquare(grid, { x: 1, y: 0 });

    const serialized = serializeGrid(grid);
    expect(serialized).toBe('00..|00.+\n00.+|00..');
  });

  it('should serialize grid with units and resources', () => {
    const grid = createEmptyGridBuilder(2);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 7);
    markResourceSquare(grid, { x: 0, y: 0 });
    placeUnits(grid, { x: 1, y: 1 }, 'b', 3);

    const serialized = serializeGrid(grid);
    expect(serialized).toBe('07a+|00..\n00..|03b.');
  });

  it('should pad unit counts with zeros', () => {
    const grid = createEmptyGridBuilder(2);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 1);
    placeUnits(grid, { x: 1, y: 0 }, 'b', 99);

    const serialized = serializeGrid(grid);
    expect(serialized).toBe('01a.|99b.\n00..|00..');
  });

  it('should handle larger grids', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 1, y: 1 }, 'a', 5);

    const serialized = serializeGrid(grid);
    const lines = serialized.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('00..|00..|00..');
    expect(lines[1]).toBe('00..|05a.|00..');
    expect(lines[2]).toBe('00..|00..|00..');
  });
});
