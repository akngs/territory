import { describe, it, expect } from 'vitest';
import { parseCommand, validateCommand, parsePlayerCommands } from './execute.ts';
import type { Command } from '../types.ts';
import { createEmptyGridBuilder, placeUnits } from '../grid-utils.ts';

describe('parseCommand', () => {
  it('should parse a valid command string', () => {
    const result = parseCommand('0,0,R,2', 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.command).toEqual({
        from: { x: 0, y: 0 },
        direction: 'R',
        unitCount: 2,
      });
    }
  });

  it('should handle lowercase directions', () => {
    const result = parseCommand('1,2,u,3', 0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.command).toEqual({
        from: { x: 1, y: 2 },
        direction: 'U',
        unitCount: 3,
      });
    }
  });

  it('should return error for invalid format', () => {
    const result = parseCommand('0,0,R', 0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid command format');
    }
  });

  it('should return error for invalid direction', () => {
    const result = parseCommand('0,0,X,2', 0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid direction');
    }
  });

  it('should return error for invalid coordinates', () => {
    const result = parseCommand('a,b,R,2', 0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid coordinates');
    }
  });

  it('should return error for invalid unit count', () => {
    const result = parseCommand('0,0,R,abc', 0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid unit count');
    }
  });
});

describe('validateCommand', () => {
  it('should validate a valid command', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const cmd: Command = {
      from: { x: 0, y: 0 },
      direction: 'R',
      unitCount: 2,
    };

    const result = validateCommand(cmd, 'a', grid, 5);
    expect(result).toBeNull();
  });

  it('should return error if player does not own the square', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const cmd: Command = {
      from: { x: 0, y: 0 },
      direction: 'R',
      unitCount: 2,
    };

    const result = validateCommand(cmd, 'b', grid, 5);
    expect(result).toContain('does not belong to player');
  });

  it('should return error if insufficient units', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 3);

    const cmd: Command = {
      from: { x: 0, y: 0 },
      direction: 'R',
      unitCount: 5,
    };

    const result = validateCommand(cmd, 'a', grid, 5);
    expect(result).toContain('Insufficient units');
  });

  it('should return error if source coordinate out of bounds', () => {
    const grid = createEmptyGridBuilder(5);

    const cmd: Command = {
      from: { x: 10, y: 10 },
      direction: 'R',
      unitCount: 2,
    };

    const result = validateCommand(cmd, 'a', grid, 5);
    expect(result).toContain('out of bounds');
  });

  it('should return error if target coordinate out of bounds', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 4, y: 4 }, 'a', 5);

    const cmd: Command = {
      from: { x: 4, y: 4 },
      direction: 'R', // Would go to x=5, which is out of bounds
      unitCount: 2,
    };

    const result = validateCommand(cmd, 'a', grid, 5);
    expect(result).toContain('out of bounds');
  });
});

describe('parsePlayerCommands', () => {
  it('should parse multiple commands separated by |', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 1, y: 0 }, 'a', 3);

    const result = parsePlayerCommands('0,0,R,2|1,0,R,1', 0, 'a', grid, 5, 3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.commands).toHaveLength(2);
      expect(result.commands[0]).toEqual({
        from: { x: 0, y: 0 },
        direction: 'R',
        unitCount: 2,
      });
      expect(result.commands[1]).toEqual({
        from: { x: 1, y: 0 },
        direction: 'R',
        unitCount: 1,
      });
    }
  });

  it('should return empty array for empty line', () => {
    const grid = createEmptyGridBuilder(5);
    const result = parsePlayerCommands('', 0, 'a', grid, 5, 3);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.commands).toHaveLength(0);
    }
  });

  it('should return error if too many commands', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 1, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 3, y: 0 }, 'a', 10);

    const result = parsePlayerCommands(
      '0,0,R,1|1,0,R,1|2,0,R,1|3,0,R,1',
      0,
      'a',
      grid,
      5,
      3 // Max 3 commands
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Too many commands');
    }
  });

  it('should return error if command parsing fails', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);

    const result = parsePlayerCommands('0,0,R', 0, 'a', grid, 5, 3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid command format');
    }
  });

  it('should return error if command validation fails', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 2);

    const result = parsePlayerCommands('0,0,R,5', 0, 'a', grid, 5, 3);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Insufficient units');
    }
  });
});
