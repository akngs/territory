#!/usr/bin/env -S node --experimental-strip-types

import { Command } from 'commander';
import { initGame } from './commands/init.ts';
import { showState } from './commands/state.ts';
import { discussCommand } from './commands/discuss.ts';
import { cmdsCommand } from './commands/cmds.ts';
import { helpCommand } from './commands/help.ts';

/**
 * Wraps async command functions with error handling
 */
function wrapCommand<T extends any[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  };
}

const program = new Command();

program
  .name('territory')
  .description('Territory - A simultaneous-action strategy game')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new game')
  .argument('<game_id>', 'Unique identifier for the game')
  .argument('<num_players>', 'Number of players (3-20)')
  .action(wrapCommand(async (gameId: string, numPlayersStr: string) => {
    const numPlayers = parseInt(numPlayersStr, 10);
    if (isNaN(numPlayers)) {
      throw new Error('Number of players must be a valid integer');
    }
    await initGame(gameId, numPlayers);
  }));

program
  .command('state')
  .description('Show game state')
  .argument('<game_id>', 'Game identifier')
  .action(wrapCommand(showState));

program
  .command('discuss')
  .description('Record player discussions/declarations from stdin')
  .argument('<game_id>', 'Game identifier')
  .action(wrapCommand(discussCommand));

program
  .command('cmds')
  .description('Submit player movement commands from stdin (one line per player, commands separated by |)')
  .argument('<game_id>', 'Game identifier')
  .action(wrapCommand(cmdsCommand));

program
  .command('help-game')
  .description('Show detailed game rules and mechanics')
  .action(() => {
    helpCommand();
  });

program.parse();
