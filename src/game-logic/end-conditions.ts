/**
 * Check end conditions and determine if game is over
 * Returns winning player ID or null if game continues
 *
 * End conditions (checked in order):
 * 1. Annihilation: Only one player has units remaining
 * 2. Domination: One player has > 50% of all units
 * 3. Timeout: Max rounds reached, player with most units wins
 *
 * @param playerUnits Map of player ID to unit count
 * @param currentRound Current round number
 * @param maxRounds Maximum rounds before timeout
 * @returns Winning player ID, or null if game continues
 */
export function checkEndConditions(
  playerUnits: Map<string, number>,
  currentRound: number,
  maxRounds: number
): string | null {
  const totalUnits = Array.from(playerUnits.values()).reduce((a, b) => a + b, 0);

  // No units at all - no winner (mutual destruction)
  if (totalUnits === 0) {
    return null;
  }

  // Check for annihilation (only one player remains)
  const playersWithUnits = Array.from(playerUnits.entries()).filter(([, units]) => units > 0);

  if (playersWithUnits.length === 1) {
    return playersWithUnits[0][0]; // Winner by annihilation
  }

  // Check for domination (>50% of all units)
  for (const [playerId, units] of playerUnits.entries()) {
    if (units > totalUnits / 2) {
      return playerId; // Winner by domination
    }
  }

  // Check for timeout
  if (currentRound >= maxRounds) {
    // Winner is player with most units
    const sorted = Array.from(playerUnits.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  return null; // Game continues
}
