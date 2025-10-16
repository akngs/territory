import { describe, it, expect } from 'vitest';
import { getTargetCoord, isValidDirection } from './utils.ts';

describe('Utils', () => {
  describe('getTargetCoord', () => {
    it('should calculate target for Up direction', () => {
      const result = getTargetCoord({ x: 5, y: 5 }, 'U');
      expect(result).toEqual({ x: 5, y: 4 });
    });

    it('should calculate target for Down direction', () => {
      const result = getTargetCoord({ x: 5, y: 5 }, 'D');
      expect(result).toEqual({ x: 5, y: 6 });
    });

    it('should calculate target for Left direction', () => {
      const result = getTargetCoord({ x: 5, y: 5 }, 'L');
      expect(result).toEqual({ x: 4, y: 5 });
    });

    it('should calculate target for Right direction', () => {
      const result = getTargetCoord({ x: 5, y: 5 }, 'R');
      expect(result).toEqual({ x: 6, y: 5 });
    });

    it('should handle edge coordinates', () => {
      expect(getTargetCoord({ x: 0, y: 0 }, 'U')).toEqual({ x: 0, y: -1 });
      expect(getTargetCoord({ x: 0, y: 0 }, 'L')).toEqual({ x: -1, y: 0 });
    });
  });

  describe('isValidDirection', () => {
    it('should accept valid directions', () => {
      expect(isValidDirection('U')).toBe(true);
      expect(isValidDirection('D')).toBe(true);
      expect(isValidDirection('L')).toBe(true);
      expect(isValidDirection('R')).toBe(true);
    });

    it('should reject invalid directions', () => {
      expect(isValidDirection('X')).toBe(false);
      expect(isValidDirection('up')).toBe(false);
      expect(isValidDirection('')).toBe(false);
      expect(isValidDirection('UD')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidDirection('u')).toBe(false);
      expect(isValidDirection('d')).toBe(false);
    });
  });
});
