# Rulebook

## Game Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MIN_PLAYERS` | 3 | Minimum number of players |
| `MAX_PLAYERS` | 20 | Maximum number of players |
| `MAP_SIZE` | 10 | Grid dimensions (MAP_SIZE × MAP_SIZE) |
| `MAX_ROUNDS` | 15 | Maximum rounds before timeout |
| `STARTING_UNITS` | 5 | Initial units per player |
| `MAX_PLAN_LENGTH` | 200 | Maximum characters per declaration |
| `DECLARATION_COUNT` | 2 | Number of declaration phases per round |
| `MAX_COMMANDS_PER_ROUND` | 3 | Maximum commands per player per round |
| `RESOURCE_SQUARE_PCT` | 5 | Percentage of squares that are resource squares |
| `BASE_PRODUCTION` | 1 | Units produced per round in normal squares |
| `RESOURCE_PRODUCTION` | 2 | Units produced per round in resource squares |
| `PRODUCTION_CAP` | 21 | Units threshold above which no production occurs |
| `ROUND_DURATION_HOURS` | 24 | Real-time duration of each round |

## Game Setup

**Players**: `MIN_PLAYERS`-`MAX_PLAYERS`
**Map**: `MAP_SIZE`×`MAP_SIZE` grid (`MAP_SIZE`² squares)
**Duration**: Maximum `MAX_ROUNDS` rounds
**Round cycle**: `ROUND_DURATION_HOURS` hours

## Initial Setup

1. Each player receives 1 unique, non overwrapping, random starting square on the map's outer edge
2. Place `STARTING_UNITS` units in starting square
3. Set randomly selected `RESOURCE_SQUARE_PCT`% of total squares (ceiling) as "resource squares"

## Round Sequence

### 1. Public Discussion

**1st Declaration**:

- Each player submits a plan (`MAX_PLAN_LENGTH` unicode characters max)
- All declarations revealed simultaneously when everyone submits
- Over `MAX_PLAN_LENGTH` characters: auto-truncated. No submission: shows "no plan"

**2nd Declaration**:

- After seeing 1st declarations, submit new plan (`MAX_PLAN_LENGTH` characters max)
- All declarations revealed simultaneously when everyone submits

### 2. Command Submission

- Each player submits **maximum `MAX_COMMANDS_PER_ROUND` commands**
- Format: "X_from,Y_from,DIRECTION,N", e.g. "0,0,D,3" to send 3 units from (0,0) to (0,1)
- Movement to adjacent squares only (up/down/left/right, no diagonal)
- More than `MAX_COMMANDS_PER_ROUND` commands: only first `MAX_COMMANDS_PER_ROUND` executed
- No submission: all units stay

### 3. Simultaneous Resolution

**3-1. Movement**

- All player movements execute simultaneously

**3-2. Control**

For each square independently:

1. Count all units by player
2. Combat resolution:
   - 1st place units - 2nd place units (there may be tie but doesn't matter) = 1st place remaining units
   - All other players: 0 units
   - If multiple 1st place (tie): all units are eliminated and the square becomes neutral

**3-3. Production**

Increase units in every square with at least one unit:
- Normal square: +`BASE_PRODUCTION` unit
- Resource square: +`RESOURCE_PRODUCTION` units
- Squares with `PRODUCTION_CAP` or more units do not receive production

**3-4. End Condition Check**

- Check all end conditions
- If any condition met, game ends immediately and show # of units by players. There could be ties.

### 4. Results

- Reveal full map state
- Reveal each player's controlled squares count and total units

## End Conditions

**Domination**: One player's units > all others combined

**Annihilation**: All players reach 0 units

**Timeout**: Round `MAX_ROUNDS` ends

## Clarifications

**Command Processing**:

- No units at departure square: ignore command
- Non-adjacent square: ignore command
- Specified more than available: move only available amount
- Multiple commands from same square exceed total: execute in order until depleted

**Combat Calculation**:

- All other players have 0 units → 1st keeps all units
- 2+ players tied for 1st: tie → all get 0 units
- 0 units in square: automatically neutral, no controller
