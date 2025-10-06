// NFL Tiebreaking Procedures Implementation
// Based on https://www.nfl.com/standings/tie-breaking-procedures

import { Team, TeamRecord } from '@/types/teams';

/**
 * Calculate division record percentage
 */
function getDivisionRecordPercentage(record: TeamRecord): number {
  if (!record.divisionWins && !record.divisionLosses && !record.divisionTies) {
    return 0;
  }
  
  const totalGames = (record.divisionWins || 0) + (record.divisionLosses || 0) + (record.divisionTies || 0);
  if (totalGames === 0) return 0;
  
  return ((record.divisionWins || 0) + (record.divisionTies || 0) * 0.5) / totalGames;
}

/**
 * NFL Division Tiebreaking Procedures
 * For teams within the same division
 */
export function compareTeamsInDivision(teamA: Team, teamB: Team): number {
  const recordA = teamA.record;
  const recordB = teamB.record;
  
  // Teams without records go to the end
  if (!recordA && !recordB) return 0;
  if (!recordA) return 1;
  if (!recordB) return -1;
  
  // PRESEASON HANDLING: If both teams are 0-0, sort alphabetically
  const isPreseasonA = recordA.wins === 0 && recordA.losses === 0 && recordA.ties === 0;
  const isPreseasonB = recordB.wins === 0 && recordB.losses === 0 && recordB.ties === 0;
  
  if (isPreseasonA && isPreseasonB) {
    return teamA.displayName.localeCompare(teamB.displayName);
  }
  
  // PRIMARY SORTING: Overall win percentage (this is the main criteria)
  if (Math.abs(recordA.winPercentage - recordB.winPercentage) > 0.001) {
    return recordB.winPercentage - recordA.winPercentage; // Higher win percentage wins
  }
  
  // TIEBREAKING PROCEDURES (only apply when overall records are identical)
  
  // Step 1: Head-to-head (best won-lost-tied percentage in games between the clubs)
  // Note: We don't have head-to-head data from ESPN API, so we skip this step
  
  // Step 2: Best won-lost-tied percentage in games played within the division
  const divisionRecordA = getDivisionRecordPercentage(recordA);
  const divisionRecordB = getDivisionRecordPercentage(recordB);
  
  if (Math.abs(divisionRecordA - divisionRecordB) > 0.001) {
    return divisionRecordB - divisionRecordA; // Higher percentage wins
  }
  
  // Step 3: Best won-lost-tied percentage in common games
  // Note: We don't have common games data, so we skip this step
  
  // Step 4: Best won-lost-tied percentage in games played within the conference
  // Note: We don't have conference record data, so we skip this step
  
  // Step 5: Strength of victory in all games
  // Note: We don't have strength of victory data, so we skip this step
  
  // Step 6: Strength of schedule in all games
  // Note: We don't have strength of schedule data, so we skip this step
  
  // Step 7: Best combined ranking among conference teams in points scored and points allowed
  // Note: We don't have conference rankings, so we skip this step
  
  // Step 8: Best combined ranking among all teams in points scored and points allowed
  // Note: We don't have league rankings, so we skip this step
  
  // Step 9: Best net points in common games
  // Note: We don't have common games data, so we skip this step
  
  // Step 10: Best net points in all games
  const pointDiffA = recordA.pointDifferential || 0;
  const pointDiffB = recordB.pointDifferential || 0;
  
  if (pointDiffA !== pointDiffB) {
    return pointDiffB - pointDiffA; // Higher point differential wins
  }
  
  // Step 11: Best net touchdowns in all games
  // Note: We don't have touchdown data, so we skip this step
  
  // Step 12: Coin toss (fallback to alphabetical)
  return teamA.displayName.localeCompare(teamB.displayName);
}

/**
 * NFL Wild Card Tiebreaking Procedures
 * For teams from different divisions
 */
export function compareTeamsWildCard(teamA: Team, teamB: Team): number {
  const recordA = teamA.record;
  const recordB = teamB.record;
  
  // Teams without records go to the end
  if (!recordA && !recordB) return 0;
  if (!recordA) return 1;
  if (!recordB) return -1;
  
  // PRESEASON HANDLING: If both teams are 0-0, sort alphabetically
  const isPreseasonA = recordA.wins === 0 && recordA.losses === 0 && recordA.ties === 0;
  const isPreseasonB = recordB.wins === 0 && recordB.losses === 0 && recordB.ties === 0;
  
  if (isPreseasonA && isPreseasonB) {
    return teamA.displayName.localeCompare(teamB.displayName);
  }
  
  // PRIMARY SORTING: Overall win percentage (this is the main criteria)
  if (Math.abs(recordA.winPercentage - recordB.winPercentage) > 0.001) {
    return recordB.winPercentage - recordA.winPercentage; // Higher win percentage wins
  }
  
  // TIEBREAKING PROCEDURES (only apply when overall records are identical)
  
  // Step 1: Head-to-head, if applicable
  // Note: We don't have head-to-head data, so we skip this step
  
  // Step 2: Best won-lost-tied percentage in games played within the conference
  // Note: We don't have conference record data, so we skip this step
  
  // Step 3: Best won-lost-tied percentage in common games, minimum of four
  // Note: We don't have common games data, so we skip this step
  
  // Step 4: Strength of victory in all games
  // Note: We don't have strength of victory data, so we skip this step
  
  // Step 5: Strength of schedule in all games
  // Note: We don't have strength of schedule data, so we skip this step
  
  // Step 6: Best combined ranking among conference teams in points scored and points allowed
  // Note: We don't have conference rankings, so we skip this step
  
  // Step 7: Best combined ranking among all teams in points scored and points allowed
  // Note: We don't have league rankings, so we skip this step
  
  // Step 8: Best net points in conference games
  // Note: We don't have conference games data, so we skip this step
  
  // Step 9: Best net points in all games
  const pointDiffA = recordA.pointDifferential || 0;
  const pointDiffB = recordB.pointDifferential || 0;
  
  if (pointDiffA !== pointDiffB) {
    return pointDiffB - pointDiffA; // Higher point differential wins
  }
  
  // Step 10: Best net touchdowns in all games
  // Note: We don't have touchdown data, so we skip this step
  
  // Step 11: Coin toss (fallback to alphabetical)
  return teamA.displayName.localeCompare(teamB.displayName);
}

/**
 * Sort teams within a division using NFL tiebreaking procedures
 */
export function sortTeamsInDivision(teams: Team[]): Team[] {
  return teams.sort(compareTeamsInDivision);
}

/**
 * Sort teams across divisions using NFL Wild Card tiebreaking procedures
 */
export function sortTeamsWildCard(teams: Team[]): Team[] {
  return teams.sort(compareTeamsWildCard);
}
