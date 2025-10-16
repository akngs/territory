# Territory Game Architecture

## Overview

Territory is a simultaneous-action strategy game implemented as a command-line interface (CLI) application. Players compete to dominate a grid-based map through tactical unit deployment and resource control.

## System Type

**CLI Application** built with TypeScript and Node.js, designed for turn-based multiplayer gameplay with file-based persistence.

## Architecture Style

The application follows a **modular, command-based architecture** with clear separation of concerns:

- **CLI Layer**: Routes user commands and handles input/output
- **Game Logic Layer**: Manages game initialization and state transformations
- **Data Layer**: Handles persistence and serialization
- **Utility Layer**: Provides reusable grid manipulation and helper functions

## Core Components

### 1. Command Router
Entry point that parses user commands and delegates to appropriate handlers. Uses the command pattern for extensibility.

### 2. Game Initialization
Responsible for creating new games, generating initial maps, placing players, and establishing starting conditions.

### 3. Game State Manager
Manages the complete game state including grid representation, player information, and round history.

### 4. Grid System
Handles the spatial representation of the game world using a compact serialization format for efficient storage and human-readable persistence.

## Data Flow

```
User Input → CLI Router → Command Handler → Game Logic → Data Persistence
                                ↓
                          Grid Utilities
```

State retrieval follows the reverse path:
```
File System → Game State → Parsing → Formatting → Display
```

## Technology Stack

- **Runtime**: Node.js with ES modules
- **Language**: TypeScript with strict type checking
- **CLI Framework**: Commander.js for argument parsing
- **Storage**: JSON files on the file system

## Design Principles

1. **Type Safety**: Strict TypeScript mode ensures compile-time error detection
2. **Functional Utilities**: Pure functions for data transformations
3. **Immutable State**: Game state stored as snapshots per round
4. **Compact Serialization**: Efficient grid format reduces storage overhead
5. **Command Pattern**: Extensible architecture for adding new commands

## Data Persistence

Games are persisted as JSON files in a dedicated directory structure. Each game maintains its complete history including all rounds and player actions.

## Current State

The application currently supports:
- Game initialization with configurable player count
- State viewing and inspection
- Initial setup with randomized starting positions

Round resolution and turn progression are planned for future implementation.

## Extensibility

The architecture is designed for easy extension:
- New CLI commands can be added through the command pattern
- Game logic is modular and can be enhanced independently
- Type system provides contracts for safe modifications
- Grid utilities support any grid-based operations
