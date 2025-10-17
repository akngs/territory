import { describe, it, expect } from 'vitest';
import {
  parseGrid,
  createEmptyGridBuilder,
  placeUnits,
  serializeGrid,
  getPlayerIdChar,
} from '../grid-utils.ts';
import { applyProduction } from './production.ts';
import { DEFAULT_CONFIG } from '../types.ts';

describe('Edge Cases', () => {
  describe('Grid Parsing', () => {
    it('should reject empty grid state', () => {
      expect(() => parseGrid('')).toThrow('Invalid grid: empty state');
    });

    it('should reject whitespace-only grid state', () => {
      expect(() => parseGrid('   ')).toThrow('Invalid grid: empty state');
    });

    it('should reject non-square grid', () => {
      const malformed = '00..|00..\n00..'; // 2 squares in first row, 1 in second
      expect(() => parseGrid(malformed)).toThrow('non-square grid');
    });

    it('should reject invalid square format (wrong length)', () => {
      const malformed = '00..|00\n00..|00..'; // Second square in first row is too short
      expect(() => parseGrid(malformed)).toThrow('invalid format');
    });

    it('should reject invalid unit count (non-numeric)', () => {
      const malformed = 'XX..|00..\n00..|00..';
      expect(() => parseGrid(malformed)).toThrow('invalid unit count');
    });

    it('should reject invalid type marker', () => {
      const malformed = '00.X|00..\n00..|00..'; // X is not + or .
      expect(() => parseGrid(malformed)).toThrow('invalid type marker');
    });
  });

  describe('Production Edge Cases', () => {
    it('should not produce on neutral squares', () => {
      const grid = createEmptyGridBuilder(3);
      const result = applyProduction(grid, DEFAULT_CONFIG);

      expect(result[0][0].units).toBe(0);
      expect(result[0][0].playerId).toBe('.');
    });

    it('should not produce when at production cap', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 21);

      const result = applyProduction(grid, DEFAULT_CONFIG);
      expect(result[0][0].units).toBe(21);
    });

    it('should cap production at PRODUCTION_CAP', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 20);

      const result = applyProduction(grid, DEFAULT_CONFIG);
      expect(result[0][0].units).toBe(21);
    });

    it('should respect production cap with resource squares', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 20);
      grid[0][0].isResource = true;

      const result = applyProduction(grid, DEFAULT_CONFIG);
      expect(result[0][0].units).toBe(21);
    });
  });

  describe('Maximum Players', () => {
    it('should handle maximum 5 players', () => {
      const grid = createEmptyGridBuilder(5);

      for (let i = 0; i < 5; i++) {
        placeUnits(grid, { x: i, y: 0 }, getPlayerIdChar(i), 1);
      }

      const parsed = parseGrid(serializeGrid(grid));
      const playerIds = new Set<string>();

      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          if (parsed[x][y].playerId !== '.') playerIds.add(parsed[x][y].playerId);
        }
      }

      expect(playerIds.size).toBe(5);
      expect(playerIds.has('e')).toBe(true);
    });
  });

  describe('Unit Overflow', () => {
    it('should handle 99+ units correctly in serialization', () => {
      const grid = createEmptyGridBuilder(2);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 99);

      const parsed = parseGrid(serializeGrid(grid));
      expect(parsed[0][0].units).toBe(99);
    });
  });

  describe('Immutability', () => {
    it('should not mutate original grid when applying production', () => {
      const grid = createEmptyGridBuilder(2);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

      applyProduction(grid, DEFAULT_CONFIG);
      expect(grid[0][0].units).toBe(5);
    });
  });
});
