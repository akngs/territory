import { describe, it, expect } from 'vitest';
import { parseGrid, createEmptyGridBuilder, placeUnits, serializeGrid } from '../grid-utils.ts';
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
      // Leave grid neutral (no units placed)

      const result = applyProduction(grid, DEFAULT_CONFIG);

      // All squares should still be neutral with 0 units
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          expect(result[x][y].units).toBe(0);
          expect(result[x][y].playerId).toBe('.');
        }
      }
    });

    it('should not produce when at production cap', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 21); // At cap

      const result = applyProduction(grid, DEFAULT_CONFIG);

      expect(result[0][0].units).toBe(21); // No change
    });

    it('should cap production at PRODUCTION_CAP', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 20); // Just below cap

      const result = applyProduction(grid, DEFAULT_CONFIG);

      expect(result[0][0].units).toBe(21); // Capped at 21, not 21 (20+1)
    });

    it('should respect production cap with resource squares', () => {
      const grid = createEmptyGridBuilder(3);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 20);
      grid[0][0].isResource = true; // Would produce +2

      const result = applyProduction(grid, DEFAULT_CONFIG);

      expect(result[0][0].units).toBe(21); // Capped at 21, not 22 (20+2)
    });
  });

  describe('Maximum Players', () => {
    it('should handle maximum 20 players', () => {
      const grid = createEmptyGridBuilder(10);

      // Place one unit for each of 20 players
      for (let i = 0; i < 20; i++) {
        const playerId = String.fromCharCode(97 + i); // a-t
        placeUnits(grid, { x: i % 10, y: Math.floor(i / 10) }, playerId, 1);
      }

      const serialized = serializeGrid(grid);
      const parsed = parseGrid(serialized);

      // Verify all players present
      const playerIds = new Set<string>();
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          if (parsed[x][y].playerId !== '.') {
            playerIds.add(parsed[x][y].playerId);
          }
        }
      }

      expect(playerIds.size).toBe(20);
      expect(playerIds.has('a')).toBe(true);
      expect(playerIds.has('t')).toBe(true); // 20th player
    });
  });

  describe('Unit Overflow', () => {
    it('should handle 99+ units correctly in serialization', () => {
      const grid = createEmptyGridBuilder(2);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 99);

      const serialized = serializeGrid(grid);
      expect(serialized).toContain('99a.');

      const parsed = parseGrid(serialized);
      expect(parsed[0][0].units).toBe(99);
    });
  });

  describe('Immutability', () => {
    it('should not mutate original grid when applying production', () => {
      const grid = createEmptyGridBuilder(2);
      placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

      const originalUnits = grid[0][0].units;

      applyProduction(grid, DEFAULT_CONFIG);

      // Original grid should be unchanged
      expect(grid[0][0].units).toBe(originalUnits);
    });
  });
});
