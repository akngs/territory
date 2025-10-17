import chalk, { type ChalkInstance } from 'chalk';
import { getPlayerIdChar } from '../grid-utils.ts';
import { loadGameState } from '../utils.ts';
import type { Command, GameState, RoundRecord } from '../types.ts';

/**
 * Parse grid state string and count units/resources for display
 */
function parseGridSummary(gridState: string): {
  playerUnits: Map<string, number>;
  resourceCount: number;
  totalSquares: number;
} {
  const playerUnits = new Map<string, number>();
  let resourceCount = 0;
  let totalSquares = 0;

  const rows = gridState.split('\n');
  for (const row of rows) {
    const squares = row.split('|');
    for (const square of squares) {
      totalSquares++;
      const units = parseInt(square.substring(0, 2), 10);
      const playerId = square[2];
      const isResource = square[3] === '+';

      if (playerId !== '.') {
        playerUnits.set(playerId, (playerUnits.get(playerId) || 0) + units);
      }

      if (isResource) {
        resourceCount++;
      }
    }
  }

  return { playerUnits, resourceCount, totalSquares };
}

/**
 * Get background color for a player (a=bgRed, b=bgBlue, c=bgYellow, d=bgMagenta, e=bgCyan)
 */
function getPlayerBgColor(playerId: string): ChalkInstance {
  switch (playerId) {
    case 'a':
      return chalk.bgRed;
    case 'b':
      return chalk.bgBlue;
    case 'c':
      return chalk.bgYellow;
    case 'd':
      return chalk.bgMagenta;
    case 'e':
      return chalk.bgCyan;
    default:
      return chalk.bgGray; // Default to gray background instead of no-op chalk
  }
}

/**
 * Render grid state in 2D format for terminal display with player background colors
 */
function renderGrid(gridState: string): string {
  const rows = gridState.split('\n');
  const mapSize = rows.length;
  const lines: string[] = [];

  // Add top axis (x-axis: column numbers)
  const xAxisNumbers = Array.from({ length: mapSize }, (_, i) => i.toString().padEnd(4, ' '));
  lines.push('     ' + xAxisNumbers.join(' '));

  for (let i = 0; i < rows.length; i++) {
    const squares = rows[i].split('|');
    const displaySquares = squares.map((sq) => {
      // Format: "NNp?" where ? is '+' for resource or '.' for normal
      const playerId = sq[2];
      const isResource = sq[3] === '+';
      const isNeutral = playerId === '.';

      // Split square into first 3 chars and last char
      const firstThree = sq.substring(0, 3);
      const lastChar = sq[3];

      if (isNeutral) {
        // Neutral squares: gray for first 3 chars, green for resource marker
        const coloredFirstThree = chalk.gray(firstThree);
        const coloredLastChar = isResource ? chalk.green(lastChar) : chalk.gray(lastChar);
        return coloredFirstThree + coloredLastChar;
      } else {
        // Player squares: apply player's background color with black text to first 3 chars
        const playerBg = getPlayerBgColor(playerId);
        const coloredFirstThree = playerBg.black(firstThree);

        // Apply green color (no background) to resource marker
        const coloredLastChar = isResource ? chalk.green(lastChar) : chalk.gray(lastChar);

        return coloredFirstThree + coloredLastChar;
      }
    });
    // Add y-axis label (row number) on the left
    const yAxisLabel = i.toString().padStart(3, ' ') + ': ';
    lines.push(yAxisLabel + displaySquares.join(' '));
  }

  return lines.join('\n');
}

/**
 * Format declarations for a round, grouped by phase
 */
function formatDeclarations(
  declarations: string[],
  numPlayers: number,
  declarationCount: number
): string {
  if (declarations.length === 0) return '';

  const lines: string[] = [];

  // Group declarations by phase
  for (let phase = 0; phase < declarationCount; phase++) {
    const phaseStart = phase * numPlayers;
    const phaseEnd = phaseStart + numPlayers;
    const phaseDeclarations = declarations.slice(phaseStart, phaseEnd);

    if (phaseDeclarations.length === 0) continue;

    lines.push('');
    lines.push(`Declarations (Phase ${phase + 1}):`);
    for (let i = 0; i < phaseDeclarations.length; i++) {
      const playerId = getPlayerIdChar(i);
      const text = phaseDeclarations[i];
      lines.push(`- ${playerId}: ${text}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format commands for a round
 */
function formatCommands(commands: Command[][]): string {
  if (commands.length === 0) return '';

  const lines: string[] = [];
  lines.push('');
  lines.push(`Commands:`);
  for (let i = 0; i < commands.length; i++) {
    const playerId = getPlayerIdChar(i);
    const playerCommands = commands[i];
    if (playerCommands.length === 0) {
      lines.push(`- ${playerId}: (no commands)`);
    } else {
      const cmdStrings = playerCommands
        .map((cmd) => `${cmd.from.x},${cmd.from.y},${cmd.direction},${cmd.unitCount}`)
        .join(' | ');
      lines.push(`- ${playerId}: ${cmdStrings}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate declaration phase instructions with examples
 */
function generateDeclarationInstructions(
  roundNumber: number,
  currentPhase: number,
  declarationCount: number,
  maxPlanLength: number
): string {
  const lines: string[] = [];
  lines.push(
    `${chalk.bold('Next Action:')} Round ${roundNumber} - Declaration phase ${currentPhase}/${declarationCount}`
  );
  lines.push('');
  lines.push(
    `${chalk.bold('What to enter:')} Make a public declaration to influence other players (up to ${maxPlanLength} characters).`
  );
  lines.push(
    `${chalk.bold('Purpose:')} Form alliances, make threats, negotiate territory, deceive opponents, or coordinate strategies.`
  );
  lines.push('');
  lines.push(
    `${chalk.bold('When shared:')} Your declaration will be revealed to all players at once, after everyone submits their declarations for this phase.`
  );
  lines.push(
    `${chalk.bold('Note:')} All information (grid, units, positions, past declarations) is visible to everyone. No need to state obvious facts.`
  );
  lines.push('');
  lines.push(`${chalk.bold('Examples:')}`);
  if (currentPhase === 2) {
    lines.push(
      `  ${chalk.dim('PLAYER X, if you attack PLAYER Y this round, I will help you next round by attacking their western flank.')}`
    );
    lines.push(
      `  ${chalk.dim('I am moving east as promised, PLAYER Z. In return, stay away from my resource squares or our alliance ends.')}`
    );
    lines.push(
      `  ${chalk.dim('PLAYER X is lying to you, PLAYER Y! They are massing units on YOUR border, not mine. Attack them now!')}`
    );
  } else {
    lines.push(
      `  ${chalk.dim('PLAYER X, lets team up against PLAYER Y who is getting too strong. I will not attack you if you focus on PLAYER Y.')}`
    );
    lines.push(
      `  ${chalk.dim('Warning to all players: The first one to attack me will face coordinated retaliation from my allies.')}`
    );
    lines.push(
      `  ${chalk.dim('PLAYER Z, I will give you the northwest resource square if you help me eliminate PLAYER X. Deal?')}`
    );
  }
  return lines.join('\n');
}

/**
 * Generate game over message with winner and final standings
 */
function generateGameOverMessage(
  gameState: GameState,
  currentRound: RoundRecord,
  maxRounds: number
): string {
  const summary = parseGridSummary(currentRound.gridState);
  const playerIds = Array.from(summary.playerUnits.keys()).sort((a, b) => a.localeCompare(b));

  // Build player stats sorted by units descending
  const playerStats: Array<{ id: string; units: number }> = [];
  for (const playerId of playerIds) {
    const units = summary.playerUnits.get(playerId) || 0;
    playerStats.push({ id: playerId, units });
  }
  playerStats.sort((a, b) => b.units - a.units);

  const totalUnits = playerStats.reduce((sum, p) => sum + p.units, 0);
  const winner = gameState.winner;

  const lines: string[] = [];
  lines.push(chalk.bold.green('🎮 GAME OVER'));
  lines.push('');

  if (winner === null) {
    // Tie/Draw
    lines.push(chalk.bold.red('💀 TIE/DRAW - All players eliminated (Annihilation)'));
  } else if (Array.isArray(winner)) {
    // Multiple winners (timeout tie)
    const winnerUnits = summary.playerUnits.get(winner[0]) || 0;
    lines.push(chalk.bold.yellow(`🏆 TIE - Multiple winners: ${winner.join(', ')}`));
    lines.push(`   by timeout (tied for most units after ${maxRounds} rounds)`);
    lines.push(`   Final units: ${winnerUnits} each`);
  } else if (winner) {
    const winnerUnits = summary.playerUnits.get(winner) || 0;

    // Determine win condition
    let winReason = '';
    const playersWithUnits = playerStats.filter((p) => p.units > 0).length;

    if (playersWithUnits === 1 && winnerUnits > totalUnits / 2) {
      // Only one player has units and they have >50%
      winReason = 'by domination (last player standing)';
    } else if (winnerUnits > totalUnits / 2) {
      winReason = `by domination (${winnerUnits}/${totalUnits} units, >50%)`;
    } else if (currentRound.roundNumber >= maxRounds) {
      winReason = `by timeout (most units after ${maxRounds} rounds)`;
    }

    lines.push(chalk.bold.yellow(`🏆 Winner: Player ${winner} ${winReason}`));
    lines.push(`   Final units: ${winnerUnits}`);
  } else {
    // Should not happen - game is still ongoing
    lines.push(chalk.bold.red('Game in progress'));
  }

  lines.push('');
  lines.push(chalk.bold('Final Standings:'));
  for (const stat of playerStats) {
    lines.push(`  Player ${stat.id}: ${stat.units} units`);
  }

  lines.push('');
  lines.push(`Game ended after ${currentRound.roundNumber} rounds (max ${maxRounds})`);

  return lines.join('\n');
}

/**
 * Generate execution phase instructions with examples
 */
function generateExecutionInstructions(roundNumber: number, maxCommands: number): string {
  const lines: string[] = [];
  lines.push(`${chalk.bold('Next Action:')} Round ${roundNumber} - Execution phase`);
  lines.push('');
  lines.push(
    `${chalk.bold('What to enter:')} You must submit ONE LINE with your commands (up to ${maxCommands} commands).`
  );
  lines.push(`${chalk.bold('Format:')} x,y,direction,count (multiple commands separated by |)`);
  lines.push(`${chalk.bold('Empty line')} means you have no commands.`);
  lines.push('');
  lines.push(
    `${chalk.bold('When executed:')} All players submit commands simultaneously. Commands are executed at once, then results are revealed to everyone.`
  );
  lines.push('');
  lines.push(`${chalk.bold('Examples:')}`);
  lines.push(`  ${chalk.dim('3,4,R,5|2,3,D,2')} (two commands)`);
  lines.push(`  ${chalk.dim('1,1,U,3')} (one command)`);
  lines.push(`  ${chalk.dim('(empty line)')} (no commands)`);
  return lines.join('\n');
}

/**
 * Generate instructions for the current game phase with examples
 */
function generatePhaseInstructions(gameState: GameState): string {
  const currentRound = gameState.rounds[gameState.rounds.length - 1];
  const expectedDeclarations = gameState.numPlayers * gameState.config.DECLARATION_COUNT;
  const hasCommands = currentRound.commands.length > 0;
  const hasNextRound = gameState.rounds.length > currentRound.roundNumber;

  // Game over - next round already started
  if (hasCommands && hasNextRound) {
    return generateDeclarationInstructions(
      gameState.currentRound,
      1,
      gameState.config.DECLARATION_COUNT,
      gameState.config.MAX_PLAN_LENGTH
    );
  }

  // Game over - no more rounds
  if (hasCommands && !hasNextRound) {
    return generateGameOverMessage(gameState, currentRound, gameState.config.MAX_ROUNDS);
  }

  // Declaration phase
  if (currentRound.declarations.length < expectedDeclarations) {
    const currentPhase = Math.floor(currentRound.declarations.length / gameState.numPlayers) + 1;
    return generateDeclarationInstructions(
      currentRound.roundNumber,
      currentPhase,
      gameState.config.DECLARATION_COUNT,
      gameState.config.MAX_PLAN_LENGTH
    );
  }

  // Execution phase
  return generateExecutionInstructions(
    currentRound.roundNumber,
    gameState.config.MAX_COMMANDS_PER_ROUND
  );
}

/**
 * Format game state in human-readable format and return as string
 */
export async function formatGameState(gameId: string): Promise<string> {
  const gameState = await loadGameState(gameId);
  const lines: string[] = [];

  // Display rounds history
  for (let i = 0; i < gameState.rounds.length; i++) {
    const round = gameState.rounds[i];

    if (i > 0) {
      lines.push('');
    }

    lines.push(chalk.cyan(`## Round ${round.roundNumber}/${gameState.config.MAX_ROUNDS}`));
    lines.push('');

    // Render the grid
    lines.push('```');
    lines.push(renderGrid(round.gridState));
    lines.push('```');
    lines.push('');

    // Parse grid summary
    const summary = parseGridSummary(round.gridState);

    // Show player units (use localeCompare for alphabetical sort)
    const playerIds = Array.from(summary.playerUnits.keys()).sort((a, b) => a.localeCompare(b));
    const unitsList = playerIds.map((id) => `${id}=${summary.playerUnits.get(id) || 0}`).join(', ');
    lines.push(`Units: ${unitsList}`);

    // Show declarations and commands
    const declarationsOutput = formatDeclarations(
      round.declarations,
      gameState.numPlayers,
      gameState.config.DECLARATION_COUNT
    );
    if (declarationsOutput) {
      lines.push(declarationsOutput);
    }

    const commandsOutput = formatCommands(round.commands);
    if (commandsOutput) {
      lines.push(commandsOutput);
    }
  }

  // Display instructions for next action
  lines.push('');
  lines.push(chalk.cyan(`## Next Action`));
  lines.push(generatePhaseInstructions(gameState));
  lines.push('');

  return lines.join('\n');
}

/**
 * Display game state in human-readable format
 */
export async function showState(gameId: string): Promise<void> {
  const output = await formatGameState(gameId);
  console.log(output);
}
