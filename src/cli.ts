#!/usr/bin/env -S node --experimental-strip-types

import { Command } from 'commander';
import { initGame } from './commands/init.ts';

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
  .action(async (gameId: string, numPlayersStr: string) => {
    try {
      const numPlayers = parseInt(numPlayersStr, 10);
      if (isNaN(numPlayers)) {
        throw new Error('Number of players must be a valid integer');
      }
      await initGame(gameId, numPlayers);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();
