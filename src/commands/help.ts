/**
 * Display help information about the game
 */
export function helpCommand(): void {
  console.log(`
TERRITORY - A Turn-Based Strategy Game
=======================================

OVERVIEW:
  Territory is a multiplayer turn-based strategy game where players compete
  to control the most territory and units. Each round consists of two phases:
  declarations (player intentions) and commands (actual movements).

COMMANDS:
  init <game_id> <num_players>
    Initialize a new game with the specified number of players (3-20).
    Creates a new game directory in gamedata/ with initial state.

    Example: init my-game 4

  discuss <game_id>
    Submit player declarations for the current round.
    Each player submits 2 declarations (one line per player).
    Declarations are public and can be used for strategy or diplomacy.

    Input format: One line per player (in order: a, b, c, ...)
    Example:
      echo "Player A moves north\\nPlayer B defends\\nPlayer C attacks" | discuss my-game

  cmds <game_id>
    Submit movement commands for all players.
    Each player can submit multiple commands separated by '|'.
    After all commands are submitted, the round is automatically resolved.

    Input format: One line per player
    Command format: x,y,direction,count
      - x,y: Source coordinate (0-based)
      - direction: U (up), D (down), L (left), R (right)
      - count: Number of units to move

    Example:
      echo "3,4,R,5|2,3,D,3\\n1,1,U,2\\n" | cmds my-game
      (Player A: two commands, Player B: one command, Player C: no commands)

GAME FLOW:
  1. Initialize game with 'init <game_id> <num_players>'
  2. For each round:
     a. First declaration phase: 'discuss <game_id>' (once)
     b. Second declaration phase: 'discuss <game_id>' (once more)
     c. Submit commands: 'cmds <game_id>'
     d. Round is automatically resolved
  3. Repeat step 2 until a player wins or max rounds reached

GAME MECHANICS:
  Map:
    - Default 10x10 grid
    - Some squares are resource squares (produce 2 units/turn instead of 1)
    - Players start at random edge positions with 5 units each

  Movement:
    - Move units to adjacent squares (U/D/L/R)
    - Can move any number of units up to what you have on a square
    - All movements happen simultaneously

  Combat:
    - When multiple players move to the same square, combat occurs
    - Winner: Player with most units
    - Remaining units: 1st place units - 2nd place units
    - Ties result in neutral squares (all units destroyed)

  Production:
    - Each occupied square produces units at end of round
    - Normal squares: +1 unit/turn
    - Resource squares: +2 units/turn
    - Maximum: 21 units per square

WIN CONDITIONS:
  1. Domination: Control >50% of all units
  2. Annihilation: Be the last player with units
  3. Timeout: Have the most units after 15 rounds

EXAMPLES:
  # Start a 3-player game
  ./src/cli.ts init game1 3

  # First declaration phase
  echo "I will expand east\\nI will defend\\nI will attack" | ./src/cli.ts discuss game1

  # Second declaration phase
  echo "Moving now\\nHolding position\\nCharge!" | ./src/cli.ts discuss game1

  # Submit commands (assuming players at various positions)
  echo "4,5,R,3\\n6,2,L,2\\n8,8,U,4" | ./src/cli.ts cmds game1

For more information, see the project README.
`);
}
