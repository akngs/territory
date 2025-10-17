#!/usr/bin/env -S node --experimental-strip-types

import { Command } from 'commander';
import { initGame } from './commands/init.ts';
import { showState } from './commands/state.ts';
import { nextCommand } from './commands/next.ts';
import { helpCommand } from './commands/help.ts';
import { autoplayCommand } from './commands/autoplay.ts';

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
  .action(
    wrapCommand(async (gameId: string, numPlayersStr: string) => {
      const numPlayers = parseInt(numPlayersStr, 10);
      if (isNaN(numPlayers)) {
        throw new Error('Number of players must be a valid integer');
      }
      await initGame(gameId, numPlayers);
    })
  );

program
  .command('state')
  .description('Show game state')
  .argument('<game_id>', 'Game identifier')
  .action(wrapCommand(showState));

program
  .command('next')
  .description(
    'Advance the game to the next phase (automatically handles declarations or command execution)'
  )
  .argument('<game_id>', 'Game identifier')
  .action(wrapCommand(nextCommand));

program
  .command('help-game')
  .description('Show detailed game rules and mechanics')
  .action(() => {
    helpCommand();
  });

program
  .command('autoplay')
  .description('Start a new game and let Claude AI play all players automatically')
  .argument('<game_id>', 'Unique identifier for the game')
  .argument('<num_players>', 'Number of players (3-20)')
  .action(wrapCommand(autoplayCommand));

program.parse();
