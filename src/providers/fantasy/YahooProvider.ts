// src/providers/fantasy/YahooProvider.ts
import { FantasyProvider } from '../interfaces';
import { FantasyLeague, FantasyMatchup } from '@/types';
import { getFantasyScoring } from '@/services/FantasyScoring';

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
  private scoringService = getFantasyScoring();

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
      
      // Load scoring settings when getting league info
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }
      
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
      // Ensure scoring settings are loaded
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }

      const data = await this.fetchYahoo('player-stats', { 
        playerKey, 
        week: week.toString() 
      });
      
      // Parse the player stats response based on Yahoo API structure
      const playerArray = data.fantasy_content?.player;
      if (!playerArray || playerArray.length === 0) {
        console.warn(`No player data found for ${playerKey}`);
        return 0;
      }

      // Find player_stats in the array
      let statsData = null;
      for (const item of playerArray) {
        if (item?.player_stats) {
          statsData = item.player_stats;
          break;
        }
      }

      if (!statsData) {
        console.warn(`No stats found for player ${playerKey} in week ${week}`);
        return 0;
      }

      // Parse stats using the scoring service
      const statMap = this.scoringService.parseYahooStats(statsData);
      
      if (Object.keys(statMap).length === 0) {
        console.warn(`No stat values found for player ${playerKey}`);
        return 0;
      }

      // Calculate points using league-specific scoring
      const points = this.scoringService.calculatePoints(statMap);
      
      return points;
    } catch (error) {
      console.error(`Failed to fetch stats for player ${playerKey}:`, error);
      throw error;
    }
  }

  async getPlayerStatsWithDetails(playerKey: string, week: number): Promise<{ points: number; stats: string }> {
    try {
      // Ensure scoring settings are loaded
      if (!this.scoringService.isLoaded()) {
        await this.scoringService.loadLeagueSettings(this.leagueId);
      }

      const data = await this.fetchYahoo('player-week', { 
        playerKey, 
        week: week.toString() 
      });
      
      // Parse the player stats response based on Yahoo API structure
      const playerArray = data.fantasy_content?.player;
      if (!playerArray || playerArray.length === 0) {
        console.warn(`No player data found for ${playerKey}`);
        return { points: 0, stats: '—' };
      }

      // Find player_stats in the array
      let statsData = null;
      for (const item of playerArray) {
        if (item?.player_stats) {
          statsData = item.player_stats;
          break;
        }
      }

      if (!statsData) {
        console.warn(`No stats found for player ${playerKey} in week ${week}`);
        return { points: 0, stats: '—' };
      }

      // Parse stats using the scoring service
      const statMap = this.scoringService.parseYahooStats(statsData);
      
      if (Object.keys(statMap).length === 0) {
        console.warn(`No stat values found for player ${playerKey}`);
        return { points: 0, stats: '—' };
      }

      // Calculate points using league-specific scoring
      const points = this.scoringService.calculatePoints(statMap);
      
      // Format stats for display (similar to Yahoo's format)
      const statsString = this.formatStatsForDisplay(statMap);
      
      // Only log non-zero stats to reduce console spam
      const nonZeroStats = Object.entries(statMap).filter(([_, value]) => value > 0);
      if (nonZeroStats.length > 0) {
        // Stats processed successfully
      }
      
      return { points, stats: statsString };
    } catch (error) {
      console.error(`Failed to fetch stats for player ${playerKey}:`, error);
      return { points: 0, stats: '—' };
    }
  }

  private formatStatsForDisplay(statMap: Record<number, number>): string {
    const stats: string[] = [];
    
    // Yahoo Fantasy stat ID mappings to display labels
    const statLabels: Record<number, string> = {
      // Passing
      0: 'GP',
      1: 'Pass Att',
      2: 'Pass Comp',
      3: 'Pass Inc',
      4: 'Pass Yds',
      5: 'Pass TD',
      6: 'Int',
      7: 'Int',
      // Rushing
      8: 'Rush Att',
      9: 'Rush Yds',
      10: 'Rush TD',
      // Receiving
      11: 'Rec',
      12: 'Rec Yds',
      13: 'Rec TD',
      14: 'Rec Tgt',
      // Misc Offense
      15: 'Return TD',
      16: '2-PT',
      17: '2-PT',
      18: 'Fum Lost',
      // Kicking
      29: 'FG 0-19',
      30: 'FG 20-29',
      31: 'FG 30-39',
      32: 'FG 40-49',
      33: 'FG 50+',
      34: 'FG Miss',
      35: 'PAT',
      36: 'PAT Miss',
      // Defense/Special Teams
      19: 'Def TD',
      20: 'Sack',
      21: 'Int',
      22: 'Fum Rec',
      23: 'Safety',
      24: 'Block',
      // Points Allowed (for DST)
      45: 'PA 0',
      46: 'PA 1-6',
      47: 'PA 7-13',
      48: 'PA 14-20',
      49: 'PA 21-27',
      50: 'PA 28-34',
      51: 'PA 35+',
      // First Downs & Misc Stats (most are hidden)
      52: 'PA 0',
      53: 'PA 1-6',
      54: 'PA 7-13',
      55: 'PA 14-17',
      56: 'PA 28-34',
      58: 'Pass 1st',
      59: 'Pass 1st',
      60: 'Pass 1st',
      61: 'Pass 1st',
      62: 'Rush 1st',
      63: 'Rec 1st',
      64: 'Rec 1st',
      67: 'Kck Ret 1st',
      68: 'Tackles',
      69: 'Ret Yds',
      73: 'PA 0',
      74: 'PA 1-6',
      75: 'PA 7-13',
      77: 'Tackles',
      78: 'Rec Tgt',
      79: 'Pass Inc',
      80: 'Rec 1st',
      81: 'Rush 1st',
      84: 'Ret Yds',
      85: 'Tackles',
      86: 'Tackles',
      27: 'Block',
      28: 'Block',
      37: 'PAT',
    };

    // Priority order for display (most important fantasy-scoring stats first)
    const displayOrder = [4, 5, 6, 11, 12, 13, 9, 10, 16, 18, 29, 30, 31, 32, 33, 35, 19, 20, 21, 22, 23, 45, 46, 47, 48, 49, 50, 51];
    
    // Stats to completely hide (non-scoring, verbose tracking stats)
    const hideStats = [0, 1, 2, 3, 7, 8, 14, 27, 28, 37, 52, 53, 54, 55, 56, 58, 59, 60, 61, 62, 63, 64, 67, 68, 69, 73, 74, 75, 77, 78, 79, 80, 81, 84, 85, 86];
    
    // First add stats in priority order
    for (const statId of displayOrder) {
      const value = statMap[statId];
      if (value && value > 0 && statLabels[statId]) {
        stats.push(`${value} ${statLabels[statId]}`);
      }
    }
    
    // Then add any remaining stats not in priority order (if they're not hidden)
    for (const [statIdStr, value] of Object.entries(statMap)) {
      const statId = parseInt(statIdStr);
      if (value > 0 && !displayOrder.includes(statId) && !hideStats.includes(statId)) {
        if (statLabels[statId]) {
          stats.push(`${value} ${statLabels[statId]}`);
        } else {
          // Unknown stat ID - show with ID for debugging
          stats.push(`${value} [stat${statId}]`);
        }
      }
    }

    return stats.length > 0 ? stats.join(', ') : '—';
  }
}