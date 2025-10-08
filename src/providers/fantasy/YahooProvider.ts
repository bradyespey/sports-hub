// src/providers/fantasy/YahooProvider.ts
import { FantasyProvider } from '../interfaces';
import { FantasyLeague, FantasyMatchup } from '@/types';

interface YahooTeam {
  team_key: string;
  name: string;
  team_logos: Array<{ url: string }>;
  managers: Array<{ nickname: string }>;
}

interface YahooMatchup {
  matchup: {
    teams: {
      team: YahooTeam[];
    };
  };
}

export class YahooProvider implements FantasyProvider {
  private baseUrl = '/.netlify/functions/yahoo-fantasy';
  private leagueId = import.meta.env.VITE_YAHOO_LEAGUE_ID || '590446';
  private teamName = import.meta.env.VITE_YAHOO_TEAM_NAME || 'Espeys in the Endzone';
  private cachedTeamId: string | null = null;

  private async fetchYahoo(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(this.baseUrl, window.location.origin);
    url.searchParams.set('endpoint', endpoint);
    url.searchParams.set('leagueId', this.leagueId);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Yahoo Fantasy data');
    }
    
    return response.json();
  }

  async getLeagueInfo(): Promise<FantasyLeague> {
    try {
      const data = await this.fetchYahoo('league');
      const league = data.fantasy_content?.league?.[0];
      
      return {
        name: league?.name || 'Double Coverage League',
        season: parseInt(league?.season || '2024'),
      };
    } catch (error) {
      console.error('Failed to fetch league info:', error);
      // Return default values if API fails
      return {
        name: 'Double Coverage League',
        season: 2024,
      };
    }
  }

  private async getMyTeamId(): Promise<string> {
    if (this.cachedTeamId) {
      return this.cachedTeamId;
    }

    const data = await this.fetchYahoo('teams');
    const teams = data.fantasy_content?.league?.[1]?.teams;
    
    if (!teams) {
      throw new Error('No teams found in league');
    }

    // Find team by name
    for (let i = 0; i < teams.count; i++) {
      const teamData = teams[i]?.team?.[0];
      if (teamData && teamData[2]?.name === this.teamName) {
        this.cachedTeamId = teamData[0]?.team_key;
        return teamData[0]?.team_key;
      }
    }

    throw new Error(`Team "${this.teamName}" not found in league`);
  }

  async getUserTeams(): Promise<{ brady: string; jenny: string }> {
    const teamId = await this.getMyTeamId();
    // Since Brady and Jenny share the same team
    return {
      brady: teamId,
      jenny: teamId,
    };
  }

  async getWeekMatchups({ season, week }: { season: number; week: number }): Promise<FantasyMatchup[]> {
    try {
      const data = await this.fetchYahoo('scoreboard', { week: week.toString() });
      const scoreboard = data.fantasy_content?.league?.[1]?.scoreboard;
      
      if (!scoreboard || !scoreboard['0']?.matchups) {
        return [];
      }

      const matchups: FantasyMatchup[] = [];
      const matchupData = scoreboard['0'].matchups;

      for (let i = 0; i < matchupData.count; i++) {
        const matchup = matchupData[i]?.matchup;
        if (!matchup) continue;

        const teams = matchup['0']?.teams;
        if (!teams || teams.count < 2) continue;

        const team1 = teams['0']?.team;
        const team2 = teams['1']?.team;

        if (!team1 || !team2) continue;

        // Get team data
        const team1Key = team1[0]?.team_key;
        const team2Key = team2[0]?.team_key;
        const team1Points = parseFloat(team1[1]?.team_points?.total || '0');
        const team2Points = parseFloat(team2[1]?.team_points?.total || '0');

        // Determine status
        const matchupStatus = matchup.status;
        let status: 'not_started' | 'in_progress' | 'final' = 'not_started';
        if (matchupStatus === 'postevent') {
          status = 'final';
        } else if (matchupStatus === 'midevent') {
          status = 'in_progress';
        }

        // Add both sides of the matchup
        matchups.push({
          teamId: team1Key,
          opponentTeamId: team2Key,
          pointsFor: team1Points,
          pointsAgainst: team2Points,
          status,
        });

        matchups.push({
          teamId: team2Key,
          opponentTeamId: team1Key,
          pointsFor: team2Points,
          pointsAgainst: team1Points,
          status,
        });
      }

      return matchups;
    } catch (error) {
      console.error('Failed to fetch matchups:', error);
      return [];
    }
  }

  async getPlayerStats(playerKey: string, week: number): Promise<number> {
    try {
      const data = await this.fetchYahoo('player-stats', { 
        playerKey, 
        week: week.toString() 
      });
      
      // Parse the player stats response based on Yahoo API structure
      const player = data.fantasy_content?.player?.[0];
      if (!player) return 0;

      // Stats are at index [1] of the player array
      const statsObj = player[1]?.player_stats;

      if (!statsObj || !statsObj.stats) return 0;

      const stats = statsObj.stats;
      
      // Build a map of stat_id to value for easy lookup
      const statMap: Record<string, number> = {};
      for (const statItem of stats) {
        if (statItem && statItem.stat) {
          const stat = statItem.stat;
          if (stat.stat_id && (stat.value !== undefined && stat.value !== null)) {
            statMap[stat.stat_id] = parseFloat(stat.value) || 0;
          }
        }
      }

      // Calculate fantasy points using standard scoring rules
      // Common Yahoo stat IDs (may vary by league):
      // 4: Passing Yards, 5: Passing TDs, 6: Interceptions
      // 9: Rushing Yards, 10: Rushing TDs
      // 11: Receptions, 12: Receiving Yards, 13: Receiving TDs
      // 15: Return TDs, 16: 2-Point Conversions
      // 18: Fumbles Lost, 57: Offensive Fumble Return TD
      // 29: Field Goals 0-19, 30: Field Goals 20-29, 31: Field Goals 30-39
      // 32: Field Goals 40-49, 33: Field Goals 50+, 35: PAT Made
      
      let points = 0;
      
      // Passing stats
      points += (statMap['4'] || 0) * 0.04;  // Passing yards (1 point per 25 yards)
      points += (statMap['5'] || 0) * 4;     // Passing TDs
      points -= (statMap['6'] || 0) * 1;     // Interceptions
      
      // Rushing stats
      points += (statMap['9'] || 0) * 0.1;   // Rushing yards (1 point per 10 yards)
      points += (statMap['10'] || 0) * 6;    // Rushing TDs
      
      // Receiving stats
      points += (statMap['11'] || 0) * 1;    // Receptions (PPR)
      points += (statMap['12'] || 0) * 0.1;  // Receiving yards (1 point per 10 yards)
      points += (statMap['13'] || 0) * 6;    // Receiving TDs
      
      // Kicking stats (10 yards per point for field goals)
      // Estimate field goal yards based on range
      points += (statMap['29'] || 0) * 1.5;  // FG 0-19 yards (~15 yards = 1.5 pts)
      points += (statMap['30'] || 0) * 2.5;  // FG 20-29 yards (~25 yards = 2.5 pts)
      points += (statMap['31'] || 0) * 3.5;  // FG 30-39 yards (~35 yards = 3.5 pts)
      points += (statMap['32'] || 0) * 4.5;  // FG 40-49 yards (~45 yards = 4.5 pts)
      points += (statMap['33'] || 0) * 5.5;  // FG 50+ yards (~55 yards = 5.5 pts)
      points += (statMap['35'] || 0) * 1;    // PAT Made
      
      // Other scoring
      points += (statMap['15'] || 0) * 6;    // Return TDs
      points += (statMap['16'] || 0) * 2;    // 2-Point Conversions
      points -= (statMap['18'] || 0) * 2;    // Fumbles Lost
      points += (statMap['57'] || 0) * 6;    // Offensive Fumble Return TD

      return Math.round(points * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
      // Throw the error instead of returning 0 so the Fantasy component can handle it
      throw error;
    }
  }
}