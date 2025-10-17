/**
 * Check end conditions and determine if game is over
 * Returns winning player ID, array of player IDs for tie, null for draw, or undefined if game continues
 *
 * End conditions (checked in order):
 * 1. Annihilation: All players reach 0 units (draw)
 * 2. Domination: One player has more total units than all other players combined (>50%)
 * 3. Timeout: Max rounds reached, player(s) with most units win (can be multiple winners if tied)
 *
 * @param playerUnits Map of player ID to unit count
 * @param currentRound Current round number
 * @param maxRounds Maximum rounds before timeout
 * @returns Winning player ID (string), array of player IDs (timeout tie), null for draw (annihilation), or undefined if game continues
 */
export function checkEndConditions(
  playerUnits: Map<string, number>,
  currentRound: number,
  maxRounds: number
): string | string[] | null | undefined {
  const totalUnits = Array.from(playerUnits.values()).reduce((a, b) => a + b, 0);

  // Annihilation: All players eliminated - draw
  if (totalUnits === 0) {
    return null; // null = draw (annihilation)
  }

  // Check for domination (>50% of all units)
  for (const [playerId, units] of playerUnits.entries()) {
    if (units > totalUnits / 2) {
      return playerId; // Winner by domination
    }
  }

  // Check for timeout
  if (currentRound >= maxRounds) {
    // Winner is player(s) with most units (can be multiple if tied)
    const sorted = Array.from(playerUnits.entries()).sort((a, b) => b[1] - a[1]);
    const maxUnits = sorted[0][1];

    // Find all players with max units
    const winners = sorted
      .filter(([_, units]) => units === maxUnits)
      .map(([playerId, _]) => playerId);

    // Return single winner or array if multiple
    return winners.length === 1 ? winners[0] : winners;
  }

  return undefined; // Game continues
}
