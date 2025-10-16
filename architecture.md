# Territory Game Architecture

## Overview

Territory is a simultaneous-action strategy game implemented as a command-line interface (CLI) application. Players compete to dominate a grid-based map through tactical unit deployment and resource control.

## System Type

**CLI Application** built with TypeScript and Node.js, designed for turn-based multiplayer gameplay with file-based persistence.

## Architecture Style

The application follows a **modular, command-based architecture** with clear separation of concerns:

- **CLI Layer** (`cli.ts`): Routes user commands and handles input/output
- **Commands Layer** (`commands/`): Individual command handlers (init, discuss, cmds, help)
- **Game Logic Layer** (`resolve.ts`, `game-init.ts`): Manages state transformations and game mechanics
- **Utility Layer** (`utils.ts`, `grid-utils.ts`): Shared helpers for I/O, validation, and grid operations
- **Data Layer**: JSON-based persistence with compact grid serialization

## Core Components

### 1. Command Router (`cli.ts`)
Entry point using Commander.js. Routes commands: `init`, `state`, `discuss`, `cmds`, `help-game`.

### 2. Game Initialization (`game-init.ts`)
Creates new games with randomized starting positions, resource squares, and initial grid state.

### 3. Round Resolution (`resolve.ts`)
Processes simultaneous movements, resolves combat, applies production, and checks win conditions.

### 4. Grid System (`grid-utils.ts`)
Compact serialization format: `NNp?` (units, player, type). Supports parsing, building, and manipulation.

### 5. Shared Utilities (`utils.ts`)
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
- **Testing**: Vitest (68 tests: unit, integration, e2e)
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
- Win condition checking (domination, annihilation, timeout)
- Comprehensive help system and error messages

## Extensibility

Clean separation enables easy extensions:
- **New commands**: Add handlers in `commands/` directory
- **Game mechanics**: Modify `resolve.ts` for new rules
- **Utilities**: Shared code in `utils.ts` prevents duplication
- **Type safety**: TypeScript contracts ensure safe modifications
- **Testing**: Comprehensive test suite catches regressions
