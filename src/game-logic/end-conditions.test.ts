import { describe, it, expect } from 'vitest';
import { checkEndConditions } from './end-conditions.ts';

describe('End Conditions', () => {
  const check = (units: [string, number][], round: number, maxRounds = 15) =>
    checkEndConditions(new Map(units), round, maxRounds);

  describe('Annihilation', () => {
    it('should return null (tie/draw) when all players eliminated', () => {
      expect(
        check(
          [
            ['a', 0],
            ['b', 0],
            ['c', 0],
          ],
          5
        )
      ).toBeNull();
    });

    it('should return undefined when game continues', () => {
      expect(
        check(
          [
            ['a', 10],
            ['b', 10],
            ['c', 0],
          ],
          5
        )
      ).toBeUndefined();
    });
  });

  describe('Domination', () => {
    it('should detect when player has >50% of units', () => {
      expect(
        check(
          [
            ['a', 11],
            ['b', 5],
            ['c', 4],
          ],
          5
        )
      ).toBe('a');
      expect(
        check(
          [
            ['a', 10],
            ['b', 5],
            ['c', 5],
          ],
          5
        )
      ).toBeUndefined(); // exactly 50%
    });

    it('should win by domination when only one player has units', () => {
      // Only one player with units means they have >50%, so domination wins
      expect(
        check(
          [
            ['a', 10],
            ['b', 0],
            ['c', 0],
          ],
          5
        )
      ).toBe('a');
    });
  });

  describe('Timeout', () => {
    it('should trigger at max rounds with most units', () => {
      expect(
        check(
          [
            ['a', 10],
            ['b', 8],
            ['c', 5],
          ],
          15
        )
      ).toBe('a');
      expect(
        check(
          [
            ['a', 10],
            ['b', 8],
            ['c', 5],
          ],
          14
        )
      ).toBeUndefined();
    });

    it('should return array of winners when tied at timeout', () => {
      const result = check(
        [
          ['a', 10],
          ['b', 10],
          ['c', 5],
        ],
        15
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle three-way tie at timeout', () => {
      const result = check(
        [
          ['a', 8],
          ['b', 8],
          ['c', 8],
        ],
        15
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single player game (domination)', () => {
      expect(check([['a', 10]], 1)).toBe('a');
    });

    it('should prioritize annihilation and domination over timeout', () => {
      expect(
        check(
          [
            ['a', 0],
            ['b', 0],
          ],
          15
        )
      ).toBeNull(); // annihilation (tie)
      expect(
        check(
          [
            ['a', 10],
            ['b', 0],
          ],
          15
        )
      ).toBe('a'); // domination wins
      expect(
        check(
          [
            ['a', 15],
            ['b', 5],
          ],
          15
        )
      ).toBe('a'); // domination wins
    });
  });
});
