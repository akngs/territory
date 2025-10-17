import { describe, it, expect } from 'vitest';
import { parseCommand, validateCommand, parsePlayerCommands } from './next.ts';
import type { Command } from '../types.ts';
import { createEmptyGridBuilder, placeUnits } from '../grid-utils.ts';

describe('parseCommand', () => {
  it('should parse valid command strings', () => {
    const r1 = parseCommand('0,0,R,2', 0);
    expect(r1.success && r1.command).toEqual({
      from: { x: 0, y: 0 },
      direction: 'R',
      unitCount: 2,
    });

    const r2 = parseCommand('1,2,u,3', 0); // lowercase
    expect(r2.success && r2.command).toEqual({
      from: { x: 1, y: 2 },
      direction: 'U',
      unitCount: 3,
    });
  });

  it('should return errors for invalid inputs', () => {
    expect(parseCommand('0,0,R', 0).success).toBe(false); // missing field
    expect(parseCommand('0,0,X,2', 0).success).toBe(false); // bad direction
    expect(parseCommand('a,b,R,2', 0).success).toBe(false); // bad coords
    expect(parseCommand('0,0,R,abc', 0).success).toBe(false); // bad unit count
  });
});

describe('validateCommand', () => {
  const cmd = (x: number, y: number, dir: string, units: number): Command => ({
    from: { x, y },
    direction: dir as 'U' | 'D' | 'L' | 'R',
    unitCount: units,
  });

  it('should validate valid commands', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    expect(validateCommand(cmd(0, 0, 'R', 2), 'a', grid, 5)).toBeNull();
  });

  it('should return errors for invalid commands', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 3);
    placeUnits(grid, { x: 4, y: 4 }, 'a', 5);

    expect(validateCommand(cmd(0, 0, 'R', 2), 'b', grid, 5)).toContain('does not belong to player');
    expect(validateCommand(cmd(0, 0, 'R', 5), 'a', grid, 5)).toContain('Insufficient units');
    expect(validateCommand(cmd(10, 10, 'R', 2), 'a', grid, 5)).toContain('out of bounds');
    expect(validateCommand(cmd(4, 4, 'R', 2), 'a', grid, 5)).toContain('out of bounds'); // target OOB
  });
});

describe('parsePlayerCommands', () => {
  it('should parse multiple commands and handle empty input', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 5);
    placeUnits(grid, { x: 1, y: 0 }, 'a', 3);

    const r1 = parsePlayerCommands('0,0,R,2|1,0,R,1', 0, 'a', grid, 5, 3);
    expect(r1.success && r1.commands).toHaveLength(2);
    expect(r1.success && r1.commands[0]).toEqual({
      from: { x: 0, y: 0 },
      direction: 'R',
      unitCount: 2,
    });

    const r2 = parsePlayerCommands('', 0, 'a', grid, 5, 3);
    expect(r2.success && r2.commands).toHaveLength(0);
  });

  it('should enforce command limit', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 1, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 2, y: 0 }, 'a', 10);
    placeUnits(grid, { x: 3, y: 0 }, 'a', 10);

    const result = parsePlayerCommands('0,0,R,1|1,0,R,1|2,0,R,1|3,0,R,1', 0, 'a', grid, 5, 3);
    expect(result.success).toBe(false);
  });

  it('should validate individual commands', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 0, y: 0 }, 'a', 2);

    expect(parsePlayerCommands('0,0,R', 0, 'a', grid, 5, 3).success).toBe(false); // parse error
    expect(parsePlayerCommands('0,0,R,5', 0, 'a', grid, 5, 3).success).toBe(false); // validation error
  });

  it('should track cumulative units from same source', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 2, y: 2 }, 'a', 10);

    // Valid: 4 + 6 = 10
    const r1 = parsePlayerCommands('2,2,R,4|2,2,U,6', 0, 'a', grid, 5, 3);
    expect(r1.success && r1.commands).toHaveLength(2);

    // Invalid: 7 + 6 = 13 > 10
    const r2 = parsePlayerCommands('2,2,R,7|2,2,U,6', 0, 'a', grid, 5, 3);
    expect(r2.success).toBe(false);
    expect(!r2.success && r2.error).toContain('Total units from (2,2) would be 13');
  });

  it('should track cumulative units across three commands', () => {
    const grid = createEmptyGridBuilder(5);
    placeUnits(grid, { x: 2, y: 2 }, 'b', 15);

    const result = parsePlayerCommands('2,2,R,6|2,2,U,5|2,2,L,5', 1, 'b', grid, 5, 3);
    expect(result.success).toBe(false);
    expect(!result.success && result.error).toContain('would be 16');
  });
});
