Territory is a simultaneous-action strategy game where 3 or more players compete to dominate a grid through tactical unit deployment, resource control, and strategic planning.

> [!WARNING]
> This project is totally written by AI and not reviewed at all.

## Quick Start

```bash
# Initialize a new game with 5 players
territory init my-game 5

# View game state
cat gamedata/my-game/game-state.json
```

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
