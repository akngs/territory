# Territory Game Architecture

## Overview

Territory is a simultaneous-action strategy game implemented as a command-line interface (CLI) application. Players compete to dominate a grid-based map through tactical unit deployment and resource control.

## System Type

**CLI Application** built with TypeScript and Node.js, designed for turn-based multiplayer gameplay with file-based persistence.

## Architecture Style

The application follows a **modular, command-based architecture** with clear separation of concerns:

- **CLI Layer** (`cli.ts`): Routes user commands and handles input/output
- **Commands Layer** (`commands/`): Individual command handlers (init, declare, execute, state, help)
- **Game Logic Layer** (`resolve.ts`, `game-logic/`): Manages state transformations and game mechanics
  - `game-logic/movement.ts`: Movement processing
  - `game-logic/combat.ts`: Combat resolution
  - `game-logic/production.ts`: Unit production and player calculations
  - `game-logic/end-conditions.ts`: End condition checking
- **Type Definitions** (`types.ts`): Shared TypeScript interfaces and types
- **Utility Layer** (`utils.ts`, `grid-utils.ts`): Shared helpers for I/O, validation, and grid operations
- **Data Layer**: JSON-based persistence with compact grid serialization

## Core Components

### 1. Command Router (`cli.ts`)
Entry point using Commander.js with unified error handling wrapper. Routes commands: `init`, `state`, `declare`, `execute`, `help-game`.

### 2. Type System (`types.ts`)
Defines core types: GameState, RoundRecord, GameConfig, and PlayerCommand. Ensures type safety across all modules.

### 3. Game Initialization (`commands/init.ts`)
Creates new games with randomized starting positions, resource squares, and initial grid state. Contains all initialization logic in a single module.

### 4. Round Resolution (`resolve.ts` + `game-logic/`)
Orchestrates round resolution by coordinating specialized modules:
- `resolve.ts`: Main resolver that sequences movement, combat, production, and win checks
- `game-logic/movement.ts`: Converts commands to movements and applies them
- `game-logic/combat.ts`: Resolves multi-player combat at each square
- `game-logic/production.ts`: Applies unit production and calculates player totals
- `game-logic/end-conditions.ts`: Checks domination, annihilation, and timeout conditions

### 5. Grid System (`grid-utils.ts`)
Compact serialization format: `NNp?` (units, player, type). Exports GridSquare type for type-safe grid manipulation.

### 6. Shared Utilities (`utils.ts`)
Common functions: game loading/saving, stdin reading, coordinate calculations, validation.

## Data Flow

**Game Execution**:
```
stdin → Command Handler → Load State → Game Logic → Resolve → Save State
                              ↓            ↓
                        Validation    Grid Utils
```

**Round Resolution**:
```
Commands → Movements → Combat → Production → Win Check → Next Round
```

## Technology Stack

- **Runtime**: Node.js with `--experimental-strip-types`
- **Language**: TypeScript with strict type checking
- **CLI Framework**: Commander.js
- **Testing**: Vitest (unit, integration, e2e)
- **Code Quality**: ESLint, Prettier, JSCPD (duplication detection)
- **Storage**: JSON files in `gamedata/`

## Design Principles

1. **Type Safety**: Strict TypeScript mode ensures compile-time error detection
2. **Functional Utilities**: Pure functions for data transformations
3. **Immutable State**: Game state stored as snapshots per round
4. **Compact Serialization**: Efficient grid format reduces storage overhead
5. **Command Pattern**: Extensible architecture for adding new commands

## Data Persistence

Games are persisted as JSON files in a dedicated directory structure. Each game maintains its complete history including all rounds and player actions.

## Current State

**Fully functional game** with complete gameplay loop:
- Game initialization with 3-20 players
- Two-phase declaration system
- Movement command submission with validation
- Automatic round resolution (movement, combat, production)
- End condition checking (domination, annihilation, timeout)
- Comprehensive help system and error messages

## Extensibility

Clean separation enables easy extensions:
- **New commands**: Add handlers in `commands/` directory
- **Game mechanics**: Modify modular logic in `game-logic/` or `resolve.ts`
- **Types**: Add new interfaces in `types.ts` for type-safe extensions
- **Utilities**: Shared code in `utils.ts` and `grid-utils.ts` prevents duplication
- **Type safety**: Strict TypeScript with centralized type definitions ensures safe modifications
- **Testing**: Comprehensive test suite catches regressions
- **Code quality**: Automated checks via ESLint, Prettier, and JSCPD
