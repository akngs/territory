# Territory Rulebook

## Game Overview
Territory is a simultaneous-action strategy game where players compete to control an 8×8 grid by deploying units, capturing squares, and outmaneuvering opponents.

## Setup
- **Players**: 3-20
- **Map**: 8×8 grid (64 squares total)
- **Starting units**: Each player begins with 5 units
- **Starting position**: Each player gets one random square on the outer edge of the map
- **Resource squares**: 5% of map squares are marked as resource squares (shown with a + symbol)
- **Game length**: Maximum 15 rounds

## How Each Round Works

### Phase 1: Declarations
**Purpose**: Communicate your strategy (or deceive your opponents!)

Players submit declarations in two rounds:
1. **First declaration**: Everyone submits a plan (up to 200 characters), then all plans are revealed at once
2. **Second declaration**: After seeing what others said, everyone submits another plan

**Note**: Declarations are completely public but have no mechanical effect - use them for diplomacy, coordination, or bluffing.

### Phase 2: Execution
**Purpose**: Move your units around the map

Each player submits up to 3 movement commands using this format:
- `X,Y,DIRECTION,UNITS`
- Example: `2,3,R,5` means "move 5 units from square (2,3) one square to the right"

**Directions**:
- `U` = Up (decrease Y)
- `D` = Down (increase Y)
- `L` = Left (decrease X)
- `R` = Right (increase X)

**Important**: You can only move to adjacent squares (no diagonal moves).

### Phase 3: Resolution
The game processes all commands automatically in this order:

**Step 1 - Movement**: All players' moves happen at the same time

**Step 2 - Combat**: For each square, determine who controls it
- Count how many units each player has in that square
- The player with the most units wins
- **Winner's remaining units** = Their units - Second place units
- All other players lose all units in that square
- **If there's a tie for first place**: Everyone loses all units (square becomes neutral)

**Example**: Player A has 10 units, Player B has 4 units, Player C has 2 units in the same square
- Player A wins with 10 - 4 = 6 units remaining
- Players B and C lose all units

**Step 3 - Production**: Each square with at least one unit produces more units
- Normal squares: +1 unit
- Resource squares: +2 units
- **Exception**: Squares with 21+ units don't produce (production cap)

**Step 4 - Victory Check**: Check if anyone has won

### Phase 4: Results
The map is revealed showing all players' positions and unit counts.

## Winning the Game

The game ends immediately when any of these conditions is met:

1. **Domination**: One player has more total units than all other players combined
2. **Annihilation**: All players reach 0 units (tie/draw)
3. **Timeout**: Round 15 ends (player with most units wins)
