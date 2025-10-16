import { describe, it, expect } from 'vitest';
import { checkEndConditions } from './end-conditions.ts';

describe('End Conditions', () => {
  describe('Annihilation', () => {
    it('should detect annihilation win when only one player has units', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 0],
        ['c', 0],
      ]);

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBe('a');
    });

    it('should not trigger annihilation if two players have units', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 10],
        ['c', 0],
      ]);
      // Total: 20, each has 10/20 = 50%, no domination (need >50%)

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBeNull(); // Game continues
    });
  });

  describe('Domination', () => {
    it('should detect domination when player has >50% of units', () => {
      const playerUnits = new Map([
        ['a', 11],
        ['b', 5],
        ['c', 4],
      ]);
      // Total: 20, a has 11/20 = 55%

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBe('a');
    });

    it('should not trigger domination at exactly 50%', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 5],
        ['c', 5],
      ]);
      // Total: 20, a has 10/20 = 50% (not >50%)

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBeNull();
    });

    it('should not trigger domination just under 50%', () => {
      const playerUnits = new Map([
        ['a', 9],
        ['b', 6],
        ['c', 5],
      ]);
      // Total: 20, a has 9/20 = 45%

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBeNull();
    });
  });

  describe('Timeout', () => {
    it('should trigger timeout win at max rounds', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 8],
        ['c', 5],
      ]);

      const winner = checkEndConditions(playerUnits, 15, 15);
      expect(winner).toBe('a'); // Player with most units
    });

    it('should not trigger timeout before max rounds', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 8],
        ['c', 5],
      ]);

      const winner = checkEndConditions(playerUnits, 14, 15);
      expect(winner).toBeNull();
    });

    it('should handle timeout with tied players', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 10],
        ['c', 5],
      ]);

      // First player in sorted order wins
      const winner = checkEndConditions(playerUnits, 15, 15);
      expect(winner).toBeTruthy();
      expect(['a', 'b']).toContain(winner); // One of the tied players
    });
  });

  describe('Edge Cases', () => {
    it('should handle all players eliminated (mutual destruction)', () => {
      const playerUnits = new Map([
        ['a', 0],
        ['b', 0],
        ['c', 0],
      ]);

      const winner = checkEndConditions(playerUnits, 5, 15);
      expect(winner).toBeNull(); // No winner
    });

    it('should handle single player game', () => {
      const playerUnits = new Map([['a', 10]]);

      const winner = checkEndConditions(playerUnits, 1, 15);
      expect(winner).toBe('a'); // Wins by annihilation
    });

    it('should prioritize annihilation over timeout', () => {
      const playerUnits = new Map([
        ['a', 10],
        ['b', 0],
      ]);

      // At max rounds but one player eliminated
      const winner = checkEndConditions(playerUnits, 15, 15);
      expect(winner).toBe('a'); // Wins by annihilation, not timeout
    });

    it('should prioritize domination over timeout', () => {
      const playerUnits = new Map([
        ['a', 15],
        ['b', 5],
      ]);

      // At max rounds and one player dominates
      const winner = checkEndConditions(playerUnits, 15, 15);
      expect(winner).toBe('a'); // Wins by domination (75%)
    });
  });
});
