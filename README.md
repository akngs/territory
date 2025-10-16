Territory is a simultaneous-action strategy game where 3 or more players compete to dominate a grid through tactical unit deployment, resource control, and strategic planning. Cooperation and deception are core game play mechanics.

> [!WARNING]
> This project is totally written by AI and not reviewed at all.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize a new game with 3-20 players
node src/cli.ts init my-game 5

# View game state
node src/cli.ts state my-game

# Submit declarations (2 phases per round)
echo "My first plan
Player 2 plan
Player 3 plan" | node src/cli.ts declare my-game

# Execute movement commands (format: x,y,direction,count)
echo "0,5,R,3
1,4,D,2|2,3,L,1
5,0,U,4" | node src/cli.ts execute my-game

# View detailed rules
node src/cli.ts help-game
```

## Example Walkthrough

This walkthrough demonstrates a complete game flow with 3 players.

### Step 1: Initialize the Game

```bash
./src/cli.ts init demo-game 3
```

This creates a new game with 3 players (a, b, c) on an 8x8 grid. Each player starts with 5 units at random edge positions.

### Step 2: View Initial State

```bash
./src/cli.ts state demo-game
```

You'll see the initial game board with players positioned at the edges. The grid shows:
- `05a`: Player A with 5 units
- `05b`: Player B with 5 units
- `05c`: Player C with 5 units
- `00.`: Empty square (neutral)
- `00.+`: Resource square (produces 2 units/turn instead of 1)

### Step 3: First Declaration Phase

Each player makes their first declaration (one line per player):

```bash
echo "I will expand toward the center
I will secure nearby resources
I will fortify my position" | ./src/cli.ts declare demo-game
```

### Step 4: Second Declaration Phase

Each player makes their second declaration:

```bash
echo "Moving 3 units east
Staying defensive for now
Scouting south" | ./src/cli.ts declare demo-game
```

### Step 5: Execute Movement Commands

Now each player submits their actual movement commands. The format is:
`x,y,direction,count` where:
- `x,y`: Source coordinate (0-based)
- `direction`: U (up), D (down), L (left), R (right)
- `count`: Number of units to move

Multiple commands are separated by `|`.

```bash
# Assuming:
# - Player A is at position (0,5) with 5 units
# - Player B is at position (9,4) with 5 units
# - Player C is at position (5,0) with 5 units

echo "0,5,R,3
7,4,L,3
5,0,D,3" | ./src/cli.ts execute demo-game
```

This automatically resolves the round:
1. **Movement**: All movements happen simultaneously
   - Player A moves 3 units right from (0,5) to (1,5)
   - Player B moves 3 units left from (9,4) to (8,4)
   - Player C moves 3 units down from (5,0) to (5,1)

2. **Combat**: If multiple players move to the same square, combat occurs
   - Winner = player with most units
   - Remaining units = 1st place units - 2nd place units

3. **Production**: Each occupied square produces units
   - Normal squares: +1 unit
   - Resource squares: +2 units
   - Maximum: 21 units per square

4. **Win Check**: Game checks if any player has won
   - Domination: >50% of all units
   - Annihilation: Last player standing
   - Timeout: Most units after 15 rounds

### Step 6: Continue Playing

View the updated state:

```bash
./src/cli.ts state demo-game
```

You'll now see:
- A new round has been created (Round 2)
- All squares have gained production units
- Round 1 is complete with all declarations and commands recorded

Repeat steps 3-6 until a player wins!

### Example: Multi-Command Turn

Players can submit multiple commands in a single turn:

```bash
# Player A: Move 2 units right, then move 3 units up from another square
# Player B: Move 4 units left
# Player C: No movement this turn
echo "0,5,R,2|0,6,U,3
7,4,L,4
" | ./src/cli.ts execute demo-game
```

### Example: Combat Scenario

If Player A (10 units) and Player B (5 units) both move to the same square:
- Player A wins with 10 - 5 = 5 units remaining
- Player B is eliminated from that square
- Player A gains +1 production next turn (6 units total)

### Tips

- Use `./src/cli.ts help-game` for detailed rules and mechanics
- Empty lines in command input mean "no commands" for that player
- Commands are validated before submission - you'll get helpful error messages
- Declarations are public - use them for diplomacy or misdirection!
- Resource squares are valuable - they produce 2x units per turn

## Development

```bash
# Type check without running
npm run check:ts

# Run all checks (executed by pre-commit hook)
npm run check:all
```

## Documents

- [./rulebook.md](./rulebook.md): Complete rulebook
- [./architecture.md](./architecture.md): Overall architecture of the code
