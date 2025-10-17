import { describe, it, expect } from 'vitest';
import {
  getPlayerIdChar,
  createEmptyGridBuilder,
  placeUnits,
  markResourceSquare,
  serializeGrid,
} from './grid-utils.ts';

describe('getPlayerIdChar', () => {
  it('should convert player indices to letters', () => {
    expect(getPlayerIdChar(0)).toBe('a');
    expect(getPlayerIdChar(1)).toBe('b');
    expect(getPlayerIdChar(2)).toBe('c');
    expect(getPlayerIdChar(5)).toBe('f');
    expect(getPlayerIdChar(19)).toBe('t');
    expect(getPlayerIdChar(25)).toBe('z');
  });
});

describe('createEmptyGridBuilder', () => {
  it('should create grids with correct dimensions', () => {
    const grid3 = createEmptyGridBuilder(3);
    const grid10 = createEmptyGridBuilder(10);

    expect(grid3.length).toBe(3);
    expect(grid3[0].length).toBe(3);
    expect(grid10.length).toBe(10);
    expect(grid10[0].length).toBe(10);
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
  it('should place and update units for different players', () => {
    const grid = createEmptyGridBuilder(3);

    placeUnits(grid, { x: 1, y: 1 }, 'a', 5);
    expect(grid[1][1].units).toBe(5);
    expect(grid[1][1].playerId).toBe('a');

    // Update existing square
    placeUnits(grid, { x: 1, y: 1 }, 'b', 7);
    expect(grid[1][1].units).toBe(7);
    expect(grid[1][1].playerId).toBe('b');

    // Different position
    placeUnits(grid, { x: 0, y: 0 }, 'a', 3);
    expect(grid[0][0].playerId).toBe('a');
    expect(grid[0][0].units).toBe(3);
  });
});

describe('markResourceSquare', () => {
  it('should mark squares as resources without affecting other properties', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 1, y: 1 }, 'a', 5);
    markResourceSquare(grid, { x: 1, y: 1 });

    expect(grid[1][1].isResource).toBe(true);
    expect(grid[1][1].units).toBe(5);
    expect(grid[1][1].playerId).toBe('a');

    // Multiple squares independently
    markResourceSquare(grid, { x: 0, y: 0 });
    expect(grid[0][0].isResource).toBe(true);
    expect(grid[2][2].isResource).toBe(false);
  });
});

describe('serializeGrid', () => {
  it('should serialize empty grid', () => {
    const grid = createEmptyGridBuilder(2);
    expect(serializeGrid(grid)).toBe('000..|000..\n000..|000..');
  });

  it('should serialize grid with units and resources', () => {
    const grid = createEmptyGridBuilder(2);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 1, y: 1 }, 'b', 12);
    markResourceSquare(grid, { x: 0, y: 1 });

    const serialized = serializeGrid(grid);
    expect(serialized).toBe('005a.|000..\n000.+|012b.');
  });

  it('should pad unit counts and handle larger grids', () => {
    const grid = createEmptyGridBuilder(3);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 1);
    placeUnits(grid, { x: 1, y: 0 }, 'b', 99);
    placeUnits(grid, { x: 1, y: 1 }, 'c', 5);

    const serialized = serializeGrid(grid);
    const lines = serialized.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('001a.|099b.|000..');
    expect(lines[1]).toBe('000..|005c.|000..');
    expect(lines[2]).toBe('000..|000..|000..');
  });
});
